# PaperWallet Helper

[한국어](README.ko.md)

> Latest version: **1.1.0**. See the [release](https://github.com/HeiheiSkippy/PaperWalletHelper/releases/tag/v1.1.0) for what changed.

A pair of Android apps for using BTC/BMB and EVM (BSC) paper wallets in an air-gapped setup. The Offline app
(PaperWallet Helper Offline) runs on a device with every external connection cut off and signs transactions with
your paper wallet's private key QR. The Online app (PaperWallet Helper Online) runs on your everyday phone and
checks balances, creates transactions, and broadcasts them. Private keys are never stored on any device.

This is an unofficial tool built by an individual and has not had a security audit.

## Features

- The Offline app has no network permission.
- The Offline app scans the private key QR only at signing time and never saves it on the device. Once signing is
  done the key bytes are overwritten with zeros, but with JavaScript the memory is only cleared once the app
  fully exits, so the Offline app is made to exit the moment it leaves the screen.
- The Offline app can work out the EVM public address from the private key of a BTC/BMB-only paper wallet
  and show it as a QR, so the same paper wallet can also be used as an EVM wallet.
- The Offline app checks the transaction the Online app built as follows.
  - BTC/BMB: every input must be a UTXO of the sending address, change must go back to the sending address, the
    fee rate must be under the limit, and the sighash type must be SIGHASH_ALL.
  - BSC: only BNB transfers and WBMB, MOVN, or USDT transfers are signed, with a gas price cap (1 gwei) and an
    allowed gas limit range.
- Before creating a BSC transaction, the Online app asks the node to simulate it and does not create it if the
  node reports that it would fail. After broadcasting, it shows whether the transaction was included in a block.
- Both apps ask for the device's screen lock each time they are opened, keeping others out.
- Screenshots and screen recording are blocked, and touches are ignored while another app is drawing over the
  screen.

## Supported

- Signing works only with a paper wallet's private key QR. Seed phrase QR codes cannot be used for signing.
- BTC/BMB paper wallets: BTC and BMB (BTCMobick). For now the apps are built for legacy paper wallets with addresses starting
  with 1. Private keys must start with K or L. Native SegWit addresses (starting with bc1q) can still be viewed and sent from,
  but the Offline app's Show public address only shows the address starting with 1.
- EVM (BSC) paper wallets: BNB, WBMB, MOVN, USDT
- There is no token swap feature.

## Where to get it

Both apps are distributed only through this repository's
[Releases](https://github.com/HeiheiSkippy/PaperWalletHelper/releases). APKs obtained any other way may have
been tampered with.

Each release lists the commit hash it was built from. The SHA-256 fingerprint of the official APK signing key is:

```
E1:0E:AE:85:9D:30:CA:63:57:E4:85:FD:74:4D:18:1D:B1:A9:3C:DD:3C:EF:05:9E:D6:8C:93:78:DA:D0:7B:0E
```

## How to use

For detailed steps for air-gapped signing, see the following guide.

[Usage guide](USAGE.md)

## Reviewing the source

The code that handles private keys and checks transactions is in these files.

| File | What it does |
|---|---|
| `app/src/signer/flow.ts` | Offline app flow: scan the transaction QR, check it, verify the key, sign, erase the key, work out public addresses from a key |
| `app/src/core/btc/key.ts` | Parsing BTC/BMB private key (WIF) QR codes and deriving addresses |
| `app/src/core/btc/psbt.ts` | Parsing BTC/BMB transactions (PSBT) and pre-signing checks |
| `app/src/core/btc/sign.ts` | Signing BTC/BMB transactions |
| `app/src/core/key.ts` | Parsing EVM private key QR codes and deriving addresses |
| `app/src/core/evm/send.ts` | Deciding which BSC transactions may be signed (BNB transfers; WBMB, MOVN, USDT transfers) |
| `app/src/core/evm/sign.ts` | Signing BSC transactions |
| `app/src/core/chain.ts` | Chain ID, token contract addresses, gas price cap |
| `app/src/core/qr.ts` | QR format between the two apps (BC-UR) |
| `app/android/app/src/signer/AndroidManifest.xml` | Removing the Offline app's network permissions |
| `app/android/app/src/main/java/io/github/heiheiskippy/paperwallethelper/MainActivity.kt` | Screenshot blocking, rejecting touches on an obscured screen, closing the Offline app when it leaves the screen |

## Building from source

Builds run in a Linux container made from the repository's `Dockerfile`. All you need is Docker; the other tools
are installed inside the container at the versions pinned in the `Dockerfile`.

```bash
git clone https://github.com/HeiheiSkippy/PaperWalletHelper.git
cd PaperWalletHelper
docker build -t paperwallethelper-build .
docker run --rm -v "$PWD:/build:ro" -v "$PWD/out:/out" paperwallethelper-build bash -lc '
  git config --global --add safe.directory /build
  git clone -q /build /work/PaperWalletHelper
  cd /work/PaperWalletHelper/app && npm ci
  cd android
  ./gradlew --no-daemon assembleSignerRelease -PrnEntry=index.signer.js
  ./gradlew --no-daemon assembleBroadcasterRelease -PrnEntry=index.broadcaster.js
  cp app/build/outputs/apk/signer/release/*.apk app/build/outputs/apk/broadcaster/release/*.apk /out/'
```

The APKs are written to `out/` and signed with the test key included in the repository. On Windows, use the full
path of the repository in place of `$PWD`.

`-PrnEntry` selects the entry file bundled into each app. Building the Offline app with any other entry file fails
on purpose.

If you only want to build the apps for your own use, you can build outside the container, but the resulting APKs
will not be byte-for-byte identical to the official ones.

## Verifying that a release matches the source

The official APKs are built in the same container. Check out the commit listed in the release
(`git checkout <commit hash>`) and run the commands above unchanged; the APKs you get differ from the official ones
only in their signatures. The build path ends up in the native libraries, so keep the path inside the container
(`/work/PaperWalletHelper`) as it is.

Compare the archive entries while skipping the signature files (`META-INF/MANIFEST.MF`, `META-INF/*.SF`, `*.RSA`,
`*.DSA`, `*.EC`), or use a tool such as diffoscope.

## License

The source code of this app is public, but it is not released under an open-source license such as MIT. If anyone could redistribute the APKs, getting them from all sorts of places would become normal, and tampered APKs could slip in along the way.

You may build the source for the following purposes:

- Building it for your own personal use
- Building it to check that it matches the official APK

The libraries used in the app are under their own licenses; the notices are in the app under Settings → About →
Licenses.

The full text is in [LICENSE](LICENSE).

## Buy me a coffee

If this app kept your keys offline and your mind at ease, feel free to buy me a coffee. ☕

`0xea66EA4787d0D8Ec7264651808e82F871aB30279` (BSC: WBMB, MOVN)
