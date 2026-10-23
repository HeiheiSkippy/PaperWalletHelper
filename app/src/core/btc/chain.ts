import { Transaction } from '@scure/btc-signer';

export type Chain = 'BTC' | 'BMB';

// PSBT proprietary key: identifier "bmbpw", subtype 0, no key data.
const IDENTIFIER = [0x62, 0x6d, 0x62, 0x70, 0x77];
const LABEL_KEY = Uint8Array.from([IDENTIFIER.length, ...IDENTIFIER, 0x00]);

const LABELS: Record<Chain, Uint8Array> = {
  BTC: Uint8Array.from([0x42, 0x54, 0x43]),
  BMB: Uint8Array.from([0x42, 0x4d, 0x42]),
};

function same(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// The label is set by the online app and cannot be verified offline; it only
// picks the unit shown to the user.
export function setChainLabel(tx: Transaction, chain: Chain): void {
  for (let i = 0; i < tx.inputsLength; i++) {
    tx.updateInput(i, { proprietary: [[LABEL_KEY, LABELS[chain]]] });
  }
}

export function chainLabelOf(tx: Transaction): Chain | null {
  let found: Chain | null = null;
  for (let i = 0; i < tx.inputsLength; i++) {
    const rows = tx.getInput(i).proprietary ?? [];
    const values = rows.filter(([key]) => same(key, LABEL_KEY)).map(([, value]) => value);
    if (values.length !== 1) {
      return null;
    }
    const chain = (Object.keys(LABELS) as Chain[]).find(c => same(LABELS[c], values[0]));
    if (!chain || (found !== null && found !== chain)) {
      return null;
    }
    found = chain;
  }
  return found;
}
