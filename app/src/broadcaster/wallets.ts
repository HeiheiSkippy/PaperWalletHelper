import { normalizeAddress } from '../core/address';
import { AddressError, PublicAddress, readAddressQr as readBtcAddress } from '../core/btc/key';

export type WalletKind = 'btc' | 'evm';

export type Wallet = { kind: WalletKind; address: string; name: string; memo: string };

export const MAX_NAME_LENGTH = 24;
export const MAX_MEMO_LENGTH = 40;

export type AddressRead =
  | { ok: true; kind: WalletKind; address: string }
  | { ok: false; code: 'private-key' | 'unsupported' | 'format' };

const HEX_KEY = /^(?:0x)?[0-9a-fA-F]{64}$/;
const WIF_KEY = /^[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}$/;

// A private key is refused without being decoded.
export function readWalletQr(text: string): AddressRead {
  const trimmed = text.trim();
  if (HEX_KEY.test(trimmed) || WIF_KEY.test(trimmed)) {
    return { ok: false, code: 'private-key' };
  }
  const body = trimmed.replace(/^(?:bitcoin|ethereum):/i, '').split(/[?@/]/)[0];
  if (body.startsWith('0x') || body.startsWith('0X')) {
    const address = normalizeAddress(body);
    return address ? { ok: true, kind: 'evm', address } : { ok: false, code: 'format' };
  }
  try {
    return { ok: true, kind: 'btc', address: readBtcAddress(body).address };
  } catch (e) {
    if (e instanceof AddressError) {
      return { ok: false, code: e.code };
    }
    throw e;
  }
}

export function btcAddress(wallet: { address: string }): PublicAddress {
  return readBtcAddress(wallet.address);
}

export function readWallets(data: Record<string, unknown> | null): Wallet[] {
  const list = data?.wallets;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: Wallet[] = [];
  for (const item of list) {
    if (item === null || typeof item !== 'object' || typeof item.name !== 'string' || typeof item.address !== 'string') {
      continue;
    }
    const read = readWalletQr(item.address);
    if (!read.ok || read.kind !== item.kind || out.some(w => w.address === read.address)) {
      continue;
    }
    const memo = typeof item.memo === 'string' ? item.memo.slice(0, MAX_MEMO_LENGTH) : '';
    out.push({ kind: read.kind, address: read.address, name: item.name.slice(0, MAX_NAME_LENGTH), memo });
  }
  return out;
}

export function moveWallet(wallets: Wallet[], index: number, step: -1 | 1): Wallet[] {
  const to = index + step;
  if (index < 0 || index >= wallets.length || to < 0 || to >= wallets.length) {
    return wallets;
  }
  const next = [...wallets];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
