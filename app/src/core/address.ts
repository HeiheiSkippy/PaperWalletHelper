import { addr } from 'micro-eth-signer';

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Returns the checksummed form, or null. All-lower and all-upper input is
// accepted as is; mixed case must already carry a valid checksum.
export function normalizeAddress(input: string): string | null {
  const text = input.trim();
  if (!HEX_ADDRESS.test(text)) {
    return null;
  }
  const body = text.slice(2);
  const checksummed = addr.addChecksum(text.toLowerCase());
  const mixed = body !== body.toLowerCase() && body !== body.toUpperCase();
  if (mixed && text !== checksummed) {
    return null;
  }
  return checksummed;
}

export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export type QrAddress =
  | { ok: true; address: string }
  | { ok: false; reason: 'private-key' | 'not-address' };

// Reads a public-address QR: a bare address or an "ethereum:" URI. A QR that
// looks like a private key is refused without being decoded.
export function readAddressQr(text: string): QrAddress {
  const trimmed = text.trim();
  if (/^(?:0x)?[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { ok: false, reason: 'private-key' };
  }
  const body = trimmed.replace(/^ethereum:/i, '').replace(/^pay-/i, '');
  const candidate = body.split(/[@/?]/)[0];
  const address = normalizeAddress(candidate);
  return address ? { ok: true, address } : { ok: false, reason: 'not-address' };
}
