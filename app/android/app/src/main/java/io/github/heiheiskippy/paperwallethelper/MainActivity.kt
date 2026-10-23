package io.github.heiheiskippy.paperwallethelper

import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.EditText
import android.widget.Toast
import kotlin.system.exitProcess
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE,
    )
    // Hides other apps' overlay windows while this app is in front (API 31+).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      window.setHideOverlayWindows(true)
    }
    super.onCreate(savedInstanceState)
  }

  // A private key read from a QR must not outlive the screen it was read on.
  // The online app holds no keys and keeps its unsigned transaction, so it
  // only locks again.
  override fun onStop() {
    super.onStop()

    if (isChangingConfigurations || AppLockModule.prompting) return

    if (BuildConfig.FLAVOR != "signer") {
      AppLockModule.relock = true
      return
    }
    finishAndRemoveTask()
    exitProcess(0)
  }

  override fun getMainComponentName(): String = "PaperWalletHelper"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private var lastTapjackToastAt = 0L

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    val fullyObscured = (ev.flags and MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0
    val partlyObscured = (ev.flags and MotionEvent.FLAG_WINDOW_IS_PARTIALLY_OBSCURED) != 0

    // The system keyboard is a window of its own and can raise the partial
    // flag, so partial obscuring is accepted only while a text field holds
    // focus. Full obscuring is refused everywhere.
    val obscured = fullyObscured || (partlyObscured && currentFocus !is EditText)

    if (obscured) {
      val now = SystemClock.elapsedRealtime()
      if (now - lastTapjackToastAt > TAPJACK_TOAST_INTERVAL_MS) {
        lastTapjackToastAt = now
        Toast.makeText(this, R.string.tapjacking_blocked, Toast.LENGTH_LONG).show()
      }
      return false
    }

    return super.dispatchTouchEvent(ev)
  }

  companion object {
    private const val TAPJACK_TOAST_INTERVAL_MS = 3000L
  }
}
