import { Address, NETWORK, OutScript, selectUTXO } from '@scure/btc-signer';
import { Chain, setChainLabel } from './chain';
import { PublicAddress } from './key';
import { Utxo } from './mempool';
import { MAX_FEE_RATE, readTransaction } from './psbt';

export type BuildErrorCode =
  | 'recipient'
  | 'no-utxos'
  | 'insufficient'
  | 'dust-amount'
  | 'fee-rate'
  | 'check';

export class BuildError extends Error {
  constructor(readonly code: BuildErrorCode, message: string) {
    super(message);
    this.name = 'BuildError';
  }
}

export type Recipient = { address: string; script: Uint8Array; dust: bigint };

// Bitcoin Core dust limits at 3 sat/vB, by output type.
const DUST: Record<string, bigint> = { pkh: 546n, sh: 540n, wpkh: 294n, wsh: 330n, tr: 330n };

export function readRecipient(text: string): Recipient {
  let decoded: ReturnType<ReturnType<typeof Address>['decode']>;
  try {
    decoded = Address(NETWORK).decode(text.trim());
  } catch {
    throw new BuildError('recipient', 'not a BTC/BMB address');
  }
  const dust = DUST[decoded.type];
  if (dust === undefined) {
    throw new BuildError('recipient', `${decoded.type} addresses are not supported`);
  }
  return { address: Address(NETWORK).encode(decoded), script: OutScript.encode(decoded), dust };
}

export type BuildRequest = {
  chain: Chain;
  from: PublicAddress;
  utxos: Utxo[];
  to: Recipient;
  amount: bigint | 'all';
  feeRate: number;
};

export type Built = { psbt: Uint8Array; send: bigint; change: bigint; fee: bigint };

export function buildPsbt(req: BuildRequest): Built {
  const feeRate = Math.ceil(req.feeRate);
  if (!Number.isFinite(feeRate) || feeRate < 1 || feeRate > MAX_FEE_RATE) {
    throw new BuildError('fee-rate', `fee rate ${req.feeRate} is outside 1..${MAX_FEE_RATE}`);
  }
  if (req.utxos.length === 0) {
    throw new BuildError('no-utxos', 'no confirmed UTXOs');
  }
  const sendAll = req.amount === 'all';
  if (!sendAll && (req.amount as bigint) < req.to.dust) {
    throw new BuildError('dust-amount', `amount is below the ${req.to.dust} sat dust limit`);
  }

  const inputs = req.utxos.map(u => ({ txid: u.txid, index: u.index, nonWitnessUtxo: u.prevTx }));
  const outputs = sendAll ? [] : [{ address: req.to.address, amount: req.amount as bigint }];
  let selected: ReturnType<typeof selectUTXO>;
  try {
    selected = selectUTXO(inputs, outputs, 'all', {
      changeAddress: sendAll ? req.to.address : req.from.address,
      feePerByte: BigInt(feeRate),
      createTx: true,
      network: NETWORK,
      proprietary: 'ignore',
    });
  } catch (e) {
    throw new BuildError('check', String((e as Error)?.message ?? e));
  }
  if (!selected || !selected.tx) {
    throw new BuildError('insufficient', 'balance does not cover the amount and fee');
  }
  if (sendAll && !selected.change) {
    throw new BuildError('insufficient', 'balance does not cover the fee');
  }

  setChainLabel(selected.tx, req.chain);
  const psbt = selected.tx.toPSBT(0);

  // Build only what the signer will accept.
  const view = readTransaction(psbt);
  if (view.blocked.length > 0 || view.from !== req.from.address) {
    throw new BuildError('check', `built PSBT is blocked: ${JSON.stringify(view.blocked)}`);
  }
  return { psbt, send: view.sendTotal, change: view.changeTotal, fee: view.fee };
}
