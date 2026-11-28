import { keccak_256 } from '@noble/hashes/sha3.js';
import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import { Buffer } from 'buffer';
import { normalizeAddress } from './address';
import { CborError, CborValue, decodeCbor, encodeCbor } from './cbor';
import { EvmSignature } from './evm/sign';

// BTC and BMB travel as the standard crypto-psbt UR. EVM data travels as a
// bytes UR holding this app's own small record: a magic, a kind byte, then
// the body.
const PSBT_TYPE = 'crypto-psbt';
const BYTES_TYPE = 'bytes';
// EIP-4527, as sent by wallets that pair with a QR hardware signer.
const SIGN_REQUEST_TYPE = 'eth-sign-request';
const SIGNATURE_TYPE = 'eth-signature';
const DATA_TYPE_LEGACY_TX = 1n;
const UUID_TAG = 37;
const MAGIC = [0x42, 0x50, 0x57, 0x01]; // "BPW" v1
const KIND_EVM_TX = 0x01;
const KIND_EVM_SIG = 0x02;

// A 34KB PSBT at 600 bytes every 200ms reads in about 12s on a Galaxy Note8.
const PSBT_PART_LENGTH = 600;
export const QR_FRAME_MS = 200;
const BYTES_PART_LENGTH = 200;

export type QrPayload =
  | { kind: 'psbt'; psbt: Uint8Array }
  // request is set when the transaction came as an eth-sign-request; the
  // answer then goes back as an eth-signature.
  | { kind: 'evm-tx'; from: string; unsigned: Uint8Array; request?: { id: Uint8Array | null } }
  | { kind: 'evm-sig'; txHash: Uint8Array; signature: EvmSignature }
  | { kind: 'eth-sig'; requestId: Uint8Array | null; chainId: bigint; signature: EvmSignature };

export type QrErrorCode = 'not-ur' | 'wrong-type' | 'broken' | 'not-this-app';

export class QrError extends Error {
  constructor(readonly code: QrErrorCode, message: string) {
    super(message);
    this.name = 'QrError';
  }
}

function toBig(bytes: Uint8Array): bigint {
  return BigInt('0x' + Buffer.from(bytes).toString('hex'));
}

function toBytes32(value: bigint): Uint8Array {
  const hex = value.toString(16);
  if (hex.length > 64) {
    throw new QrError('broken', 'value does not fit 32 bytes');
  }
  return Uint8Array.from(Buffer.from(hex.padStart(64, '0'), 'hex'));
}

export function evmTxHash(unsigned: Uint8Array): Uint8Array {
  return keccak_256(unsigned);
}

// v carries the EIP-155 value (chainId * 2 + 35 + yParity), as a legacy
// transaction stores it.
function encodeEthSignature(payload: Extract<QrPayload, { kind: 'eth-sig' }>): Uint8Array {
  const { r, s, yParity } = payload.signature;
  if (yParity !== 0 && yParity !== 1) {
    throw new QrError('broken', 'bad signature record');
  }
  let vHex = (payload.chainId * 2n + 35n + BigInt(yParity)).toString(16);
  if (vHex.length % 2) {
    vHex = '0' + vHex;
  }
  const signature = Uint8Array.from([...toBytes32(r), ...toBytes32(s), ...Buffer.from(vHex, 'hex')]);
  const map = new Map<CborValue, CborValue>();
  if (payload.requestId) {
    map.set(1n, { tag: UUID_TAG, value: payload.requestId });
  }
  map.set(2n, signature);
  return encodeCbor(map);
}

function decodeSignRequest(cbor: Uint8Array): QrPayload {
  let value: CborValue;
  try {
    value = decodeCbor(cbor);
  } catch (e) {
    if (e instanceof CborError) {
      throw new QrError('broken', e.message);
    }
    throw e;
  }
  if (!(value instanceof Map)) {
    throw new QrError('not-this-app', 'sign request is not a map');
  }
  const signData = value.get(2n);
  const dataType = value.get(3n) ?? DATA_TYPE_LEGACY_TX;
  const address = value.get(6n);
  if (!(signData instanceof Uint8Array) || signData.length === 0) {
    throw new QrError('not-this-app', 'sign request has no transaction');
  }
  if (dataType !== DATA_TYPE_LEGACY_TX) {
    throw new QrError('not-this-app', `sign request data type ${String(dataType)} is not a legacy transaction`);
  }
  const from =
    address instanceof Uint8Array && address.length === 20
      ? normalizeAddress('0x' + Buffer.from(address).toString('hex'))
      : null;
  if (!from) {
    throw new QrError('not-this-app', 'sign request has no address');
  }
  let id: Uint8Array | null = null;
  const tagged = value.get(1n);
  if (tagged !== undefined) {
    const raw = tagged !== null && typeof tagged === 'object' && 'tag' in tagged ? tagged.value : tagged;
    if (!(raw instanceof Uint8Array) || raw.length > 64) {
      throw new QrError('not-this-app', 'bad request id');
    }
    id = raw;
  }
  return { kind: 'evm-tx', from, unsigned: signData, request: { id } };
}

function encodeRecord(payload: QrPayload): Uint8Array {
  switch (payload.kind) {
    case 'eth-sig':
      return encodeEthSignature(payload);
    case 'psbt':
      return payload.psbt;
    case 'evm-tx':
      return Uint8Array.from([
        ...MAGIC,
        KIND_EVM_TX,
        ...Buffer.from(payload.from.slice(2), 'hex'),
        ...payload.unsigned,
      ]);
    case 'evm-sig': {
      const { r, s, yParity } = payload.signature;
      if (payload.txHash.length !== 32 || (yParity !== 0 && yParity !== 1)) {
        throw new QrError('broken', 'bad signature record');
      }
      return Uint8Array.from([
        ...MAGIC,
        KIND_EVM_SIG,
        ...payload.txHash,
        ...toBytes32(r),
        ...toBytes32(s),
        yParity,
      ]);
    }
  }
}

function decodeRecord(type: string, bytes: Uint8Array): QrPayload {
  if (type === PSBT_TYPE) {
    return { kind: 'psbt', psbt: bytes };
  }
  if (bytes.length < MAGIC.length + 1 || MAGIC.some((b, i) => bytes[i] !== b)) {
    throw new QrError('not-this-app', 'bytes QR is not from this app');
  }
  const kind = bytes[MAGIC.length];
  const body = bytes.slice(MAGIC.length + 1);
  if (kind === KIND_EVM_TX && body.length > 20) {
    const from = normalizeAddress('0x' + Buffer.from(body.slice(0, 20)).toString('hex'));
    if (from) {
      return { kind: 'evm-tx', from, unsigned: body.slice(20) };
    }
  }
  if (kind === KIND_EVM_SIG && body.length === 32 + 32 + 32 + 1 && body[96] <= 1) {
    return {
      kind: 'evm-sig',
      txHash: body.slice(0, 32),
      signature: { r: toBig(body.slice(32, 64)), s: toBig(body.slice(64, 96)), yParity: body[96] },
    };
  }
  throw new QrError('not-this-app', `unknown record kind ${kind}`);
}

// Upper case lets the QR use alphanumeric mode. Mixed fountain parts follow the
// pieces so a missed frame does not cost a whole loop.
export function qrParts(payload: QrPayload): string[] {
  const record = Buffer.from(encodeRecord(payload));
  const ur =
    payload.kind === 'eth-sig'
      ? new UR(record, SIGNATURE_TYPE)
      : payload.kind === 'psbt'
        ? new UR(UR.fromBuffer(record).cbor, PSBT_TYPE)
        : UR.fromBuffer(record);
  const length = payload.kind === 'psbt' ? PSBT_PART_LENGTH : BYTES_PART_LENGTH;
  const encoder = new UREncoder(ur, length);
  const count = encoder.fragmentsLength === 1 ? 1 : encoder.fragmentsLength * 2;
  return Array.from({ length: count }, () => encoder.nextPart().toUpperCase());
}

export function qrPieceCount(parts: string[]): number {
  const match = /^UR:[^/]+\/\d+-(\d+)\//i.exec(parts[0] ?? '');
  return match ? Number(match[1]) : 1;
}

export type Collecting = { done: false; got: number; total: number | null };

export type Collected = { done: true; payload: QrPayload };

export class QrCollector {
  private decoder = new URDecoder();
  private seen = new Set<string>();
  private type: string | null = null;

  receive(text: string): Collecting | Collected {
    const part = text.trim().toLowerCase();
    if (!part.startsWith('ur:')) {
      throw new QrError('not-ur', 'not a BC-UR string');
    }
    const type = part.slice(3).split('/')[0];
    if (type !== PSBT_TYPE && type !== BYTES_TYPE && type !== SIGN_REQUEST_TYPE) {
      throw new QrError('wrong-type', `${type} is not used by this app`);
    }
    if (this.type !== null && type !== this.type) {
      throw new QrError('wrong-type', 'parts of different QR codes were mixed');
    }
    this.type = type;

    if (!this.seen.has(part)) {
      this.seen.add(part);
      if (!this.decoder.receivePart(part)) {
        throw new QrError('broken', 'part did not decode');
      }
    }
    if (!this.decoder.isComplete()) {
      // Mixed parts can outnumber the pieces.
      const total = this.decoder.expectedPartCount();
      return {
        done: false,
        got: Math.round(this.decoder.getProgress() * total),
        total: total || null,
      };
    }
    if (!this.decoder.isSuccess()) {
      throw new QrError('broken', this.decoder.resultError());
    }
    const ur = this.decoder.resultUR();
    if (ur.type === SIGN_REQUEST_TYPE) {
      return { done: true, payload: decodeSignRequest(Uint8Array.from(ur.cbor)) };
    }
    return { done: true, payload: decodeRecord(ur.type, Uint8Array.from(ur.decodeCBOR())) };
  }

  reset(): void {
    this.decoder = new URDecoder();
    this.seen.clear();
    this.type = null;
  }
}
