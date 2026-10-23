import { ethHex } from 'micro-eth-signer';
import { ERC20, createContract } from 'micro-eth-signer/abi.js';
import { normalizeAddress, sameAddress } from '../core/address';
import { FinalizeError, finalizeSigned } from '../core/btc/broadcast';
import { BuildError, buildPsbt, readRecipient } from '../core/btc/build';
import { Chain } from '../core/btc/chain';
import {
  Fetcher,
  HistoryEntry,
  Holdings,
  MempoolError,
  broadcastWatched,
  fetchBalance,
  fetchFeeRates,
  fetchHistory,
  fetchUtxos,
} from '../core/btc/mempool';
import { readTransaction } from '../core/btc/psbt';
import { MAX_GAS_PRICE } from '../core/chain';
import { attachSignature } from '../core/evm/broadcast';
import { BNB_DECIMALS, EvmAsset, EvmError, TOKENS, Token, buildSend, gasLimitFor, readSend } from '../core/evm/send';
import { QrPayload, evmTxHash, qrParts } from '../core/qr';
import { CallRequest, Client, RpcError } from '../core/rpc';
import { parseAmount } from '../core/units';
import { Loaded } from '../tx';
import { Wallet, btcAddress } from './wallets';

const erc20 = createContract(ERC20);

export type Asset = Chain | EvmAsset;

// The first asset is the send default. BMB leads so a slip sends the cheaper coin.
export const ASSETS: Record<Wallet['kind'], Asset[]> = {
  btc: ['BMB', 'BTC'],
  evm: ['BNB', 'WBMB', 'MOVN', 'USDT'],
};

export function decimalsOf(asset: Asset): number {
  if (asset === 'BTC' || asset === 'BMB') {
    return 8;
  }
  return asset === 'BNB' ? BNB_DECIMALS : TOKENS[asset].decimals;
}

export class SendError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'SendError';
  }
}

export function errorCode(e: unknown): string {
  if (e instanceof SendError) {
    return e.code;
  }
  if (e instanceof BuildError || e instanceof FinalizeError) {
    return e.code;
  }
  if (e instanceof EvmError) {
    return e.code === 'not-tx' || e.code === 'not-allowed' || e.code === 'nonce' ? 'check' : e.code;
  }
  if (e instanceof MempoolError) {
    return e.code === 'network' || e.code === 'too-many-txs' || e.code === 'rejected' ? e.code : 'server';
  }
  if (e instanceof RpcError) {
    return e.code === 'unreachable' ? 'network' : e.code === 'node' ? 'node' : 'server';
  }
  return 'unknown';
}

export type Net = { fetcher: Fetcher; client: Client };

// BSC blocks come every second or so; nothing waits unconfirmed.
export async function balanceOf(net: Net, wallet: Wallet, asset: Asset): Promise<Holdings> {
  if (asset === 'BTC' || asset === 'BMB') {
    const own = btcAddress(wallet);
    return fetchBalance(net.fetcher, asset, own.address, own.script);
  }
  const spendable =
    asset === 'BNB'
      ? await net.client.bnbBalance(wallet.address)
      : await net.client.tokenBalance(TOKENS[asset].address, wallet.address);
  return { spendable, incoming: 0n, change: 0n };
}

export async function historyOf(
  net: Net,
  wallet: Wallet,
  chain: Chain,
): Promise<{ balance: Holdings; entries: HistoryEntry[] }> {
  const own = btcAddress(wallet);
  return fetchHistory(net.fetcher, chain, own.address, own.script);
}

// Opened in the phone's browser; the app itself never contacts an explorer.
export function explorerUrl(wallet: Wallet, asset: Asset): string {
  if (asset === 'BTC') {
    return `https://mempool.space/address/${wallet.address}`;
  }
  if (asset === 'BMB') {
    return `https://blockchain.mobick.info/address/${wallet.address}`;
  }
  if (asset === 'BNB') {
    return `https://bscscan.com/address/${wallet.address}`;
  }
  return `https://bscscan.com/token/${TOKENS[asset].address}?a=${wallet.address}`;
}

export type FeeChoice = { fast: number; normal: number; slow: number };

export async function feeChoices(net: Net, chain: Chain): Promise<FeeChoice> {
  const rates = await fetchFeeRates(net.fetcher, chain);
  return { fast: rates.fastest, normal: rates.halfHour, slow: rates.hour };
}

export type Pending = { loaded: Loaded; parts: string[]; chain: Chain | 'BSC' };

export type SendRequest = {
  wallet: Wallet;
  asset: Asset;
  to: string;
  amount: string | 'all';
  feeRate?: number;
};

function amountOf(req: SendRequest): bigint | 'all' {
  if (req.amount === 'all') {
    return 'all';
  }
  const value = parseAmount(req.amount, decimalsOf(req.asset));
  if (value === null || value <= 0n) {
    throw new SendError('amount', 'amount is not a positive number');
  }
  return value;
}

export async function buildPending(net: Net, req: SendRequest): Promise<Pending> {
  if (req.asset === 'BTC' || req.asset === 'BMB') {
    return buildBtc(net, req, req.asset);
  }
  return buildEvm(net, req, req.asset);
}

async function buildBtc(net: Net, req: SendRequest, chain: Chain): Promise<Pending> {
  const to = readRecipient(req.to);
  const amount = amountOf(req);
  const from = btcAddress(req.wallet);
  if (to.address === from.address) {
    throw new SendError('self', 'recipient is the sending wallet');
  }
  const utxos = await fetchUtxos(net.fetcher, chain, from.address, from.script);
  const built = buildPsbt({ chain, from, utxos, to, amount, feeRate: req.feeRate ?? 1 });
  return {
    loaded: { kind: 'btc', psbt: built.psbt, view: readTransaction(built.psbt) },
    parts: qrParts({ kind: 'psbt', psbt: built.psbt }),
    chain,
  };
}

// The node runs the transaction to estimate gas, so a refusal here means it
// would fail on chain and still cost the fee.
async function estimate(net: Net, req: CallRequest): Promise<bigint> {
  try {
    return await net.client.estimateGas(req);
  } catch (e) {
    if (e instanceof RpcError && e.code === 'node') {
      const insufficient = /insufficient funds/i.test(e.message);
      throw new SendError(insufficient ? 'insufficient' : 'will-fail', e.message);
    }
    throw e;
  }
}

export type Outcome = 'waiting' | 'ok' | 'failed' | 'out-of-gas';

export async function evmOutcome(net: Net, hash: string, gasLimit: bigint): Promise<Outcome> {
  const receipt = await net.client.receipt(hash);
  if (receipt === null) {
    return 'waiting';
  }
  if (receipt.ok) {
    return 'ok';
  }
  return receipt.gasUsed >= gasLimit ? 'out-of-gas' : 'failed';
}

async function buildEvm(net: Net, req: SendRequest, asset: EvmAsset): Promise<Pending> {
  const from = req.wallet.address;
  const to = normalizeAddress(req.to);
  if (!to) {
    throw new SendError('recipient', 'invalid recipient');
  }
  if (sameAddress(to, from)) {
    throw new SendError('self', 'recipient is the sending wallet');
  }
  const requested = amountOf(req);
  const [nonce, gasPrice, bnb] = await Promise.all([
    net.client.nonce(from),
    net.client.gasPrice(),
    net.client.bnbBalance(from),
  ]);
  if (gasPrice <= 0n || gasPrice > MAX_GAS_PRICE) {
    throw new SendError('gas-price', `gas price ${gasPrice} is over the cap`);
  }

  let amount: bigint;
  let gasLimit: bigint;
  if (asset === 'BNB') {
    const probe = requested === 'all' || requested > bnb ? bnb : requested;
    gasLimit = gasLimitFor('BNB', await estimate(net, { from, to, value: probe }));
    const fee = gasLimit * gasPrice;
    amount = requested === 'all' ? bnb - fee : requested;
    if (amount <= 0n || amount + fee > bnb) {
      throw new SendError('insufficient', 'BNB balance does not cover the amount and gas');
    }
  } else {
    const token: Token = asset;
    const balance = await net.client.tokenBalance(TOKENS[token].address, from);
    amount = requested === 'all' ? balance : requested;
    if (amount <= 0n || amount > balance) {
      throw new SendError('insufficient', 'token balance does not cover the amount');
    }
    const data = ethHex.encode(erc20.transfer.encodeInput({ to, value: amount }));
    gasLimit = gasLimitFor(token, await estimate(net, { from, to: TOKENS[token].address, data }));
    if (gasLimit * gasPrice > bnb) {
      throw new SendError('no-gas', 'BNB balance does not cover the gas');
    }
  }

  const unsigned = buildSend({ asset, to, amount }, { nonce, gasPrice, gasLimit });
  return {
    loaded: { kind: 'evm', from, unsigned, view: readSend(unsigned) },
    parts: qrParts({ kind: 'evm-tx', from, unsigned }),
    chain: 'BSC',
  };
}

export type Signed = { kind: 'btc'; chain: Chain; raw: Uint8Array; txid: string } | { kind: 'evm'; raw: string; hash: string };

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function readSigned(pending: Pending, payload: QrPayload): Signed {
  const { loaded } = pending;
  if (loaded.kind === 'btc') {
    if (payload.kind !== 'psbt') {
      throw new SendError('not-signed-qr', 'not a signed PSBT');
    }
    const { raw, txid } = finalizeSigned(loaded.psbt, payload.psbt);
    return { kind: 'btc', chain: pending.chain as Chain, raw, txid };
  }
  if (payload.kind !== 'evm-sig') {
    throw new SendError('not-signed-qr', 'not an EVM signature');
  }
  if (!sameBytes(payload.txHash, evmTxHash(loaded.unsigned))) {
    throw new SendError('different', 'signature is for another transaction');
  }
  const { raw, hash } = attachSignature(loaded.unsigned, payload.signature, loaded.from);
  return { kind: 'evm', raw, hash };
}

// 'unknown': the server never confirmed it, but it may still have gone out.
export async function broadcast(
  net: Net,
  signed: Signed,
  onSlow?: () => void,
  onLate?: (outcome: 'sent' | MempoolError) => void,
): Promise<{ txid: string; result: 'sent' | 'unknown' }> {
  if (signed.kind === 'btc') {
    const result = await broadcastWatched(net.fetcher, signed.chain, signed.raw, signed.txid, { onSlow, onLate });
    return { txid: signed.txid, result };
  }
  return { txid: await net.client.send(signed.raw, signed.hash), result: 'sent' };
}
