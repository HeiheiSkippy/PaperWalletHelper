import { Transaction } from '@scure/btc-signer';
import { Chain } from './chain';

export const MEMPOOL_API: Record<Chain, string> = {
  BTC: 'https://mempool.space/api',
  BMB: 'https://blockchain.mobick.info/api',
};

const TIMEOUT_MS = 15_000;
const BROADCAST_TIMEOUT_MS = 60_000;
const MAX_PAGES = 40;

export type MempoolErrorCode = 'network' | 'http' | 'format' | 'too-many-txs' | 'prev-tx' | 'rejected';

export class MempoolError extends Error {
  constructor(readonly code: MempoolErrorCode, message: string) {
    super(message);
    this.name = 'MempoolError';
  }
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type Utxo = { txid: string; index: number; amount: bigint; prevTx: Uint8Array };

export type FeeRates = { fastest: number; halfHour: number; hour: number; economy: number; minimum: number };

type ApiTx = {
  txid: string;
  vin: { txid: string; vout: number; is_coinbase: boolean; prevout?: { scriptpubkey: string; value: number } | null }[];
  vout: { scriptpubkey: string; value: number }[];
  status: { confirmed: boolean; block_time?: number };
};

async function request(fetcher: Fetcher, url: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<string> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetcher(url, { ...init, signal: abort.signal as RequestInit['signal'] });
  } catch (e) {
    throw new MempoolError('network', String((e as Error)?.message ?? e));
  } finally {
    clearTimeout(timer);
  }
  const body = await res.text();
  if (!res.ok) {
    throw new MempoolError(init?.method === 'POST' ? 'rejected' : 'http', `${res.status} ${body.slice(0, 200)}`);
  }
  return body;
}

const TXID = /^[0-9a-f]{64}$/;
const HEX = /^(?:[0-9a-f]{2})+$/;

function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}

function parseTxs(body: string): ApiTx[] {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new MempoolError('format', 'transaction list is not JSON');
  }
  const ok =
    Array.isArray(data) &&
    data.every(
      (t: ApiTx) =>
        TXID.test(t?.txid) &&
        typeof t.status?.confirmed === 'boolean' &&
        Array.isArray(t.vin) &&
        t.vin.every(
          i =>
            typeof i.is_coinbase === 'boolean' &&
            (i.is_coinbase || (TXID.test(i.txid) && Number.isInteger(i.vout))) &&
            (i.prevout == null || (HEX.test(i.prevout.scriptpubkey) && isAmount(i.prevout.value))),
        ) &&
        (t.status.block_time === undefined || isAmount(t.status.block_time)) &&
        Array.isArray(t.vout) &&
        t.vout.every(o => HEX.test(o?.scriptpubkey) && isAmount(o.value)),
    );
  if (!ok) {
    throw new MempoolError('format', 'unexpected transaction list');
  }
  return data as ApiTx[];
}

export async function addressTxs(fetcher: Fetcher, chain: Chain, address: string): Promise<ApiTx[]> {
  const all: ApiTx[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url: string = `${MEMPOOL_API[chain]}/address/${address}/txs${after ? `?after_txid=${after}` : ''}`;
    const txs = parseTxs(await request(fetcher, url));
    const fresh = txs.filter(t => !seen.has(t.txid));
    if (fresh.length === 0) {
      return all;
    }
    for (const t of fresh) {
      seen.add(t.txid);
      all.push(t);
    }
    const confirmed = fresh.filter(t => t.status.confirmed);
    if (confirmed.length === 0) {
      return all;
    }
    after = confirmed[confirmed.length - 1].txid;
  }
  throw new MempoolError('too-many-txs', 'address has too many transactions');
}

// Outputs to `script` in confirmed transactions that no listed transaction
// spends, unconfirmed spends included.
export function unspentOf(txs: ApiTx[], script: string): { txid: string; index: number; amount: bigint }[] {
  const spent = new Set<string>();
  for (const t of txs) {
    for (const i of t.vin) {
      if (!i.is_coinbase) {
        spent.add(`${i.txid}:${i.vout}`);
      }
    }
  }
  const out: { txid: string; index: number; amount: bigint }[] = [];
  for (const t of txs) {
    if (!t.status.confirmed) {
      continue;
    }
    t.vout.forEach((o, index) => {
      if (o.scriptpubkey === script && !spent.has(`${t.txid}:${index}`)) {
        out.push({ txid: t.txid, index, amount: BigInt(o.value) });
      }
    });
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchUtxos(
  fetcher: Fetcher,
  chain: Chain,
  address: string,
  script: Uint8Array,
): Promise<Utxo[]> {
  const scriptHex = bytesToHex(script);
  const found = unspentOf(await addressTxs(fetcher, chain, address), scriptHex);
  const utxos: Utxo[] = [];
  for (const u of found) {
    const hex = (await request(fetcher, `${MEMPOOL_API[chain]}/tx/${u.txid}/hex`)).trim().toLowerCase();
    if (!HEX.test(hex)) {
      throw new MempoolError('format', `previous transaction ${u.txid} is not hex`);
    }
    const prevTx = hexToBytes(hex);
    let prev: Transaction;
    try {
      prev = Transaction.fromRaw(prevTx, {
        allowUnknownInputs: true,
        allowUnknownOutputs: true,
        disableScriptCheck: true,
      });
    } catch {
      throw new MempoolError('prev-tx', `previous transaction ${u.txid} does not parse`);
    }
    const out = prev.getOutput(u.index);
    if (prev.id !== u.txid || out.amount !== u.amount || !out.script || bytesToHex(out.script) !== scriptHex) {
      throw new MempoolError('prev-tx', `previous transaction ${u.txid} does not match`);
    }
    utxos.push({ ...u, prevTx });
  }
  return utxos;
}

export type HistoryEntry = { txid: string; net: bigint; confirmed: boolean; time: number | null };

// Received minus spent, so a send includes its fee.
export function historyOf(txs: ApiTx[], script: string): HistoryEntry[] {
  return txs.map(t => {
    const received = t.vout.filter(o => o.scriptpubkey === script).reduce((sum, o) => sum + BigInt(o.value), 0n);
    const spent = t.vin
      .filter(i => i.prevout?.scriptpubkey === script)
      .reduce((sum, i) => sum + BigInt(i.prevout!.value), 0n);
    return {
      txid: t.txid,
      net: received - spent,
      confirmed: t.status.confirmed,
      time: t.status.block_time ?? null,
    };
  });
}

export async function fetchHistory(
  fetcher: Fetcher,
  chain: Chain,
  address: string,
  script: Uint8Array,
): Promise<{ balance: Holdings; entries: HistoryEntry[] }> {
  const txs = await addressTxs(fetcher, chain, address);
  const hex = bytesToHex(script);
  return { balance: holdingsOf(txs, hex), entries: historyOf(txs, hex) };
}

// Worked out from the transaction list: the BMB explorer reports spent sums as zero.
export type Holdings = { spendable: bigint; incoming: bigint; change: bigint };

export function holdingsOf(txs: ApiTx[], script: string): Holdings {
  const spendable = unspentOf(txs, script).reduce((sum, u) => sum + u.amount, 0n);
  const spent = new Set(txs.flatMap(t => t.vin.map(i => `${i.txid}:${i.vout}`)));
  let incoming = 0n;
  let change = 0n;
  for (const t of txs) {
    if (t.status.confirmed) {
      continue;
    }
    const own = t.vin.some(i => i.prevout?.scriptpubkey === script);
    t.vout.forEach((o, index) => {
      if (o.scriptpubkey === script && !spent.has(`${t.txid}:${index}`)) {
        if (own) {
          change += BigInt(o.value);
        } else {
          incoming += BigInt(o.value);
        }
      }
    });
  }
  return { spendable, incoming, change };
}

export async function fetchBalance(fetcher: Fetcher, chain: Chain, address: string, script: Uint8Array): Promise<Holdings> {
  return holdingsOf(await addressTxs(fetcher, chain, address), bytesToHex(script));
}

export async function fetchFeeRates(fetcher: Fetcher, chain: Chain): Promise<FeeRates> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(await request(fetcher, `${MEMPOOL_API[chain]}/v1/fees/recommended`));
  } catch (e) {
    if (e instanceof MempoolError) {
      throw e;
    }
    throw new MempoolError('format', 'fee rates are not JSON');
  }
  const pick = (k: string): number => {
    const v = data?.[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      throw new MempoolError('format', `fee rate ${k} is missing`);
    }
    return v;
  };
  return {
    fastest: pick('fastestFee'),
    halfHour: pick('halfHourFee'),
    hour: pick('hourFee'),
    economy: pick('economyFee'),
    minimum: pick('minimumFee'),
  };
}

export async function broadcastRaw(fetcher: Fetcher, chain: Chain, raw: Uint8Array, txid: string): Promise<void> {
  try {
    const body = await request(
      fetcher,
      `${MEMPOOL_API[chain]}/tx`,
      { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: bytesToHex(raw) },
      BROADCAST_TIMEOUT_MS,
    );
    if (body.trim() !== txid) {
      throw new MempoolError('format', 'server returned a different txid');
    }
  } catch (e) {
    // The server may have it anyway, from this or an earlier attempt.
    if (await isKnown(fetcher, chain, txid)) {
      return;
    }
    throw e;
  }
}

export type Watch = {
  checks?: number;
  intervalMs?: number;
  slowAfter?: number;
  onSlow?: () => void;
  onLate?: (outcome: 'sent' | MempoolError) => void;
  wait?: (ms: number) => Promise<void>;
};

const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms));

// The reply to a send can lag far behind, so also poll whether the server has it.
export async function broadcastWatched(
  fetcher: Fetcher,
  chain: Chain,
  raw: Uint8Array,
  txid: string,
  { checks = 10, intervalMs = 3_000, slowAfter = 3, onSlow, onLate, wait = sleep }: Watch = {},
): Promise<'sent' | 'unknown'> {
  let outcome: 'sent' | MempoolError | null = null;
  let settled = false;
  const post = broadcastRaw(fetcher, chain, raw, txid)
    .then(
      () => {
        outcome = 'sent';
      },
      e => {
        if (e instanceof MempoolError && e.code === 'rejected') {
          outcome = e;
        }
      },
    )
    .finally(() => {
      settled = true;
    });
  for (let i = 1; i <= checks; i++) {
    await (settled ? wait(intervalMs) : Promise.race([post, wait(intervalMs)]));
    if (outcome === 'sent') {
      return 'sent';
    }
    if (outcome !== null) {
      throw outcome;
    }
    if (await isKnown(fetcher, chain, txid)) {
      return 'sent';
    }
    if (i === slowAfter) {
      onSlow?.();
    }
  }
  post.then(() => {
    if (outcome !== null) {
      onLate?.(outcome);
    }
  });
  return 'unknown';
}

async function isKnown(fetcher: Fetcher, chain: Chain, txid: string): Promise<boolean> {
  try {
    await request(fetcher, `${MEMPOOL_API[chain]}/tx/${txid}/status`);
    return true;
  } catch {
    return false;
  }
}
