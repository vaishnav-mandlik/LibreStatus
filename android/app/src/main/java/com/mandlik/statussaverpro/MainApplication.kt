package com.mandlik.statussaverpro

import android.app.Application
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.cache.MemoryCacheParams
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.shell.MainPackageConfig

private const val MB = 1024 * 1024

class MainApplication : Application(), ReactApplication {

  /**
   * How much decoded image the app is allowed to hold.
   *
   * Fresco's default total is a quarter of the heap, which is 64 MB on a phone
   * with a 256 MB limit, and on Android 8 and up those bitmaps are
   * hardware-backed so they land in graphics memory rather than the Java heap.
   * Measured on a mid-range phone with 161 statuses: ten flings through the
   * grid took the process from 124 MB to 275 MB, and backgrounding gave back
   * only 50 MB. A phone with 1 GB of RAM is killed long before that.
   *
   * So the total is bounded, and only the total. The first version of this
   * also passed 64 entries and a cap/4 limit on any single entry, and both
   * were mistakes worth recording, because they did the opposite of what this
   * is for:
   *
   *  - Fresco's own defaults are 256 entries and Integer.MAX_VALUE for the
   *    per-entry limit, and the per-entry limit is MAX_VALUE deliberately.
   *    LruCountingMemoryCache refuses anything larger than it, and a
   *    full-screen status decodes to about 8 MB, so a cap/4 of 2 to 8 MB made
   *    the one image the user is actually looking at the one image that could
   *    never be cached. Paging back and forth in the viewer re-decoded from
   *    disk every time. On a small device it excluded grid tiles too.
   *  - The 64-entry limit is counted against entries currently held by
   *    attached views, not idle ones. The viewer's thumbnail strip alone
   *    mounts about 50, and once the count crosses the limit Fresco stops
   *    accepting any new entry at all.
   *
   * The floor is 4 MB rather than 8 because Fresco already clamps harder than
   * a fraction of the heap on small devices: 4 MB below a 32 MB memory class
   * and 6 MB below 64 MB. An 8 MB floor was looser than the default it
   * replaced on exactly the phones this exists to protect.
   *
   * The eviction queue is the pool of bitmaps kept for reuse after eviction,
   * and it counts toward the process footprint, so it is bounded by bytes as
   * well. Its entry count is left unbounded because the byte bound is what
   * governs.
   */
  private fun imagePipelineConfig(): ImagePipelineConfig {
    val heap = Runtime.getRuntime().maxMemory()
    val cap = (heap / 8).coerceIn(4L * MB, 32L * MB).toInt()
    val params =
        MemoryCacheParams(
            cap, // total bytes of decoded bitmap held
            256, // entries; Fresco's own default
            cap / 2, // bytes kept in the eviction queue for reuse
            Int.MAX_VALUE, // entries in that queue; the byte bound above governs
            Int.MAX_VALUE, // largest single entry; Fresco's default, see above
        )
    return ImagePipelineConfig.newBuilder(this)
        .setBitmapMemoryCacheParamsSupplier { params }
        // Deprecated, but not a no-op: in Fresco 3.6 this sets DownsampleMode
        // .ALWAYS, which is more aggressive than React Native's default AUTO.
        // Every image here is a local file or a content URI, and there is no
        // INTERNET permission, so nothing is ever fetched over the network.
        .setDownsampleEnabled(true)
        .build()
  }

  /**
   * Hand the bitmaps back when the system says it is short of memory.
   *
   * Bounding the cache decides how much the app holds when all is well. This
   * decides what happens when it is not, and without it the numbers above are
   * held right up to the moment the process is killed. React Native forwards
   * trim callbacks to Hermes for a GC and never tells Fresco, and Fresco only
   * clears itself when the last activity is destroyed, which is not the case
   * that matters here.
   */
  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level >= TRIM_MEMORY_RUNNING_LOW && Fresco.hasBeenInitialized()) {
      Fresco.getImagePipeline().clearMemoryCaches()
    }
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this, MainPackageConfig(imagePipelineConfig())).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(FolderPickerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
