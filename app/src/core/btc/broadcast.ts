import { Chain } from './chain';
import { Fetcher, broadcastRaw } from './mempool';
import { BtcPsbtError, parsePsbt, sameBytes } from './psbt';

export type FinalizeErrorCode = 'not-psbt' | 'different' | 'not-signed' | 'finalize';

export class FinalizeError extends Error {
  constructor(readonly code: FinalizeErrorCode, message: string) {
    super(message);
    this.name = 'FinalizeError';
  }
}

export type Final = { raw: Uint8Array; txid: string };

// Accepts the signed PSBT only if it spends and pays exactly what this app built.
export function finalizeSigned(built: Uint8Array, signed: Uint8Array): Final {
  let mine;
  let theirs;
  try {
    mine = parsePsbt(built);
    theirs = parsePsbt(signed);
  } catch (e) {
    throw new FinalizeError('not-psbt', (e as BtcPsbtError).message);
  }
  if (!sameBytes(mine.unsignedTx, theirs.unsignedTx)) {
    throw new FinalizeError('different', 'signed transaction differs from the one built');
  }
  for (let i = 0; i < theirs.inputsLength; i++) {
    if (!theirs.getInput(i).partialSig?.length) {
      throw new FinalizeError('not-signed', `input ${i} is not signed`);
    }
  }
  try {
    theirs.finalize();
    return { raw: theirs.extract(), txid: theirs.id };
  } catch (e) {
    throw new FinalizeError('finalize', String((e as Error)?.message ?? e));
  }
}

export async function broadcastSigned(
  fetcher: Fetcher,
  chain: Chain,
  built: Uint8Array,
  signed: Uint8Array,
): Promise<string> {
  const { raw, txid } = finalizeSigned(built, signed);
  await broadcastRaw(fetcher, chain, raw, txid);
  return txid;
}
