import { SigHash } from '@scure/btc-signer';
import { addressesOfKey, wipe } from './key';
import { BtcBlock, keyBlocks, parsePsbt, readTransaction } from './psbt';

export type BtcSignErrorCode = 'blocked' | 'not-signed';

export class BtcSignError extends Error {
  constructor(
    readonly code: BtcSignErrorCode,
    message: string,
    readonly blocked: BtcBlock[] = [],
  ) {
    super(message);
    this.name = 'BtcSignError';
  }
}

// Signs every input with the paper wallet key and wipes the key. The PSBT is
// re-read here so a view checked earlier cannot be paired with other bytes.
export function signTransaction(psbt: Uint8Array, key: Uint8Array): Uint8Array {
  try {
    const view = readTransaction(psbt);
    const blocked = [...view.blocked, ...keyBlocks(view, addressesOfKey(key))];
    if (blocked.length > 0) {
      throw new BtcSignError('blocked', 'transaction is blocked from signing', blocked);
    }
    const tx = parsePsbt(psbt);
    for (let i = 0; i < tx.inputsLength; i++) {
      if (!tx.signIdx(key, i, [SigHash.ALL])) {
        throw new BtcSignError('not-signed', `could not sign input ${i}`);
      }
    }
    return tx.toPSBT(0);
  } finally {
    wipe(key);
  }
}
