import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StepBar from '../components/StepBar';
import { QrCollector, QrError } from '../core/qr';
import { createClient } from '../core/rpc';
import { ThirdParty, licenseText } from '../licenses';
import { useNavigator } from '../navigation/useNavigator';
import ConsentScreen from '../screens/ConsentScreen';
import LanguageScreen from '../screens/LanguageScreen';
import LicenseTextScreen from '../screens/LicenseTextScreen';
import LicensesScreen from '../screens/LicensesScreen';
import LockScreen from '../screens/LockScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TitleScreen from '../screens/TitleScreen';
import { CONSENT_VERSION, Settings, loadStored, readSettings, saveSettings, settingsTampered } from '../settings';
import { appLock } from '../specs/NativeAppLock';
import { settingsStore } from '../specs/NativeSettingsStore';
import { Language, t } from '../strings';
import { BalanceBook, balanceFrom } from './Balances';
import { Holdings } from '../core/btc/mempool';
import FinalScreen from './FinalScreen';
import {
  ASSETS,
  Asset,
  FeeChoice,
  Net,
  Pending,
  Signed,
  balanceOf,
  broadcast,
  buildPending,
  errorCode,
  evmOutcome,
  feeChoices,
  readSigned,
} from './flow';
import HomeScreen from './HomeScreen';
import SendFormScreen, { Draft } from './SendFormScreen';
import SendFromScreen from './SendFromScreen';
import SentScreen from './SentScreen';
import TxQrScreen from './TxQrScreen';
import AssetScreen from './AssetScreen';
import WalletScreen from './WalletScreen';
import ReceiveScreen from './ReceiveScreen';
import { Wallet, moveWallet, readWalletQr, readWallets } from './wallets';

const APP_NAME = 'PaperWallet Helper Online';

type Screen =
  | 'title'
  | 'language'
  | 'consent'
  | 'lock'
  | 'home'
  | 'scanWallet'
  | 'addWallet'
  | 'editWallet'
  | 'receive'
  | 'asset'
  | 'sendFrom'
  | 'scanFrom'
  | 'sendForm'
  | 'scanTo'
  | 'txQr'
  | 'scanSigned'
  | 'final'
  | 'sent'
  | 'settings'
  | 'settingsLanguage'
  | 'consentReview'
  | 'licenses'
  | 'licenseText';

const BEFORE_UNLOCK: Screen[] = ['title', 'language', 'consent', 'lock'];

function firstScreen(settings: Settings): Screen {
  if (settings.language === null) {
    return 'language';
  }
  return settings.consentVersion === CONSENT_VERSION ? 'lock' : 'consent';
}

function firstAsset(wallet: Wallet): Asset {
  return ASSETS[wallet.kind][0];
}

function errorText(language: Language, e: unknown): string {
  const code = errorCode(e);
  const text = t(language, `bc.err.${code}`);
  const detail = ['rejected', 'node', 'will-fail', 'network', 'server'].includes(code);
  return detail ? `${text}\n${String((e as Error).message).slice(0, 200)}` : text;
}

export default function BroadcasterApp() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BroadcasterContent />
    </SafeAreaProvider>
  );
}

function BroadcasterContent() {
  const [stored] = useState(loadStored);
  const [settings, setSettings] = useState<Settings>(() => readSettings(stored));
  const [wallets, setWallets] = useState<Wallet[]>(() => readWallets(stored));
  const [tampered] = useState(settingsTampered);
  const nav = useNavigator<Screen>('title');
  const language: Language = settings.language ?? 'ko';
  const net: Net = useMemo(() => ({ fetcher: fetch, client: createClient() }), []);

  const [book, setBook] = useState<BalanceBook>({});
  const [refreshing, setRefreshing] = useState(false);
  const [candidate, setCandidate] = useState<Wallet | null>(null);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [receiving, setReceiving] = useState<Wallet | null>(null);
  const [viewing, setViewing] = useState<{ wallet: Wallet; asset: Asset } | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [from, setFrom] = useState<Wallet | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fees, setFees] = useState<Partial<Record<Asset, FeeChoice | 'loading' | 'failed'>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [signed, setSigned] = useState<Signed | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [progress, setProgress] = useState<{ got: number; total: number } | null>(null);
  const collector = useRef(new QrCollector());
  const [license, setLicense] = useState<{ title: string; text: string } | null>(null);

  const checkSent = useMemo(() => {
    const loaded = pending?.loaded;
    if (loaded?.kind !== 'evm' || txid === null) {
      return undefined;
    }
    return () => evmOutcome(net, txid, loaded.view.gasLimit);
  }, [net, pending, txid]);

  const save = useCallback((nextSettings: Settings, nextWallets: Wallet[]) => {
    saveSettings(nextSettings, { wallets: nextWallets });
    setSettings(nextSettings);
    setWallets(nextWallets);
  }, []);

  const current = useRef(nav.current);
  current.current = nav.current;
  const resumed = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && appLock().relockNeeded() && !BEFORE_UNLOCK.includes(current.current)) {
        resumed.current = true;
        nav.push('lock');
      }
    });
    return () => sub.remove();
  }, [nav]);

  const loadBalances = useCallback(
    async (list: Wallet[]) => {
      const jobs = list.flatMap(w =>
        ASSETS[w.kind].map(async asset => {
          setBook(b => ({ ...b, [w.address]: { ...b[w.address], [asset]: { status: 'loading' } } }));
          try {
            const held = await balanceOf(net, w, asset);
            setBook(b => ({ ...b, [w.address]: { ...b[w.address], [asset]: balanceFrom(held) } }));
          } catch {
            setBook(b => ({ ...b, [w.address]: { ...b[w.address], [asset]: { status: 'failed' } } }));
          }
        }),
      );
      await Promise.all(jobs);
    },
    [net],
  );

  const setAssetBalance = useCallback(
    (held: Holdings) => {
      if (viewing !== null) {
        const { wallet, asset } = viewing;
        setBook(b => ({ ...b, [wallet.address]: { ...b[wallet.address], [asset]: balanceFrom(held) } }));
      }
    },
    [viewing],
  );

  const refreshAll = useCallback(() => {
    setRefreshing(true);
    loadBalances(wallets).finally(() => setRefreshing(false));
  }, [loadBalances, wallets]);

  const loadFees = useCallback(
    (asset: Asset) => {
      if (asset !== 'BTC' && asset !== 'BMB') {
        return;
      }
      setFees(f => ({ ...f, [asset]: 'loading' }));
      feeChoices(net, asset)
        .then(choice => setFees(f => ({ ...f, [asset]: choice })))
        .catch(() => setFees(f => ({ ...f, [asset]: 'failed' })));
    },
    [net],
  );

  const goHome = useCallback(() => {
    nav.reset('home');
    loadBalances(wallets);
  }, [nav, loadBalances, wallets]);

  const startSend = useCallback(
    (wallet: Wallet | null, preset?: Asset) => {
      setError(null);
      if (wallet === null) {
        nav.push('sendFrom');
        return;
      }
      setFrom(wallet);
      const asset = preset ?? firstAsset(wallet);
      setDraft({ asset, to: '', amount: '', all: false, speed: 'normal' });
      if (book[wallet.address]?.[asset] === undefined) {
        loadBalances([wallet]);
      }
      loadFees(asset);
      nav.push('sendForm');
    },
    [book, loadBalances, loadFees, nav],
  );

  const onWalletQr = useCallback(
    (text: string, next: 'addWallet' | 'sendForm'): string | null => {
      const read = readWalletQr(text);
      if (!read.ok) {
        return t(language, `bc.addr.err.${read.code}`);
      }
      const known = wallets.find(w => w.address === read.address);
      if (next === 'sendForm') {
        nav.pop();
        nav.pop();
        startSend(known ?? { kind: read.kind, address: read.address, name: t(language, 'bc.from.scanned'), memo: '' });
        return null;
      }
      setCandidate({
        kind: read.kind,
        address: read.address,
        name: t(language, 'bc.add.defaultName', { n: String(wallets.length + 1) }),
        memo: '',
      });
      nav.push('addWallet');
      return null;
    },
    [language, nav, startSend, wallets],
  );

  const onBuild = useCallback(async () => {
    if (from === null || draft === null) {
      return;
    }
    const choice = fees[draft.asset];
    setBusy(true);
    setError(null);
    try {
      const built = await buildPending(net, {
        wallet: from,
        asset: draft.asset,
        to: draft.to,
        amount: draft.all ? 'all' : draft.amount,
        feeRate: typeof choice === 'object' ? choice[draft.speed] : undefined,
      });
      setPending(built);
      nav.push('txQr');
    } catch (e) {
      setError(errorText(language, e));
    } finally {
      setBusy(false);
    }
  }, [draft, fees, from, language, nav, net]);

  const startScanSigned = useCallback(() => {
    collector.current.reset();
    setProgress(null);
    setError(null);
    nav.push('scanSigned');
  }, [nav]);

  const onSignedPart = useCallback(
    (text: string): string | null | undefined => {
      if (pending === null) {
        return null;
      }
      let state;
      try {
        state = collector.current.receive(text);
      } catch (e) {
        collector.current.reset();
        setProgress(null);
        if (e instanceof QrError) {
          return t(language, e.code === 'broken' ? 'bc.err.broken' : 'bc.err.not-signed-qr');
        }
        throw e;
      }
      if (!state.done) {
        setProgress(state.total ? { got: state.got, total: state.total } : null);
        return undefined;
      }
      try {
        setSigned(readSigned(pending, state.payload));
      } catch (e) {
        collector.current.reset();
        setProgress(null);
        return errorText(language, e);
      }
      nav.push('final');
      return null;
    },
    [language, nav, pending],
  );

  const onBroadcast = useCallback(async () => {
    if (signed === null) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const sent = await broadcast(
        net,
        signed,
        () => setNotice(t(language, 'bc.final.slow')),
        outcome => {
          if (current.current !== 'final') {
            return;
          }
          setUnknown(false);
          setNotice(null);
          if (outcome === 'sent') {
            setTxid(signed.kind === 'btc' ? signed.txid : signed.hash);
            nav.reset('sent');
          } else {
            setError(errorText(language, outcome));
          }
        },
      );
      if (sent.result === 'sent') {
        setTxid(sent.txid);
        nav.reset('sent');
      } else {
        setNotice(t(language, 'bc.final.unknown'));
        setUnknown(true);
      }
    } catch (e) {
      setNotice(null);
      setError(errorText(language, e));
    } finally {
      setBusy(false);
    }
  }, [language, nav, net, signed]);

  const screen = nav.current;

  const leaveQr = useCallback(() => {
    Alert.alert(t(language, 'bc.qr.leaveTitle'), undefined, [
      { text: t(language, 'bc.qr.leaveNo'), style: 'cancel' },
      { text: t(language, 'bc.qr.leaveYes'), style: 'destructive', onPress: goHome },
    ]);
  }, [goHome, language]);
  const { setBackAction } = nav;
  useEffect(() => {
    setBackAction(screen === 'txQr' ? leaveQr : null);
  }, [leaveQr, screen, setBackAction]);

  useEffect(() => {
    if (screen === 'sendForm' || screen === 'home') {
      setPending(null);
      setSigned(null);
      setNotice(null);
      setUnknown(false);
    }
  }, [screen]);

  const steps = (at: number) => (
    <StepBar steps={[t(language, 'bc.step.build'), t(language, 'bc.step.sign'), t(language, 'bc.step.send')]} at={at} />
  );

  switch (nav.current) {
    case 'title':
      return (
        <TitleScreen
          appName={APP_NAME}
          logo={require('../assets/title-online.png')}
          onDone={() => nav.reset(firstScreen(settings))}
        />
      );
    case 'language':
      return (
        <LanguageScreen
          language={language}
          onSelect={code => setSettings({ ...settings, language: code })}
          onNext={() => {
            save({ ...settings, language }, wallets);
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
            save({ ...settings, language, consentVersion: CONSENT_VERSION }, wallets);
            nav.reset('lock');
          }}
        />
      );
    case 'lock':
      return (
        <LockScreen
          appName={APP_NAME}
          language={language}
          onUnlocked={() => {
            if (resumed.current) {
              resumed.current = false;
              nav.pop();
            } else {
              goHome();
            }
          }}
        />
      );
    case 'home':
      return (
        <HomeScreen
          language={language}
          tampered={tampered}
          wallets={wallets}
          book={book}
          refreshing={refreshing}
          onRefresh={refreshAll}
          expanded={expanded}
          onAdd={() => nav.push('scanWallet')}
          onToggle={w => {
            const opening = !expanded.has(w.address);
            setExpanded(was => {
              const next = new Set(was);
              if (!next.delete(w.address)) {
                next.add(w.address);
              }
              return next;
            });
            if (opening) {
              loadBalances([w]);
            }
          }}
          onReload={w => loadBalances([w])}
          onEdit={w => {
            setEditing(w);
            nav.push('editWallet');
          }}
          onAsset={(w, asset) => {
            setViewing({ wallet: w, asset });
            nav.push('asset');
          }}
          onReceive={w => {
            setReceiving(w);
            nav.push('receive');
          }}
          onSendFrom={w => startSend(w)}
          onMove={(i, step) => save(settings, moveWallet(wallets, i, step))}
          onSend={() => startSend(null)}
          onSettings={() => nav.push('settings')}
        />
      );
    case 'scanWallet':
    case 'scanFrom':
      return (
        <ScanScreen
          language={language}
          title={t(language, 'bc.scanWallet.title')}
          hint={t(language, 'bc.scanWallet.hint')}
          above={nav.current === 'scanFrom' ? steps(0) : undefined}
          onBack={nav.pop}
          onValue={text => onWalletQr(text, nav.current === 'scanFrom' ? 'sendForm' : 'addWallet')}
        />
      );
    case 'addWallet':
      return candidate === null ? null : (
        <WalletScreen
          language={language}
          mode="add"
          wallet={candidate}
          exists={wallets.some(w => w.address === candidate.address)}
          onBack={() => nav.reset('home')}
          onSave={w => {
            const next = [...wallets, w];
            save(settings, next);
            nav.reset('home');
            loadBalances([w]);
          }}
        />
      );
    case 'editWallet':
      return editing === null ? null : (
        <WalletScreen
          language={language}
          mode="edit"
          wallet={editing}
          onBack={nav.pop}
          onSave={edited => {
            save(
              settings,
              wallets.map(w => (w.address === edited.address ? edited : w)),
            );
            nav.pop();
          }}
          onRemove={() => {
            save(
              settings,
              wallets.filter(w => w.address !== editing.address),
            );
            nav.pop();
          }}
        />
      );
    case 'receive':
      return receiving === null ? null : <ReceiveScreen language={language} wallet={receiving} onBack={nav.pop} />;
    case 'asset':
      return viewing === null ? null : (
        <AssetScreen
          language={language}
          net={net}
          wallet={viewing.wallet}
          asset={viewing.asset}
          balance={book[viewing.wallet.address]?.[viewing.asset]}
          onBalance={setAssetBalance}
          onBack={nav.pop}
          onSend={() => startSend(viewing.wallet, viewing.asset)}
        />
      );
    case 'sendFrom':
      return (
        <SendFromScreen
          language={language}
          wallets={wallets}
          steps={steps(0)}
          onBack={nav.pop}
          onPick={w => {
            nav.pop();
            startSend(w);
          }}
          onScan={() => nav.push('scanFrom')}
        />
      );
    case 'sendForm':
      return from === null || draft === null ? null : (
        <SendFormScreen
          language={language}
          wallet={from}
          draft={draft}
          balance={book[from.address]?.[draft.asset]}
          fees={fees[draft.asset] ?? 'loading'}
          busy={busy}
          error={error}
          steps={steps(0)}
          onDraft={next => {
            if (next.asset !== draft.asset) {
              loadFees(next.asset);
              if (book[from.address]?.[next.asset] === undefined) {
                loadBalances([from]);
              }
            }
            setError(null);
            setDraft(next);
          }}
          onBack={nav.pop}
          onChangeFrom={() => {
            nav.pop();
            startSend(null);
          }}
          onScanTo={() => nav.push('scanTo')}
          onBuild={onBuild}
        />
      );
    case 'scanTo':
      return (
        <ScanScreen
          language={language}
          title={t(language, 'bc.scanTo.title')}
          hint={t(language, 'bc.scanTo.hint')}
          above={steps(0)}
          onBack={nav.pop}
          onValue={text => {
            const read = readWalletQr(text);
            if (!read.ok || from === null || draft === null || read.kind !== from.kind) {
              return t(language, read.ok || read.code !== 'private-key' ? 'bc.scanTo.err' : 'bc.addr.err.private-key');
            }
            setDraft({ ...draft, to: read.address });
            nav.pop();
            return null;
          }}
        />
      );
    case 'txQr':
      return pending === null ? null : (
        <TxQrScreen
          language={language}
          pending={pending}
          steps={steps(1)}
          onBack={leaveQr}
          onLoadSigned={startScanSigned}
        />
      );
    case 'scanSigned':
      return (
        <ScanScreen
          language={language}
          title={t(language, 'bc.scanSigned.title')}
          hint={t(language, 'bc.scanSigned.hint')}
          above={steps(1)}
          progress={progress}
          onBack={nav.pop}
          onValue={onSignedPart}
        />
      );
    case 'final':
      return pending === null ? null : (
        <FinalScreen
          language={language}
          pending={pending}
          steps={steps(2)}
          busy={busy}
          error={error}
          notice={notice}
          unknown={unknown}
          onBack={() => nav.popTo('txQr')}
          onSend={onBroadcast}
          onClose={goHome}
        />
      );
    case 'sent':
      return pending === null || txid === null ? null : (
        <SentScreen
          language={language}
          loaded={pending.loaded}
          txid={txid}
          check={checkSent}
          onClose={() => {
            setPending(null);
            setSigned(null);
            setTxid(null);
            goHome();
          }}
        />
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
          onSelect={code => save({ ...settings, language: code }, wallets)}
          onBack={nav.pop}
        />
      );
  }
}
