import { secp256k1 } from '@noble/curves/secp256k1.js';
import { Address, NETWORK, OutScript, WIF, p2pkh, p2wpkh } from '@scure/btc-signer';

// BMB uses the same address and WIF constants as Bitcoin mainnet.

export type BtcKeyErrorCode = 'address-qr' | 'uncompressed' | 'format' | 'range';

export class BtcKeyError extends Error {
  constructor(readonly code: BtcKeyErrorCode, message: string) {
    super(message);
    this.name = 'BtcKeyError';
  }
}

export type OwnType = 'pkh' | 'wpkh';

export type OwnAddress = { type: OwnType; address: string; script: Uint8Array };

export type PublicAddress = OwnAddress;

export type AddressErrorCode = 'unsupported' | 'format';

export class AddressError extends Error {
  constructor(readonly code: AddressErrorCode, message: string) {
    super(message);
    this.name = 'AddressError';
  }
}

export function wipe(bytes: Uint8Array): void {
  bytes.fill(0);
}

export function readWifQr(text: string): Uint8Array {
  const wif = text.trim();
  if (isAddress(wif)) {
    throw new BtcKeyError('address-qr', 'this QR holds a public address');
  }
  if (wif.length === 51 && wif[0] === '5') {
    throw new BtcKeyError('uncompressed', 'uncompressed WIF is not supported');
  }
  let key: Uint8Array;
  try {
    key = WIF(NETWORK).decode(wif);
  } catch {
    throw new BtcKeyError('format', 'not a WIF private key');
  }
  if (!secp256k1.utils.isValidSecretKey(key)) {
    wipe(key);
    throw new BtcKeyError('range', 'private key out of range');
  }
  return key;
}

export function addressesOfKey(key: Uint8Array): OwnAddress[] {
  const pub = secp256k1.getPublicKey(key, true);
  const pkh = p2pkh(pub, NETWORK);
  const wpkh = p2wpkh(pub, NETWORK);
  return [
    { type: 'pkh', address: pkh.address!, script: pkh.script },
    { type: 'wpkh', address: wpkh.address!, script: wpkh.script },
  ];
}

export function readAddressQr(text: string): PublicAddress {
  const address = text.trim();
  let decoded: ReturnType<ReturnType<typeof Address>['decode']>;
  try {
    decoded = Address(NETWORK).decode(address);
  } catch {
    throw new AddressError('format', 'not a BTC/BMB address');
  }
  if (decoded.type !== 'pkh' && decoded.type !== 'wpkh') {
    throw new AddressError('unsupported', `${decoded.type} addresses are not supported`);
  }
  return {
    type: decoded.type,
    address: Address(NETWORK).encode(decoded),
    script: OutScript.encode(decoded),
  };
}

export function addressOfScript(script: Uint8Array): string | null {
  try {
    return Address(NETWORK).encode(OutScript.decode(script));
  } catch {
    return null;
  }
}

function isAddress(text: string): boolean {
  try {
    Address(NETWORK).decode(text);
    return true;
  } catch {
    return false;
  }
}
