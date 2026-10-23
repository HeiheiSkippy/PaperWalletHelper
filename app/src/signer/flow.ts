import { addressesOfKey, BtcKeyError, readWifQr, wipe } from '../core/btc/key';
import { BtcBlock, BtcPsbtError, keyBlocks, readTransaction } from '../core/btc/psbt';
import { BtcSignError, signTransaction } from '../core/btc/sign';
import { EvmError, readSend } from '../core/evm/send';
import { signSend } from '../core/evm/sign';
import { sameAddress } from '../core/address';
import { KeyError, addressOfKey, readPrivateKeyQr, wipe as wipeKey } from '../core/key';
import { QrPayload, evmTxHash, qrParts } from '../core/qr';
import { Loaded } from '../tx';

export type { Loaded };

export type LoadResult = { ok: true; loaded: Loaded } | { ok: false; code: string };

export function load(payload: QrPayload): LoadResult {
  try {
    if (payload.kind === 'psbt') {
      return { ok: true, loaded: { kind: 'btc', psbt: payload.psbt, view: readTransaction(payload.psbt) } };
    }
    if (payload.kind === 'evm-tx') {
      return {
        ok: true,
        loaded: { kind: 'evm', from: payload.from, unsigned: payload.unsigned, view: readSend(payload.unsigned) },
      };
    }
    return { ok: false, code: 'signed-qr' };
  } catch (e) {
    if (e instanceof BtcPsbtError) {
      return { ok: false, code: `btc.${e.code}` };
    }
    if (e instanceof EvmError) {
      return { ok: false, code: `evm.${e.code}` };
    }
    throw e;
  }
}

export type SignResult = { ok: true; parts: string[] } | { ok: false; code: string; blocked?: BtcBlock[] };

const HEX_KEY = /^\s*(0x)?[0-9a-fA-F]{64}\s*$/;
const WIF_KEY = /^\s*[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}\s*$/;
// BIP39 words (English or Korean list), or SeedQR with 4 digits per word.
const MNEMONIC = /^\s*([a-zㄱ-ㆎ가-힣]+\s+){11,23}[a-zㄱ-ㆎ가-힣]+\s*$/;
const SEED_QR = /^\s*(\d{48}|\d{96})\s*$/;

// Reads the key QR for the loaded transaction, signs, and wipes the key.
export function signLoaded(loaded: Loaded, keyText: string): SignResult {
  if (MNEMONIC.test(keyText) || SEED_QR.test(keyText)) {
    return { ok: false, code: 'key.mnemonic' };
  }
  if (loaded.kind === 'btc') {
    if (HEX_KEY.test(keyText)) {
      return { ok: false, code: 'key.evm-for-btc' };
    }
    let key: Uint8Array;
    try {
      key = readWifQr(keyText);
    } catch (e) {
      if (e instanceof BtcKeyError) {
        return { ok: false, code: `key.${e.code}` };
      }
      throw e;
    }
    if (keyBlocks(loaded.view, addressesOfKey(key)).length > 0) {
      wipe(key);
      return { ok: false, code: 'key.not-this-key' };
    }
    try {
      return { ok: true, parts: qrParts({ kind: 'psbt', psbt: signTransaction(loaded.psbt, key) }) };
    } catch (e) {
      if (e instanceof BtcSignError) {
        return { ok: false, code: `btc.${e.code}`, blocked: e.blocked };
      }
      throw e;
    }
  }

  if (WIF_KEY.test(keyText)) {
    return { ok: false, code: 'key.btc-for-evm' };
  }
  let key: Uint8Array;
  try {
    key = readPrivateKeyQr(keyText);
  } catch (e) {
    if (e instanceof KeyError) {
      return { ok: false, code: `key.${e.code}` };
    }
    throw e;
  }
  if (!sameAddress(addressOfKey(key), loaded.from)) {
    wipeKey(key);
    return { ok: false, code: 'key.not-this-key' };
  }
  try {
    const { signature } = signSend(loaded.unsigned, key);
    return {
      ok: true,
      parts: qrParts({ kind: 'evm-sig', txHash: evmTxHash(loaded.unsigned), signature }),
    };
  } catch (e) {
    if (e instanceof EvmError) {
      return { ok: false, code: `evm.${e.code}` };
    }
    throw e;
  }
}
