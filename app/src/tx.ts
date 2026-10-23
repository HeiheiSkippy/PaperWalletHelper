import { BtcTxView } from './core/btc/psbt';
import { EvmView } from './core/evm/send';

export type Loaded =
  | { kind: 'btc'; psbt: Uint8Array; view: BtcTxView }
  | { kind: 'evm'; from: string; unsigned: Uint8Array; view: EvmView };
