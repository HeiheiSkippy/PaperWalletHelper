import { ethHex } from 'micro-eth-signer';
import { ERC20, createContract } from 'micro-eth-signer/abi.js';
import { CHAIN_ID } from './chain';

const erc20 = createContract(ERC20);

// BNB Chain public endpoints. Not user-configurable.
export const NODES: readonly string[] = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
];

export type RpcErrorCode = 'unreachable' | 'wrong-chain' | 'node' | 'reply';

export class RpcError extends Error {
  constructor(readonly code: RpcErrorCode, message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type CallRequest = { from: string; to: string; value?: bigint; data?: string };

const QUANTITY = /^0x[0-9a-fA-F]{1,64}$/;
const DATA = /^0x(?:[0-9a-fA-F]{2})*$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;

function quantity(value: unknown): bigint {
  if (typeof value !== 'string' || !QUANTITY.test(value)) {
    throw new RpcError('reply', 'node returned a malformed number');
  }
  return BigInt(value);
}

function data(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !DATA.test(value)) {
    throw new RpcError('reply', 'node returned malformed data');
  }
  return ethHex.decode(value);
}

function hex(n: bigint): string {
  return '0x' + n.toString(16);
}

function uint256(bytes: Uint8Array): bigint {
  if (bytes.length !== 32) {
    throw new RpcError('reply', 'node returned a malformed uint256');
  }
  return erc20.balanceOf.decodeOutput(bytes);
}

class NodeError extends Error {}

export function createClient(
  fetchFn: FetchLike = fetch as unknown as FetchLike,
  nodes: readonly string[] = NODES,
  timeoutMs = 10_000,
) {
  const checked = new Set<string>();
  let id = 0;

  async function post(url: string, method: string, params: unknown[]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new NodeError(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        result?: unknown;
        error?: { message?: string };
      };
      if (body && typeof body === 'object' && body.error) {
        // The node answered; the request itself was refused.
        throw new RpcError('node', String(body.error.message ?? 'node error'));
      }
      if (!body || typeof body !== 'object' || !('result' in body)) {
        throw new NodeError('no result');
      }
      return body.result;
    } catch (e) {
      if (e instanceof RpcError) {
        throw e;
      }
      throw new NodeError(String((e as Error)?.message ?? e));
    } finally {
      clearTimeout(timer);
    }
  }

  async function call(method: string, params: unknown[]): Promise<unknown> {
    const failures: string[] = [];
    for (const url of nodes) {
      try {
        if (!checked.has(url)) {
          const chain = quantity(await post(url, 'eth_chainId', []));
          if (chain !== CHAIN_ID) {
            throw new RpcError('wrong-chain', `${url} is on chain ${chain}`);
          }
          checked.add(url);
        }
        return await post(url, method, params);
      } catch (e) {
        if (e instanceof NodeError) {
          failures.push(`${url}: ${e.message}`);
          continue;
        }
        throw e;
      }
    }
    throw new RpcError('unreachable', failures.join('; '));
  }

  async function tokenCall(token: string, input: Uint8Array): Promise<bigint> {
    const out = await call('eth_call', [
      { to: token, data: ethHex.encode(input) },
      'latest',
    ]);
    return uint256(data(out));
  }

  return {
    async bnbBalance(address: string): Promise<bigint> {
      return quantity(await call('eth_getBalance', [address, 'latest']));
    },
    tokenBalance(token: string, owner: string): Promise<bigint> {
      return tokenCall(token, erc20.balanceOf.encodeInput(owner));
    },
    async nonce(address: string): Promise<bigint> {
      return quantity(await call('eth_getTransactionCount', [address, 'pending']));
    },
    async gasPrice(): Promise<bigint> {
      return quantity(await call('eth_gasPrice', []));
    },
    async estimateGas(req: CallRequest): Promise<bigint> {
      const params: Record<string, string> = { from: req.from, to: req.to };
      if (req.value !== undefined) {
        params.value = hex(req.value);
      }
      if (req.data) {
        params.data = req.data;
      }
      return quantity(await call('eth_estimateGas', [params]));
    },
    async send(raw: string, expectedHash: string): Promise<string> {
      const hash = await call('eth_sendRawTransaction', [raw]);
      if (typeof hash !== 'string' || !HASH.test(hash)) {
        throw new RpcError('reply', 'node returned a malformed hash');
      }
      if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        throw new RpcError('reply', 'node returned a different transaction hash');
      }
      return hash;
    },
    // null until the transaction is in a block.
    async receipt(hash: string): Promise<{ ok: boolean; gasUsed: bigint } | null> {
      const reply = await call('eth_getTransactionReceipt', [hash]);
      if (reply === null) {
        return null;
      }
      const { status, gasUsed } = (reply ?? {}) as { status?: unknown; gasUsed?: unknown };
      if (status !== '0x0' && status !== '0x1') {
        throw new RpcError('reply', 'node returned a malformed receipt');
      }
      return { ok: status === '0x1', gasUsed: quantity(gasUsed) };
    },
  };
}

export type Client = ReturnType<typeof createClient>;
