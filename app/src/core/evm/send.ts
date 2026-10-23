import { Transaction, ethHex } from 'micro-eth-signer';
import { ERC20, createContract } from 'micro-eth-signer/abi.js';
import { normalizeAddress, sameAddress } from '../address';
import { CHAIN_ID, MAX_GAS_PRICE, MOVN, MOVN_DECIMALS, WBMB, WBMB_DECIMALS } from '../chain';

const erc20 = createContract(ERC20);

export const USDT = '0x55d398326f99059fF775485246999027B3197955';
export const USDT_DECIMALS = 18;
export const BNB_DECIMALS = 18;

export type Token = 'WBMB' | 'MOVN' | 'USDT';
export type EvmAsset = 'BNB' | Token;

export const TOKENS: Record<Token, { address: string; decimals: number }> = {
  WBMB: { address: WBMB, decimals: WBMB_DECIMALS },
  MOVN: { address: MOVN, decimals: MOVN_DECIMALS },
  USDT: { address: USDT, decimals: USDT_DECIMALS },
};

export const BNB_GAS_LIMIT = 21_000n;
export const MAX_GAS_LIMIT = 100_000n;

const TRANSFER_SELECTOR = 'a9059cbb';

export type EvmErrorCode =
  | 'not-tx'
  | 'not-allowed'
  | 'address'
  | 'amount'
  | 'gas-price'
  | 'gas-limit'
  | 'nonce'
  | 'wrong-key'
  | 'signature'
  | 'different';

export class EvmError extends Error {
  constructor(readonly code: EvmErrorCode, message: string) {
    super(message);
    this.name = 'EvmError';
  }
}

function fail(code: EvmErrorCode, message: string): never {
  throw new EvmError(code, message);
}

export type EvmSend = { asset: EvmAsset; to: string; amount: bigint };

export type EvmFees = { nonce: bigint; gasPrice: bigint; gasLimit: bigint };

export type EvmView = EvmSend & EvmFees & { maxFee: bigint };

// A plain BNB send costs exactly 21,000. More means the recipient runs code
// (a contract, or an EIP-7702 delegated account), so it gets the same 20% headroom as tokens.
export function gasLimitFor(asset: EvmAsset, estimate: bigint): bigint {
  if (asset === 'BNB' && estimate === BNB_GAS_LIMIT) {
    return BNB_GAS_LIMIT;
  }
  const limit = (estimate * 12n + 9n) / 10n;
  if (estimate < BNB_GAS_LIMIT || limit > MAX_GAS_LIMIT) {
    fail('gas-limit', `gas estimate ${estimate} is out of range`);
  }
  return limit;
}

function tokenAt(address: string): Token | null {
  return (Object.keys(TOKENS) as Token[]).find(t => sameAddress(TOKENS[t].address, address)) ?? null;
}

// The only two transactions the signer accepts: a BNB send and a token
// transfer(to, amount) on one of the fixed contracts.
type LegacyRaw = {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data: string;
  chainId: bigint;
};

export function readSend(unsigned: Uint8Array): EvmView {
  let parsed: ReturnType<typeof Transaction.fromBytes>;
  try {
    parsed = Transaction.fromBytes(unsigned);
  } catch (e) {
    fail('not-tx', String((e as Error)?.message ?? e));
  }
  if (parsed.type !== 'legacy' || parsed.isSigned) {
    fail('not-allowed', 'only unsigned legacy transactions are accepted');
  }
  const { nonce, gasPrice, gasLimit, to, value, data, chainId } = parsed.raw as LegacyRaw;
  if (chainId !== CHAIN_ID) {
    fail('not-allowed', `chain ${chainId} is not BSC`);
  }
  if (nonce < 0n) {
    fail('nonce', 'negative nonce');
  }
  if (gasPrice <= 0n || gasPrice > MAX_GAS_PRICE) {
    fail('gas-price', `gas price ${gasPrice} wei is over the cap`);
  }
  const fees: EvmFees & { maxFee: bigint } = { nonce, gasPrice, gasLimit, maxFee: gasLimit * gasPrice };

  const body = data.replace(/^0x/, '').toLowerCase();
  if (body === '') {
    const recipient = normalizeAddress(to);
    if (!recipient) {
      fail('address', 'invalid recipient');
    }
    if (value <= 0n) {
      fail('amount', 'BNB amount must be above zero');
    }
    if (gasLimit < BNB_GAS_LIMIT || gasLimit > MAX_GAS_LIMIT) {
      fail('gas-limit', `gas limit ${gasLimit} is out of range`);
    }
    return { asset: 'BNB', to: recipient, amount: value, ...fees };
  }

  const token = tokenAt(to);
  if (!token || value !== 0n || body.length !== 8 + 128 || !body.startsWith(TRANSFER_SELECTOR)) {
    fail('not-allowed', 'only BNB sends and WBMB, MOVN, USDT transfers are accepted');
  }
  // transfer(address,uint256): the address word must have 12 zero bytes in front.
  const addressWord = body.slice(8, 72);
  const recipient = normalizeAddress('0x' + addressWord.slice(24));
  if (!/^0{24}/.test(addressWord) || !recipient || /^0x0{40}$/.test(recipient)) {
    fail('address', 'invalid recipient');
  }
  const input = { to: recipient, value: BigInt('0x' + body.slice(72)) };
  if (input.value <= 0n) {
    fail('amount', 'token amount must be above zero');
  }
  if (gasLimit < BNB_GAS_LIMIT || gasLimit > MAX_GAS_LIMIT) {
    fail('gas-limit', `gas limit ${gasLimit} is out of range`);
  }
  return { asset: token, to: recipient, amount: input.value, ...fees };
}

export function buildSend(send: EvmSend, fees: EvmFees): Uint8Array {
  const to = normalizeAddress(send.to);
  if (!to) {
    fail('address', 'invalid recipient');
  }
  const call =
    send.asset === 'BNB'
      ? { to, value: send.amount, data: '' }
      : {
          to: TOKENS[send.asset].address,
          value: 0n,
          data: ethHex.encode(erc20.transfer.encodeInput({ to, value: send.amount })),
        };
  const unsigned = Transaction.prepare({
    type: 'legacy',
    chainId: CHAIN_ID,
    nonce: fees.nonce,
    gasPrice: fees.gasPrice,
    gasLimit: fees.gasLimit,
    ...call,
  }).toBytes({ includeSignature: false });
  // Build only what the signer will accept.
  readSend(unsigned);
  return unsigned;
}
