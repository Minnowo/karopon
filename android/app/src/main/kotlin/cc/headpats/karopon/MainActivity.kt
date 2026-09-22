package cc.headpats.karopon

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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

    // Holds the webview URL.
    private val urlState = mutableStateOf<String?>(null)

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    @Volatile
    private var keepServerAlive = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestAlarmPermissions()

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ServerWebView(urlState)
                }
            }
        }

        Thread {
            // keep restarting the server if it dies until the activity actually ends.
            while (keepServerAlive) {
                val code = GoServer.nativeStart(filesDir.absolutePath, SERVER_PORT, sessionSecret())
                if (code == 0) {
                    runOnUiThread { urlState.value = "http://127.0.0.1:$SERVER_PORT/" }
                } else {
                    Log.e(TAG, "go server failed to start, code=$code")
                    break
                }

                GoServer.nativeWaitStopped()

                if (keepServerAlive) {
                    Log.w(TAG, "go server stopped unexpectedly, restarting")
                }
            }
        }.start()
    }

    override fun onDestroy() {
        keepServerAlive = false
        GoServer.nativeStop()
        super.onDestroy()
    }

    private fun requestAlarmPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
        }
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
                addJavascriptInterface(AlarmJsBridge(context), "AndroidAlarms")
                webViewClient = WebViewClient()
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
