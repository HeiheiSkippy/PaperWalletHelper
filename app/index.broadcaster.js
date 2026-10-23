import { Buffer } from 'buffer';
import { AppRegistry } from 'react-native';

// @ngraveio/bc-ur reaches for the Node Buffer global, which Hermes lacks.
global.Buffer = global.Buffer || Buffer;
import BroadcasterApp from './src/broadcaster/BroadcasterApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => BroadcasterApp);
