package io.github.heiheiskippy.paperwallethelper

import android.os.Build
import android.util.Size
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

class QrScannerView(private val reactContext: ThemedReactContext) :
  FrameLayout(reactContext), LifecycleOwner {

  private val registry = LifecycleRegistry(this)
  override val lifecycle: Lifecycle
    get() = registry

  private val preview = PreviewView(reactContext)
  private val decoder = Executors.newSingleThreadExecutor()
  private val scanner =
    BarcodeScanning.getClient(
      BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
    )

  private var wanted = true
  private var attached = false
  private var opened = false
  private var layoutPending = false

  init {
    addView(preview)
    registry.currentState = Lifecycle.State.CREATED
  }

  fun setActive(value: Boolean) {
    wanted = value
    sync()
  }

  override fun requestLayout() {
    super.requestLayout()
    if (layoutPending) {
      return
    }
    layoutPending = true
    post {
      layoutPending = false
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
      layout(left, top, right, bottom)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attached = true
    sync()
  }

  override fun onDetachedFromWindow() {
    attached = false
    sync()
    super.onDetachedFromWindow()
  }

  fun release() {
    attached = false
    wanted = false
    sync()
    registry.currentState = Lifecycle.State.DESTROYED
    decoder.shutdown()
    scanner.close()
  }

  private fun sync() {
    val shouldRun = attached && wanted
    if (shouldRun == opened) {
      return
    }
    opened = shouldRun
    if (shouldRun) {
      open()
    } else {
      registry.currentState = Lifecycle.State.CREATED
    }
  }

  private fun open() {
    val future = ProcessCameraProvider.getInstance(reactContext)
    future.addListener(
      {
        val provider = future.get()
        val selector = CameraSelector.DEFAULT_BACK_CAMERA
        // The emulator camera restarts on every frame when the two streams differ in
        // size, so it gets one size for both. Real devices keep the defaults.
        val size =
          if (Build.HARDWARE == "ranchu" || Build.HARDWARE == "goldfish") {
            ResolutionSelector.Builder()
              .setResolutionStrategy(
                ResolutionStrategy(
                  Size(640, 480),
                  ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER,
                )
              )
              .build()
          } else {
            null
          }
        val stream =
          Preview.Builder()
            .apply { size?.let { setResolutionSelector(it) } }
            .build()
            .also { it.setSurfaceProvider(preview.surfaceProvider) }
        val analysis =
          ImageAnalysis.Builder()
            .setResolutionSelector(size ?: ANALYSIS_SIZE)
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
            .also { it.setAnalyzer(decoder, ::scan) }

        provider.unbindAll()
        registry.currentState = Lifecycle.State.RESUMED
        provider.bindToLifecycle(this, selector, stream, analysis)
      },
      ContextCompat.getMainExecutor(reactContext),
    )
  }

  // Only the square under the on-screen frame is decoded, in grey: a third of
  // the pixels, which a slow phone decodes far faster.
  private fun scan(image: ImageProxy) {
    val side = minOf(image.width, image.height) and 1.inv()
    val left = (image.width - side) / 2
    val top = (image.height - side) / 2
    val plane = image.planes[0]
    val nv21 = ByteArray(side * side * 3 / 2)
    for (row in 0 until side) {
      plane.buffer.position((top + row) * plane.rowStride + left)
      plane.buffer.get(nv21, row * side, side)
    }
    nv21.fill(128.toByte(), side * side)
    val rotation = image.imageInfo.rotationDegrees
    image.close()

    val task = scanner.process(InputImage.fromByteArray(nv21, side, side, rotation, InputImage.IMAGE_FORMAT_NV21))
    val codes =
      try {
        Tasks.await(task)
      } catch (_: Exception) {
        return
      }
    codes.firstNotNullOfOrNull { it.rawValue }?.let(::emit)
  }

  private fun emit(value: String) {
    post {
      val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      if (dispatcher == null) {
        return@post
      }

      dispatcher.dispatchEvent(QrCodeEvent(UIManagerHelper.getSurfaceId(this), id, value))
    }
  }
}

// Dense animated QR codes need more pixels per module than the 640x480 default;
// 16:9 keeps the decoded square at 720x720 (94ms per frame on a Galaxy Note8).
private val ANALYSIS_SIZE =
  ResolutionSelector.Builder()
    .setAspectRatioStrategy(AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
    .setResolutionStrategy(
      ResolutionStrategy(Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)
    )
    .build()

class QrCodeEvent(surfaceId: Int, viewId: Int, private val value: String) :
  Event<QrCodeEvent>(surfaceId, viewId) {

  override fun getEventName() = NAME

  override fun canCoalesce() = false

  override fun getEventCategory(): Int = DISCRETE

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply { putString("value", value) }

  companion object {
    const val NAME = "topQrCode"

    private const val DISCRETE = 3
  }
}
