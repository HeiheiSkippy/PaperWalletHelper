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

export type KeyAddresses = { pkh: string | null; evm: string };

export type AddressesResult = { ok: true; addresses: KeyAddresses } | { ok: false; code: string };

const EVM_ADDRESS = /^\s*(0x)?[0-9a-fA-F]{40}\s*$/;

// A WIF key yields both addresses. A hex key yields only the EVM address,
// because BTC·BMB signing does not take hex keys.
export function addressesOfKeyQr(keyText: string): AddressesResult {
  if (MNEMONIC.test(keyText) || SEED_QR.test(keyText)) {
    return { ok: false, code: 'key.mnemonic' };
  }
  const hex = HEX_KEY.test(keyText) || EVM_ADDRESS.test(keyText);
  let key: Uint8Array;
  try {
    key = hex ? readPrivateKeyQr(keyText) : readWifQr(keyText);
  } catch (e) {
    if (e instanceof KeyError || e instanceof BtcKeyError) {
      return { ok: false, code: `key.${e.code}` };
    }
    throw e;
  }
  try {
    // Paper wallets in use print legacy 1… addresses, so bc1q is not offered.
    const pkh = hex ? null : addressesOfKey(key)[0].address;
    return { ok: true, addresses: { pkh, evm: addressOfKey(key) } };
  } finally {
    wipe(key);
  }
}

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

  // A WIF key is accepted too: Show public address gives its EVM address.
  let key: Uint8Array;
  try {
    key = WIF_KEY.test(keyText) ? readWifQr(keyText) : readPrivateKeyQr(keyText);
  } catch (e) {
    if (e instanceof KeyError || e instanceof BtcKeyError) {
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
