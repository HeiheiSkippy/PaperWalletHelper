import { Buffer } from 'buffer';

// Just enough CBOR for the eth-sign-request and eth-signature URs (EIP-4527).
// Definite lengths only; anything else is rejected.

export type CborTag = { tag: number; value: CborValue };
export type CborValue =
  | bigint
  | Uint8Array
  | string
  | boolean
  | null
  | CborValue[]
  | Map<CborValue, CborValue>
  | CborTag;

export class CborError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CborError';
  }
}

const MAX_DEPTH = 8;

export function decodeCbor(bytes: Uint8Array): CborValue {
  let pos = 0;

  function need(n: number): void {
    if (pos + n > bytes.length) {
      throw new CborError('unexpected end');
    }
  }

  function length(info: number): bigint {
    if (info < 24) {
      return BigInt(info);
    }
    const size = info === 24 ? 1 : info === 25 ? 2 : info === 26 ? 4 : info === 27 ? 8 : 0;
    if (size === 0) {
      throw new CborError(`unsupported additional info ${info}`);
    }
    need(size);
    let n = 0n;
    for (let i = 0; i < size; i++) {
      n = (n << 8n) | BigInt(bytes[pos++]);
    }
    return n;
  }

  function count(info: number): number {
    const n = length(info);
    if (n > BigInt(bytes.length)) {
      throw new CborError('length beyond input');
    }
    return Number(n);
  }

  function item(depth: number): CborValue {
    if (depth > MAX_DEPTH) {
      throw new CborError('nested too deep');
    }
    need(1);
    const first = bytes[pos++];
    const major = first >> 5;
    const info = first & 31;
    switch (major) {
      case 0:
        return length(info);
      case 1:
        return -1n - length(info);
      case 2: {
        const n = count(info);
        need(n);
        const out = bytes.slice(pos, pos + n);
        pos += n;
        return out;
      }
      case 3: {
        const n = count(info);
        need(n);
        const out = Buffer.from(bytes.slice(pos, pos + n)).toString('utf8');
        pos += n;
        return out;
      }
      case 4: {
        const n = count(info);
        const out: CborValue[] = [];
        for (let i = 0; i < n; i++) {
          out.push(item(depth + 1));
        }
        return out;
      }
      case 5: {
        const n = count(info);
        const out = new Map<CborValue, CborValue>();
        for (let i = 0; i < n; i++) {
          const key = item(depth + 1);
          out.set(key, item(depth + 1));
        }
        return out;
      }
      case 6:
        return { tag: Number(length(info)), value: item(depth + 1) };
      default:
        if (info === 20 || info === 21) {
          return info === 21;
        }
        if (info === 22) {
          return null;
        }
        throw new CborError(`unsupported simple value ${info}`);
    }
  }

  const value = item(0);
  if (pos !== bytes.length) {
    throw new CborError('trailing bytes');
  }
  return value;
}

function head(major: number, n: number): number[] {
  if (n < 24) {
    return [(major << 5) | n];
  }
  if (n < 0x100) {
    return [(major << 5) | 24, n];
  }
  if (n < 0x10000) {
    return [(major << 5) | 25, n >> 8, n & 0xff];
  }
  return [(major << 5) | 26, (n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Encodes the small subset this app writes: unsigned ints, byte strings,
// text, maps with int keys, and tags.
export function encodeCbor(value: CborValue): Uint8Array {
  const out: number[] = [];
  const put = (v: CborValue): void => {
    if (typeof v === 'bigint') {
      if (v < 0n || v > 0xffffffffn) {
        throw new CborError('int out of range');
      }
      out.push(...head(0, Number(v)));
    } else if (v instanceof Uint8Array) {
      out.push(...head(2, v.length), ...v);
    } else if (typeof v === 'string') {
      const b = Buffer.from(v, 'utf8');
      out.push(...head(3, b.length), ...b);
    } else if (v instanceof Map) {
      out.push(...head(5, v.size));
      v.forEach((x, k) => {
        put(k);
        put(x);
      });
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...head(6, v.tag));
      put(v.value);
    } else {
      throw new CborError('unsupported value');
    }
  };
  put(value);
  return Uint8Array.from(out);
}
