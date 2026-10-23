# PaperWallet Helper

[English](README.md)

BTC·BMB와 EVM(BSC) 종이지갑을 에어갭 방식으로 쓰게 해 주는 안드로이드 앱 한 쌍입니다.
서명앱(PaperWallet Helper Offline)이 외부 연결을 끊은 기기에서 종이지갑의 개인키 QR로 거래에 서명하고,
전송앱(PaperWallet Helper Online)이 평소 쓰는 폰에서 잔액 조회, 거래 만들기, 전송을 합니다. 개인키는 어느
기기에도 저장되지 않습니다.

개인이 만든 비공식 도구이며 보안 감사를 받지 않았습니다.

## 주요 기능

- 서명앱에는 네트워크 권한이 없습니다.
- 서명앱은 서명할 때만 개인키 QR을 읽고 기기에 저장하지 않습니다. 서명을 마치면 개인키 값을 0으로 덮어쓰지만,
  자바스크립트 특성상 앱이 완전히 종료되어야 메모리가 비워지므로, 서명앱은 화면에서 내려가는 순간 종료되도록
  했습니다.
- 서명앱은 전송앱이 만든 거래를 다음과 같이 검증합니다.
  - BTC·BMB: 입력이 모두 발신 주소의 UTXO인지, 잔돈이 발신 주소로 돌아오는지, 수수료율이 상한을 넘지
    않는지, SIGHASH_ALL인지 확인합니다.
  - BSC: BNB 송금과 WBMB·MOVN·USDT 송금만 서명하고, 가스 가격 상한(1 gwei)과 가스 한도 범위를 확인합니다.
- 전송앱은 BSC 거래를 만들기 전에 노드에 실행 결과를 미리 확인하고, 실패한다는 답이 오면 거래를 만들지
  않습니다. 전송한 뒤에는 거래가 블록에 포함됐는지 알려 줍니다.
- 두 앱은 열 때마다 기기의 화면 잠금을 요구해 타인의 접근을 막습니다.
- 화면 캡처와 녹화가 차단되고, 다른 앱이 화면을 덮은 상태에서는 터치를 받지 않습니다.

## 지원 범위

- 서명은 종이지갑의 개인키 QR로만 합니다. 니모닉 QR로는 서명할 수 없습니다.
- BTC·BMB 종이지갑: 레거시(1로 시작)와 네이티브 세그윗(bc1q로 시작) 주소의 BTC, BMB(BTCMobick)
- EVM(BSC) 종이지갑: BNB, WBMB, MOVN, USDT
- 토큰 교환 기능은 없습니다.

## 받는 곳

두 앱은 이 저장소의 [릴리스](https://github.com/HeiheiSkippy/PaperWalletHelper/releases)에서만 배포합니다.
다른 경로로 전달받은 APK는 변조의 위험이 있습니다.

릴리스에는 빌드에 사용한 커밋 해시를 함께 적습니다. 공식 APK의 서명 키 SHA-256 지문은 다음과 같습니다.

```
E1:0E:AE:85:9D:30:CA:63:57:E4:85:FD:74:4D:18:1D:B1:A9:3C:DD:3C:EF:05:9E:D6:8C:93:78:DA:D0:7B:0E
```

## 사용 방법

에어갭으로 서명하는 자세한 방법은 다음 문서를 참고해 주세요.

[사용 방법](USAGE.ko.md)

## 소스 검토

개인키를 다루고 거래를 검사하는 코드는 다음과 같습니다.

| 파일 | 하는 일 |
|---|---|
| `app/src/signer/flow.ts` | 서명앱의 흐름: 거래 QR 읽기, 검사, 개인키 확인, 서명, 개인키 지우기 |
| `app/src/core/btc/key.ts` | BTC·BMB 개인키(WIF) QR 읽기와 주소 계산 |
| `app/src/core/btc/psbt.ts` | BTC·BMB 거래(PSBT) 읽기와 서명 전 검사 |
| `app/src/core/btc/sign.ts` | BTC·BMB 거래 서명 |
| `app/src/core/key.ts` | EVM 개인키 QR 읽기와 주소 계산 |
| `app/src/core/evm/send.ts` | 서명할 수 있는 BSC 거래 판정(BNB 송금, WBMB·MOVN·USDT 송금) |
| `app/src/core/evm/sign.ts` | BSC 거래 서명 |
| `app/src/core/chain.ts` | 체인 ID, 토큰 계약 주소, 가스 가격 상한 |
| `app/src/core/qr.ts` | 두 앱 사이의 QR 형식(BC-UR) |
| `app/android/app/src/signer/AndroidManifest.xml` | 서명앱의 네트워크 권한 제거 |
| `app/android/app/src/main/java/io/github/heiheiskippy/paperwallethelper/MainActivity.kt` | 화면 캡처 차단, 덮인 화면의 터치 차단, 서명앱이 내려가면 종료 |

## 소스에서 직접 빌드하는 방법

저장소의 `Dockerfile`로 만든 리눅스 컨테이너에서 빌드합니다. 도커만 있으면 되고, 나머지 도구는 `Dockerfile`에
적힌 버전으로 컨테이너 안에 설치됩니다.

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

APK는 `out/`에 생성되며 저장소에 있는 시험용 키로 서명됩니다. 윈도우에서는 `$PWD` 자리에 저장소의 전체 경로를
씁니다.

`-PrnEntry`는 앱마다 들어갈 시작 파일을 정합니다. 서명앱을 다른 시작 파일로 빌드하면 빌드가 일부러 실패합니다.

직접 쓰려고 빌드할 때는 컨테이너 밖에서 빌드해도 되지만, 그렇게 만든 APK는 배포본과 바이트까지 같지는 않습니다.

## 배포본이 소스와 일치하는지 확인하는 방법

공식 APK도 위의 컨테이너에서 빌드합니다. 릴리스에 적힌 커밋을 받아(`git checkout <커밋 해시>`) 위 명령 그대로
빌드하면, 배포본과 서명만 다른 APK가 생성됩니다. 네이티브 라이브러리에 빌드 경로가 들어가므로 컨테이너 안의
경로(`/work/PaperWalletHelper`)는 바꾸지 않습니다.

비교는 서명 파일(`META-INF/MANIFEST.MF`, `META-INF/*.SF`, `*.RSA`, `*.DSA`, `*.EC`)을 뺀 압축 항목을 대조하거나
diffoscope 같은 도구로 합니다.

## 라이선스

이 앱은 소스를 공개하지만, MIT 같은 오픈소스 라이선스는 두지 않습니다. 누구나 APK를 다시 배포할 수 있으면 이 앱을 여러 곳에서 받는 것이 당연해지고, 그 사이에 변조된 APK가 끼어들 수 있기 때문입니다.

소스는 다음의 목적으로 빌드해 쓸 수 있습니다.

- 개인적으로 쓰기 위한 빌드
- 공식 APK와 같은지 확인하기 위한 빌드

앱에 쓰인 라이브러리는 각각의 라이선스를 따르며, 고지는 앱의 설정 → 앱 정보 → 라이선스에 있습니다.

전문은 [LICENSE](LICENSE)에 있습니다.

## Buy me a coffee

If this app kept your keys offline and your mind at ease, feel free to buy me a coffee. ☕

`0xea66EA4787d0D8Ec7264651808e82F871aB30279` (BSC: WBMB, MOVN)
