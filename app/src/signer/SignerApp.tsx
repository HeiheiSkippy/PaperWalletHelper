import React, { useCallback, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StepBar from '../components/StepBar';
import { QrCollector, QrError } from '../core/qr';
import { useNavigator } from '../navigation/useNavigator';
import { ThirdParty, licenseText } from '../licenses';
import ConsentScreen from '../screens/ConsentScreen';
import LanguageScreen from '../screens/LanguageScreen';
import LicenseTextScreen from '../screens/LicenseTextScreen';
import LicensesScreen from '../screens/LicensesScreen';
import LockScreen from '../screens/LockScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TitleScreen from '../screens/TitleScreen';
import { CONSENT_VERSION, Settings, loadSettings, saveSettings, settingsTampered } from '../settings';
import { settingsStore } from '../specs/NativeSettingsStore';
import { Language, t } from '../strings';
import { Loaded } from '../tx';
import { load, signLoaded } from './flow';
import HomeScreen from './HomeScreen';
import ResultScreen from './ResultScreen';
import ReviewScreen from './ReviewScreen';
import TxSummary from '../components/TxSummary';

const APP_NAME = 'PaperWallet Helper Offline';

type Screen =
  | 'title'
  | 'language'
  | 'consent'
  | 'lock'
  | 'home'
  | 'scanTx'
  | 'review'
  | 'scanKey'
  | 'result'
  | 'settings'
  | 'settingsLanguage'
  | 'consentReview'
  | 'licenses'
  | 'licenseText';

function firstScreen(settings: Settings): Screen {
  if (settings.language === null) {
    return 'language';
  }
  return settings.consentVersion === CONSENT_VERSION ? 'lock' : 'consent';
}

export default function SignerApp() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SignerContent />
    </SafeAreaProvider>
  );
}

function SignerContent() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [tampered] = useState(settingsTampered);
  const nav = useNavigator<Screen>('title');
  const language: Language = settings.language ?? 'ko';

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [parts, setParts] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ got: number; total: number } | null>(null);
  const collector = useRef(new QrCollector());
  const [license, setLicense] = useState<{ title: string; text: string } | null>(null);

  const update = useCallback((next: Settings) => {
    saveSettings(next);
    setSettings(next);
  }, []);

  const startScan = useCallback(() => {
    collector.current.reset();
    setProgress(null);
    nav.push('scanTx');
  }, [nav]);

  const onTxPart = useCallback(
    (text: string): string | null | undefined => {
      let state;
      try {
        state = collector.current.receive(text);
      } catch (e) {
        collector.current.reset();
        setProgress(null);
        if (e instanceof QrError) {
          return t(language, `signer.scanTx.err.${e.code}`);
        }
        throw e;
      }
      if (!state.done) {
        setProgress(state.total ? { got: state.got, total: state.total } : null);
        return undefined;
      }
      const result = load(state.payload);
      if (!result.ok) {
        collector.current.reset();
        setProgress(null);
        return result.code === 'signed-qr'
          ? t(language, 'signer.scanTx.err.signed-qr')
          : t(language, `signer.err.${result.code}`);
      }
      setLoaded(result.loaded);
      nav.push('review');
      return null;
    },
    [language, nav],
  );

  const onKey = useCallback(
    (text: string): string | null => {
      if (loaded === null) {
        return null;
      }
      const result = signLoaded(loaded, text);
      if (!result.ok) {
        return t(language, `signer.err.${result.code}`);
      }
      setParts(result.parts);
      nav.push('result');
      return null;
    },
    [language, loaded, nav],
  );

  const backHome = useCallback(() => {
    setLoaded(null);
    setParts([]);
    nav.reset('home');
  }, [nav]);

  const steps = [t(language, 'signer.step.tx'), t(language, 'signer.step.review'), t(language, 'signer.step.sign')];

  switch (nav.current) {
    case 'title':
      return (
        <TitleScreen
          appName={APP_NAME}
          logo={require('../assets/title-offline.png')}
          onDone={() => nav.reset(firstScreen(settings))}
        />
      );
    case 'language':
      return (
        <LanguageScreen
          language={language}
          onSelect={code => setSettings({ ...settings, language: code })}
          onNext={() => {
            update({ ...settings, language });
            nav.reset('consent');
          }}
        />
      );
    case 'consent':
      return (
        <ConsentScreen
          appName={APP_NAME}
          language={language}
          onDone={() => {
            update({ ...settings, language, consentVersion: CONSENT_VERSION });
            nav.reset('lock');
          }}
        />
      );
    case 'lock':
      return <LockScreen appName={APP_NAME} language={language} onUnlocked={() => nav.reset('home')} />;
    case 'home':
      return (
        <HomeScreen
          language={language}
          tampered={tampered}
          onLoad={startScan}
          onSettings={() => nav.push('settings')}
        />
      );
    case 'scanTx':
      return (
        <ScanScreen
          language={language}
          title={t(language, 'signer.scanTx.title')}
          hint={t(language, 'signer.scanTx.hint')}
          above={<StepBar steps={steps} at={0} />}
          progress={progress}
          onBack={nav.pop}
          onValue={onTxPart}
        />
      );
    case 'review':
      return loaded === null ? null : (
        <ReviewScreen
          language={language}
          loaded={loaded}
          steps={<StepBar steps={steps} at={1} />}
          onBack={backHome}
          onSign={() => nav.push('scanKey')}
        />
      );
    case 'scanKey':
      return (
        <ScanScreen
          language={language}
          title={t(language, 'signer.scanKey.title')}
          hint={t(language, 'signer.scanKey.hint')}
          above={<StepBar steps={steps} at={2} />}
          below={
            loaded !== null && (
              <TxSummary language={language} loaded={loaded} title={t(language, 'signer.summary.title')} />
            )
          }
          onBack={nav.pop}
          onValue={onKey}
        />
      );
    case 'result':
      return loaded === null ? null : (
        <ResultScreen language={language} loaded={loaded} parts={parts} onClose={backHome} />
      );
    case 'settings':
      return (
        <SettingsScreen
          language={language}
          version={settingsStore().getAppVersion()}
          onBack={nav.pop}
          onLanguage={() => nav.push('settingsLanguage')}
          onConsent={() => nav.push('consentReview')}
          onLicenses={() => nav.push('licenses')}
        />
      );
    case 'consentReview':
      return <ConsentScreen appName={APP_NAME} language={language} mode="review" onDone={nav.pop} />;
    case 'licenses':
      return (
        <LicensesScreen
          language={language}
          appName={APP_NAME}
          onBack={nav.pop}
          onApp={() => {
            setLicense({ title: APP_NAME, text: t(language, 'licenses.appNotice') });
            nav.push('licenseText');
          }}
          onItem={(item: ThirdParty) => {
            setLicense({ title: item.name, text: licenseText(item) });
            nav.push('licenseText');
          }}
        />
      );
    case 'licenseText':
      return license === null ? null : (
        <LicenseTextScreen language={language} title={license.title} text={license.text} onBack={nav.pop} />
      );
    case 'settingsLanguage':
      return (
        <LanguageScreen
          language={language}
          mode="settings"
          onSelect={code => update({ ...settings, language: code })}
          onBack={nav.pop}
        />
      );
  }
}
