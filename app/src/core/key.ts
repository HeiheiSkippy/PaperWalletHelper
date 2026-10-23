import { addr } from 'micro-eth-signer';

export type KeyErrorCode = 'address-qr' | 'format' | 'range';

export class KeyError extends Error {
  constructor(readonly code: KeyErrorCode, message: string) {
    super(message);
    this.name = 'KeyError';
  }
}

export function wipe(bytes: Uint8Array): void {
  bytes.fill(0);
}

function nibble(code: number): number {
  if (code >= 48 && code <= 57) {
    return code - 48;
  }
  if (code >= 97 && code <= 102) {
    return code - 87;
  }
  if (code >= 65 && code <= 70) {
    return code - 55;
  }
  return -1;
}

// Accepts 0x + 64 hex or 64 hex. Decodes straight into bytes so the key never
// becomes a second string.
export function readPrivateKeyQr(text: string): Uint8Array {
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) <= 32) {
    start++;
  }
  while (end > start && text.charCodeAt(end - 1) <= 32) {
    end--;
  }
  if (
    end - start >= 2 &&
    text.charCodeAt(start) === 48 &&
    (text[start + 1] === 'x' || text[start + 1] === 'X')
  ) {
    start += 2;
  }

  const length = end - start;
  if (length === 40) {
    throw new KeyError('address-qr', 'this QR holds a public address');
  }
  if (length !== 64) {
    throw new KeyError('format', 'not a private key');
  }

  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const hi = nibble(text.charCodeAt(start + i * 2));
    const lo = nibble(text.charCodeAt(start + i * 2 + 1));
    if (hi < 0 || lo < 0) {
      wipe(key);
      throw new KeyError('format', 'not a private key');
    }
    key[i] = hi * 16 + lo;
  }
  if (!addr.isValidPrivateKey(key)) {
    wipe(key);
    throw new KeyError('range', 'private key out of range');
  }
  return key;
}

export function addressOfKey(key: Uint8Array): string {
  return addr.fromPrivateKey(key);
}
