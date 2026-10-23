import { SigHash, Transaction, getInputType } from '@scure/btc-signer';
import { Chain, chainLabelOf } from './chain';
import { OwnAddress, OwnType, addressOfScript } from './key';

// sat/vB. One cap for both chains: the signer cannot tell BTC from BMB.
export const MAX_FEE_RATE = 100;

export type BtcPsbtErrorCode = 'not-psbt' | 'no-inputs' | 'no-prev-tx' | 'negative-fee';

export class BtcPsbtError extends Error {
  constructor(readonly code: BtcPsbtErrorCode, message: string) {
    super(message);
    this.name = 'BtcPsbtError';
  }
}

export type BtcInput = { index: number; amount: bigint; address: string | null };

export type BtcOutput = {
  index: number;
  amount: bigint;
  address: string | null;
  change: boolean;
};

export type BtcBlock =
  | { kind: 'mixed-inputs'; index: number }
  | { kind: 'unsupported-input'; index: number }
  | { kind: 'sighash'; index: number }
  | { kind: 'signed-input'; index: number }
  | { kind: 'unreadable-output'; index: number }
  | { kind: 'fee-rate'; feeRate: number; max: number }
  | { kind: 'not-this-key' };

export type BtcWarning = { kind: 'fee-above-amount' };

export type BtcTxView = {
  chain: Chain | null;
  from: string | null;
  fromScript: Uint8Array;
  fromType: OwnType | null;
  inputs: BtcInput[];
  outputs: BtcOutput[];
  inputTotal: bigint;
  outputTotal: bigint;
  sendTotal: bigint;
  changeTotal: bigint;
  fee: bigint;
  vsize: number;
  feeRate: number;
  blocked: BtcBlock[];
  warnings: BtcWarning[];
};

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function parsePsbt(psbt: Uint8Array): Transaction {
  try {
    return Transaction.fromPSBT(psbt, { proprietary: 'ignore', strictPrevoutValidation: true });
  } catch (e) {
    throw new BtcPsbtError('not-psbt', String((e as Error)?.message ?? e));
  }
}

export function readTransaction(psbt: Uint8Array): BtcTxView {
  const tx = parsePsbt(psbt);
  if (tx.inputsLength === 0) {
    throw new BtcPsbtError('no-inputs', 'PSBT has no inputs');
  }

  const blocked: BtcBlock[] = [];
  const inputs: BtcInput[] = [];
  let fromScript: Uint8Array | null = null;
  let fromType: OwnType | null = null;
  let inputTotal = 0n;
  let weight = BASE_WEIGHT;

  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    // Every input type needs the full previous transaction: witnessUtxo alone
    // lets a host lie about the amounts of other inputs across two signings.
    const prev = input.nonWitnessUtxo;
    const out = prev && input.index !== undefined ? prev.outputs[input.index] : undefined;
    if (!out || out.amount === undefined || out.script === undefined) {
      throw new BtcPsbtError('no-prev-tx', `input ${i} carries no previous transaction`);
    }
    inputTotal += out.amount;
    inputs.push({ index: i, amount: out.amount, address: addressOfScript(out.script) });

    if (fromScript === null) {
      fromScript = out.script;
    } else if (!sameBytes(fromScript, out.script)) {
      blocked.push({ kind: 'mixed-inputs', index: i });
    }

    const type = typeOf(input);
    if (type === null) {
      blocked.push({ kind: 'unsupported-input', index: i });
    } else {
      fromType = fromType ?? type;
      weight += INPUT_WEIGHT[type];
    }

    if (input.sighashType !== undefined && input.sighashType !== SigHash.ALL) {
      blocked.push({ kind: 'sighash', index: i });
    }

    if (
      input.partialSig?.length ||
      input.finalScriptSig !== undefined ||
      input.finalScriptWitness !== undefined
    ) {
      blocked.push({ kind: 'signed-input', index: i });
    }
  }

  const outputs: BtcOutput[] = [];
  let outputTotal = 0n;
  let changeTotal = 0n;
  for (let i = 0; i < tx.outputsLength; i++) {
    const out = tx.getOutput(i);
    if (out.script === undefined || out.amount === undefined) {
      throw new BtcPsbtError('not-psbt', `output ${i} is empty`);
    }
    const address = addressOfScript(out.script);
    const change = sameBytes(out.script, fromScript!);
    outputs.push({ index: i, amount: out.amount, address, change });
    outputTotal += out.amount;
    if (change) {
      changeTotal += out.amount;
    }
    if (address === null) {
      blocked.push({ kind: 'unreadable-output', index: i });
    }
    weight += (8 + 1 + out.script.length) * 4;
  }

  const fee = inputTotal - outputTotal;
  if (fee < 0n) {
    throw new BtcPsbtError('negative-fee', 'outputs exceed inputs');
  }
  const vsize = Math.ceil(weight / 4);
  const feeRate = Number(fee) / vsize;
  if (feeRate > MAX_FEE_RATE) {
    blocked.push({ kind: 'fee-rate', feeRate, max: MAX_FEE_RATE });
  }

  const sendTotal = outputTotal - changeTotal;
  const warnings: BtcWarning[] = [];
  if (fee > sendTotal) {
    warnings.push({ kind: 'fee-above-amount' });
  }

  return {
    chain: chainLabelOf(tx),
    from: addressOfScript(fromScript!),
    fromScript: fromScript!,
    fromType,
    inputs,
    outputs,
    inputTotal,
    outputTotal,
    sendTotal,
    changeTotal,
    fee,
    vsize,
    feeRate,
    blocked,
    warnings,
  };
}

export function keyBlocks(view: BtcTxView, own: OwnAddress[]): BtcBlock[] {
  const match = own.find(a => sameBytes(a.script, view.fromScript));
  return match && match.type === view.fromType ? [] : [{ kind: 'not-this-key' }];
}

function typeOf(input: ReturnType<Transaction['getInput']>): OwnType | null {
  let type: string;
  try {
    type = getInputType(input).type;
  } catch {
    return null;
  }
  return type === 'pkh' || type === 'wpkh' ? type : null;
}

// Weight units. Base: version, locktime, input and output counts, segwit marker.
const BASE_WEIGHT = (4 + 4 + 1 + 1) * 4 + 2;

const OUTPOINT_WEIGHT = (32 + 4 + 4) * 4;

// Signature pushed as 72 bytes (worst case) plus a 33-byte compressed key.
const INPUT_WEIGHT: Record<OwnType, number> = {
  pkh: OUTPOINT_WEIGHT + (1 + 1 + 72 + 1 + 33) * 4,
  wpkh: OUTPOINT_WEIGHT + 1 * 4 + (1 + 1 + 72 + 1 + 33),
};
