package io.github.heiheiskippy.paperwallethelper

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import io.github.heiheiskippy.paperwallethelper.specs.NativeCopyTextSpec
import com.facebook.react.bridge.ReactApplicationContext

class CopyTextModule(reactContext: ReactApplicationContext) : NativeCopyTextSpec(reactContext) {

  override fun getName(): String = NAME

  override fun copy(text: String) {
    val manager = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    manager.setPrimaryClip(ClipData.newPlainText(null, text))
  }

  companion object {
    const val NAME = "CopyText"
  }
}
