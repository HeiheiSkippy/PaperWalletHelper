package io.github.heiheiskippy.paperwallethelper

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AppPackage : BaseReactPackage() {

  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    when (name) {
      SettingsStoreModule.NAME -> SettingsStoreModule(reactContext)
      AppLockModule.NAME -> AppLockModule(reactContext)
      CopyTextModule.NAME -> CopyTextModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      SettingsStoreModule.NAME to turboModuleInfo(SettingsStoreModule.NAME),
      AppLockModule.NAME to turboModuleInfo(AppLockModule.NAME),
      CopyTextModule.NAME to turboModuleInfo(CopyTextModule.NAME),
    )
  }

  override fun createViewManagers(reactContext: ReactApplicationContext) =
    listOf(QrScannerViewManager())

  private fun turboModuleInfo(name: String) =
    ReactModuleInfo(
      name,
      name,
      false, // canOverrideExistingModule
      false, // needsEagerInit
      false, // isCxxModule
      true, // isTurboModule
    )
}
