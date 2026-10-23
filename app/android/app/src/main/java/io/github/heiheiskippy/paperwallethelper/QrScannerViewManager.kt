package io.github.heiheiskippy.paperwallethelper

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.QrScannerViewManagerDelegate
import com.facebook.react.viewmanagers.QrScannerViewManagerInterface

@ReactModule(name = QrScannerViewManager.NAME)
class QrScannerViewManager :
  SimpleViewManager<QrScannerView>(), QrScannerViewManagerInterface<QrScannerView> {

  private val delegate = QrScannerViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<QrScannerView> = delegate

  override fun getName() = NAME

  override fun createViewInstance(context: ThemedReactContext) = QrScannerView(context)

  override fun setActive(view: QrScannerView, value: Boolean) {
    view.setActive(value)
  }

  override fun onDropViewInstance(view: QrScannerView) {
    view.release()
    super.onDropViewInstance(view)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(QrCodeEvent.NAME to mutableMapOf("registeredEventName" to "onQrCode"))

  companion object {
    const val NAME = "QrScannerView"
  }
}
