package cc.headpats.karopon

import android.util.Log
import java.util.concurrent.Executors

private const val TAG = "LocalServer"

/**
 * Runs the embedded Go server on a background thread, restarting it if it dies.
 * start() and stop() return immediately and are applied in call order.
 */
object LocalServer {

    private class Run {
        @Volatile var alive = true
    }

    private val executor = Executors.newSingleThreadExecutor()

    // Guards nativeStart against a concurrent nativeStop.
    private val nativeLock = Any()

    // Only touched on the executor thread.
    private var current: Run? = null

    /** onReady is called on a background thread each time the server comes up. */
    fun start(dataDir: String, port: Int, sessionSecret: String, onReady: () -> Unit) {
        executor.execute {
            if (current != null) {
                return@execute
            }

            val run = Run()
            current = run
            Thread { serve(run, dataDir, port, sessionSecret, onReady) }.start()
        }
    }

    fun stop() {
        executor.execute {
            val run = current ?: return@execute
            current = null

            synchronized(nativeLock) {
                run.alive = false
                GoServer.nativeStop()
            }
        }
    }

    private fun serve(run: Run, dataDir: String, port: Int, sessionSecret: String, onReady: () -> Unit) {
        while (true) {
            val code = synchronized(nativeLock) {
                if (!run.alive) {
                    return
                }
                GoServer.nativeStart(dataDir, port, sessionSecret)
            }

            if (code != 0) {
                Log.e(TAG, "go server failed to start, code=$code")
                executor.execute {
                    if (current === run) {
                        current = null
                    }
                }
                return
            }

            onReady()
            GoServer.nativeWaitStopped()

            if (run.alive) {
                Log.w(TAG, "go server stopped unexpectedly, restarting")
            }
        }
    }
}
