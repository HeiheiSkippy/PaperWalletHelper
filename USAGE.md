# PaperWallet Helper usage guide

[한국어](USAGE.ko.md)

## 1. The Offline app and the Online app

Air-gapped signing with paper wallets takes two devices: you install the Offline app on one and the Online app on the other.

| | Offline app (PaperWallet Helper Offline) | Online app (PaperWallet Helper Online) |
|---|---|---|
| Device | A spare device with every external connection cut off | Your everyday phone |
| Android | 9 or later | 14 or later |
| What it does | Reviews transactions and signs them with the private key QR | Adds public addresses, shows balances and transaction history, creates transactions, broadcasts them |
| Private keys | Scanned only at signing time, never stored | Never handled |
| Network permission | None | Yes |

## 2. Preparing the devices and installing the apps

### Offline app device

1. Pick the Android device you will use for the Offline app. It must meet all of the following:
   - A spare device you are not using and can factory reset
   - Android 9 or later
   - Never rooted, running stock firmware with no custom ROM
   - Not a used device or any device with an unknown history
2. Remove the SIM card and memory card.
3. Factory reset the device.
4. During initial setup, connect to Wi-Fi (not public Wi-Fi such as at a café or airport) and skip signing in to a Google account.
5. Set a screen lock (PIN, pattern, password, or biometrics).
6. In the device settings, turn off "Display over other apps" for every app that has it on.
7. In the default browser, such as Chrome or Samsung Internet, type [`github.com/HeiheiSkippy/PaperWalletHelper/releases`](https://github.com/HeiheiSkippy/PaperWalletHelper/releases) directly into the address bar.
8. Download the Offline app APK from the Releases page.
9. Once the download is finished, turn on airplane mode and turn off Wi-Fi, Bluetooth, NFC, and every other external connection.
10. Install the downloaded Offline app APK. If "Install unknown apps" appears, tap Allow.
11. After installing, open "Install unknown apps" in the device settings and set every app to not allowed.

**Notes**

- Wi-Fi is used only to download the Offline app APK. Do not install or update any other app while connected.
- This device does not use a Google account, so there is no need to sign in. If the browser suggests signing in or turning on sync when you first open it, decline.
- Type the address directly instead of searching for it. When the page opens, check that the address bar starts with `github.com/HeiheiSkippy/PaperWalletHelper`.
- Do not turn on developer options.
- Transferring the APK by connecting the phone to a PC is not recommended. The PC may be infected.
- From then on, keep every external connection on the Offline app device cut off. Do not connect it over USB in any mode that can transfer data either.

### Online app device

1. Use the device you normally keep online.
2. It must have a screen lock (PIN, pattern, password, or biometrics) set.
3. In a browser such as Chrome or Samsung Internet, go to [`github.com/HeiheiSkippy/PaperWalletHelper/releases`](https://github.com/HeiheiSkippy/PaperWalletHelper/releases).
4. Download the Online app APK from the Releases page.
5. Install the downloaded Online app APK. If "Install unknown apps" appears, tap Allow.
6. After installing, open "Install unknown apps" in the device settings and set every app to not allowed.

**Notes**

- When the page opens, check that the address bar starts with `github.com/HeiheiSkippy/PaperWalletHelper`.
- During installation, Google Play Protect may ask whether to send the app for scanning. You can send it; installation may take a little longer while it is scanned. Not sending it has no effect on installing or using the app.
- Always download both apps directly from the Releases of `https://github.com/HeiheiSkippy/PaperWalletHelper`. Do not accept APKs passed along any other way.
- The apps have no in-app update notice. Check GitHub Releases for new versions and download them from there.

## 3. Sending with an air-gapped signature

An air-gapped send takes three stages:

1. Create an unsigned transaction in the Online app
2. Scan the transaction into the Offline app and sign it
3. Scan the signed transaction into the Online app and broadcast it to the network

Here is a concrete example.

### Goal: send 3 MOVN from paper wallet A

Before you start: send some BNB to paper wallet A to pay for gas.

#### Stage 1: Create an unsigned transaction in the Online app

1. In the Online app, you can start a send in either of two ways:
   - Tap Send at the bottom of the home screen, then choose paper wallet A or scan its public address QR.
   - Tap paper wallet A on the home screen to expand it, then tap Send.
2. Under Asset, choose MOVN.
3. Paste the recipient address, or tap QR and scan the recipient address QR.
4. Enter the amount of MOVN to send.
5. Tap Create transaction.
6. The unsigned transaction QR appears, with the transaction details listed below it: from address, to address, amount, max network fee, and so on.

#### Stage 2: Scan the transaction into the Offline app and sign it

1. In the Offline app, tap Load transaction. When the camera opens, scan the transaction QR on the Online app screen.
2. Check that the transaction details the Offline app shows are correct, then tap Sign transaction.
3. Scan paper wallet A's private key QR with the camera.
4. The signed transaction QR appears.

#### Stage 3: Scan the signed transaction into the Online app and broadcast it

1. In the Online app, tap Load signed transaction and scan the QR the Offline app generated.
2. Review the transaction details and tap Broadcast transaction.
3. Once the broadcast succeeds, the transaction ID appears on the screen. You can use it to check the result on a block explorer such as BscScan.

**Notes**

- You can also use the Online app on its own as a watch-only wallet by adding public addresses.
- The Online app does not create a transaction whose from and to addresses are the same.
- For BTC/BMB, if the wallet holds UTXOs received in batch transactions such as mining pool payouts, scanning the whole transaction QR can take a long time.
- BTC/BMB change goes back to the sending paper wallet's address.

## 4. Precautions

- Keep every external connection on the Offline app device cut off, and do not install any other app on it.
- Even if you followed the Offline app setup exactly, if the device has connected to anything even once since installation, it is safest to treat every paper wallet scanned on it as having a leaked private key.
- While scanning a private key QR, make sure no one else, and no camera such as CCTV, can see the screen or the paper wallet.
- Do not keep BTC and BMB at the same address. Assets on the unintended chain could be sent, and the Offline app cannot check this for you.
- Never scan a private key QR with the Online app. The Online app does not need private keys.
