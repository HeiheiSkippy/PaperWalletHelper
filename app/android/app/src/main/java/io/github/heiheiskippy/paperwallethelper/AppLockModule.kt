package io.github.heiheiskippy.paperwallethelper

import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import io.github.heiheiskippy.paperwallethelper.specs.NativeAppLockSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class AppLockModule(reactContext: ReactApplicationContext) : NativeAppLockSpec(reactContext) {

  override fun getName(): String = NAME

  override fun isDeviceSecure(): Boolean {
    val keyguard = reactApplicationContext.getSystemService(KeyguardManager::class.java)
    return keyguard != null && keyguard.isDeviceSecure
  }

  override fun openSecuritySettings() {
    val activity = currentActivity ?: return
    val security = Intent(Settings.ACTION_SECURITY_SETTINGS)
    val fallback = Intent(Settings.ACTION_SETTINGS)
    val intent =
      if (security.resolveActivity(activity.packageManager) != null) security else fallback

    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    activity.startActivity(intent)
  }

  override fun relockNeeded(): Boolean {
    val needed = relock
    relock = false
    return needed
  }

  override fun unlock(title: String, promise: Promise) {
    val activity = currentActivity as? FragmentActivity
    if (activity == null) {
      promise.reject(ERR_FAILED, "no activity")
      return
    }

    activity.runOnUiThread {
      val prompt =
        BiometricPrompt(
          activity,
          ContextCompat.getMainExecutor(activity),
          object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
              prompting = false
              promise.resolve(null)
            }

            override fun onAuthenticationError(code: Int, message: CharSequence) {
              prompting = false
              val cancelled =
                code == BiometricPrompt.ERROR_USER_CANCELED ||
                  code == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                  code == BiometricPrompt.ERROR_CANCELED
              promise.reject(if (cancelled) ERR_CANCELLED else ERR_FAILED, message.toString())
            }

            override fun onAuthenticationFailed() = Unit
          },
        )

      val info =
        BiometricPrompt.PromptInfo.Builder()
          .setTitle(title)
          .setAllowedAuthenticators(authenticators())
          .build()

      prompting = true
      prompt.authenticate(info)
    }
  }

  // BIOMETRIC_STRONG with DEVICE_CREDENTIAL is unsupported before Android 11;
  // there the library takes weak biometrics with the device PIN instead.
  private fun authenticators(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      BiometricManager.Authenticators.BIOMETRIC_STRONG or
        BiometricManager.Authenticators.DEVICE_CREDENTIAL
    } else {
      BiometricManager.Authenticators.BIOMETRIC_WEAK or
        BiometricManager.Authenticators.DEVICE_CREDENTIAL
    }

  companion object {
    const val NAME = "AppLock"

    // Before Android 11 the device PIN is asked in a separate system
    // activity, which stops ours; MainActivity must not exit for that.
    @Volatile var prompting = false

    // Set when the online app went to the background; read once by JS.
    @Volatile var relock = false

    private const val ERR_CANCELLED = "cancelled"
    private const val ERR_FAILED = "failed"
  }
}
