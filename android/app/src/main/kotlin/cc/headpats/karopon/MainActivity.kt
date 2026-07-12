package cc.headpats.karopon

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.util.UUID

private const val TAG = "MainActivity"
private const val SERVER_PORT = 9070
private const val PREFS_NAME = "karopon"
private const val SESSION_SECRET_KEY = "session_secret"

class MainActivity : ComponentActivity() {

    // Compose state instead of a captured `var webView`: the WebView's
    // creation (via AndroidView's factory) and the server's readiness (via
    // the background thread below) can finish in either order, so the URL
    // load has to be driven by recomposition (AndroidView's `update`) rather
    // than a one-shot callback that might fire before the WebView exists.
    private val urlState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ServerWebView(urlState)
                }
            }
        }

        // Runs on a plain background thread (not a coroutine, to keep the
        // app dependency-free) so DB connect/migrate never blocks the UI
        // thread. GoServer.nativeStart itself only returns once the server
        // is bound and ready.
        Thread {
            val code = GoServer.nativeStart(filesDir.absolutePath, SERVER_PORT, sessionSecret())
            if (code == 0) {
                runOnUiThread { urlState.value = "http://127.0.0.1:$SERVER_PORT/" }
            } else {
                Log.e(TAG, "go server failed to start, code=$code")
            }
        }.start()
    }

    override fun onDestroy() {
        GoServer.nativeStop()
        super.onDestroy()
    }

    private fun sessionSecret(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.getString(SESSION_SECRET_KEY, null)?.let { return it }

        val secret = UUID.randomUUID().toString() + UUID.randomUUID().toString()
        prefs.edit().putString(SESSION_SECRET_KEY, secret).apply()
        return secret
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun ServerWebView(urlState: MutableState<String?>) {
    val url by urlState
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                webViewClient = WebViewClient()
                // Plain WebView drops JS alert()/confirm() dialogs silently
                // unless a WebChromeClient handles them - the frontend uses
                // confirm() for delete confirmations throughout.
                webChromeClient = KaroponWebChromeClient(context)
            }
        },
        update = { webView -> url?.let { webView.loadUrl(it) } },
    )
}

private class KaroponWebChromeClient(private val context: Context) : WebChromeClient() {

    override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
        AlertDialog.Builder(context)
            .setMessage(message)
            .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
            .setOnCancelListener { result.cancel() }
            .show()
        return true
    }

    override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
        AlertDialog.Builder(context)
            .setMessage(message)
            .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
            .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
            .setOnCancelListener { result.cancel() }
            .show()
        return true
    }
}
