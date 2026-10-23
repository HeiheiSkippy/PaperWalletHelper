import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import { codegenNativeComponent } from 'react-native';

type QrCodeEvent = {
  value: string;
};

export interface NativeProps extends ViewProps {
  active?: WithDefault<boolean, true>;
  onQrCode?: DirectEventHandler<QrCodeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'QrScannerView',
) as HostComponent<NativeProps>;
