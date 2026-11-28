import { BtcTxView } from './core/btc/psbt';
import { EvmView } from './core/evm/send';

export type Loaded =
  | { kind: 'btc'; psbt: Uint8Array; view: BtcTxView }
  // request: the transaction came as an eth-sign-request (see core/qr).
  | { kind: 'evm'; from: string; unsigned: Uint8Array; view: EvmView; request?: { id: Uint8Array | null } };
