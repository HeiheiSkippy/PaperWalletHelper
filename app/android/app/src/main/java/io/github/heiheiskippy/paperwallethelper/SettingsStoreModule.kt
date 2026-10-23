package io.github.heiheiskippy.paperwallethelper

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import io.github.heiheiskippy.paperwallethelper.specs.NativeSettingsStoreSpec
import com.facebook.react.bridge.ReactApplicationContext

// Settings carry an HMAC from a Keystore key that never leaves the device, so
// a file edited outside the app is detected and discarded on load.
class SettingsStoreModule(reactContext: ReactApplicationContext) :
  NativeSettingsStoreSpec(reactContext) {

  private val prefs by lazy {
    reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  private var wasTampered = false

  override fun getName(): String = NAME

  override fun load(): String {
    val value = prefs.getString(KEY_VALUE, null) ?: return ""
    val mac = prefs.getString(KEY_MAC, null)
    if (mac == null || !MessageDigest.isEqual(mac.toByteArray(), macOf(value).toByteArray())) {
      wasTampered = true
      prefs.edit().clear().apply()
      return ""
    }
    return value
  }

  override fun save(json: String) {
    prefs.edit().putString(KEY_VALUE, json).putString(KEY_MAC, macOf(json)).commit()
  }

  override fun tampered(): Boolean = wasTampered

  override fun getAppVersion(): String = BuildConfig.VERSION_NAME

  private fun macOf(value: String): String {
    val mac = Mac.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256)
    mac.init(key())
    return mac.doFinal(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
  }

  private fun key(): SecretKey {
    val store = KeyStore.getInstance(KEYSTORE)
    store.load(null)
    (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256, KEYSTORE)
    generator.init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_SIGN).build())
    return generator.generateKey()
  }

  companion object {
    const val NAME = "SettingsStore"

    private const val PREFS_NAME = "settings"
    private const val KEY_VALUE = "value"
    private const val KEY_MAC = "mac"
    private const val KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "settings-check"
  }
}
