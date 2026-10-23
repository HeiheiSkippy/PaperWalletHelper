import { Transaction } from 'micro-eth-signer';
import { addressOfKey, wipe } from '../key';
import { EvmError, EvmView, readSend } from './send';

export type EvmSignature = { r: bigint; s: bigint; yParity: number };

export type EvmSigned = { view: EvmView; from: string; signature: EvmSignature };

// Returns only the signature values and wipes the key.
export function signSend(unsigned: Uint8Array, key: Uint8Array): EvmSigned {
  try {
    const view = readSend(unsigned);
    const from = addressOfKey(key);
    // Deterministic nonces: no dependence on the platform random source.
    const signed = Transaction.fromBytes(unsigned).signBy(key, false);
    const { r, s, yParity } = signed.raw as { r?: bigint; s?: bigint; yParity?: number };
    if (r === undefined || s === undefined || yParity === undefined || signed.sender !== from) {
      throw new EvmError('signature', 'signing did not produce a valid signature');
    }
    return { view, from, signature: { r, s, yParity } };
  } finally {
    wipe(key);
  }
}
