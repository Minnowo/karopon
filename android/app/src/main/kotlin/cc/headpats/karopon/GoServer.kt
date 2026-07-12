package cc.headpats.karopon

/**
 * JNI bridge to the embedded Go server (see android/golib). Method names are
 * `@JvmStatic` so the exported native symbols are `Java_cc_headpats_karopon_GoServer_native*`.
 */
object GoServer {

    init {
        System.loadLibrary("goserver")
    }

    /** Returns 0 on success, non-zero if the server failed to start. */
    @JvmStatic external fun nativeStart(dataDir: String, port: Int, sessionSecret: String): Int

    @JvmStatic external fun nativeStop()

    @JvmStatic external fun nativeIsRunning(): Boolean
}
