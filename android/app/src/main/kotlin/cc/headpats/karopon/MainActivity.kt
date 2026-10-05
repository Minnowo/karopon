package cc.headpats.karopon

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.AlertDialog
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.children
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import kotlinx.coroutines.launch
import java.util.UUID

private const val SERVER_PORT = 9070
private const val LOCAL_URL = "http://127.0.0.1:$SERVER_PORT/"
private const val SESSION_SECRET_KEY = "session_secret"

class MainActivity : ComponentActivity() {

    // Holds the webview URL.
    private val urlState = mutableStateOf<String?>(null)

    private val settingsState = mutableStateOf(AppSettings(ServerMode.LOCAL, ""))

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        settingsState.value = AppSettings.load(this)

        setContent {
            MaterialTheme {
                KaroponApp(this, urlState, settingsState.value, ::saveSettings)
            }
        }

        applyServerMode()
    }

    override fun onDestroy() {
        LocalServer.stop()
        super.onDestroy()
    }

    private fun saveSettings(settings: AppSettings) {
        settings.save(this)
        settingsState.value = settings
        applyServerMode()
    }

    private fun applyServerMode() {
        val settings = settingsState.value
        when (settings.serverMode) {
            ServerMode.LOCAL -> LocalServer.start(filesDir.absolutePath, SERVER_PORT, sessionSecret()) {
                runOnUiThread {
                    if (settingsState.value.serverMode == ServerMode.LOCAL) {
                        urlState.value = LOCAL_URL
                    }
                }
            }

            ServerMode.REMOTE -> {
                LocalServer.stop()
                urlState.value = settings.remoteUrl
            }
        }
    }

    fun ensureAlarmPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
        }

        // Android 14+ no longer grants USE_FULL_SCREEN_INTENT automatically for apps
        // targeting API 34 - without this, alarm-mode reminders silently fall back to
        // a plain heads-up notification instead of ringing over the lock screen.
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !notificationManager.canUseFullScreenIntent()) {
            startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName")))
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun KaroponApp(
    activity: MainActivity,
    urlState: MutableState<String?>,
    settings: AppSettings,
    onSaveSettings: (AppSettings) -> Unit,
) {
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var showSettings by rememberSaveable { mutableStateOf(false) }

    BackHandler(enabled = drawerState.isOpen) {
        scope.launch { drawerState.close() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Swiping only closes the drawer, so horizontal swipes still reach the web UI.
        ModalNavigationDrawer(
            drawerState = drawerState,
            gesturesEnabled = drawerState.isOpen,
            drawerContent = {
                ModalDrawerSheet {
                    Text(
                        "Karopon",
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.padding(16.dp),
                    )
                    NavigationDrawerItem(
                        label = { Text("Settings") },
                        icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                        selected = false,
                        onClick = {
                            scope.launch { drawerState.close() }
                            showSettings = true
                        },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    )
                }
            },
        ) {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Karopon") },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Filled.Menu, contentDescription = "Menu")
                            }
                        },
                    )
                },
            ) { padding ->
                ServerWebView(
                    activity,
                    urlState,
                    settings.refreshTriggerDp,
                    Modifier
                        .padding(padding)
                        .fillMaxSize(),
                )
            }
        }

        // Drawn over the webview rather than replacing it, so the page isn't reloaded on return.
        if (showSettings) {
            BackHandler { showSettings = false }
            SettingsScreen(
                settings = settings,
                onSave = {
                    onSaveSettings(it)
                    showSettings = false
                },
                onBack = { showSettings = false },
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun ServerWebView(
    activity: MainActivity,
    urlState: MutableState<String?>,
    refreshTriggerDp: Int,
    modifier: Modifier,
) {
    val url by urlState
    AndroidView(
        modifier = modifier,
        factory = { context ->
            val swipeRefresh = SwipeRefreshLayout(context)
            val webView = WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                addJavascriptInterface(AlarmJsBridge(activity), "AndroidAlarms")
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        swipeRefresh.isRefreshing = false
                    }
                }
                webChromeClient = KaroponWebChromeClient(context)
            }
            swipeRefresh.addView(webView)
            swipeRefresh.setOnRefreshListener { webView.reload() }
            swipeRefresh
        },
        update = { swipeRefresh ->
            // SwipeRefreshLayout adds its own spinner view as the first child.
            val webView = swipeRefresh.children.first { it is WebView } as WebView

            swipeRefresh.isEnabled = refreshTriggerDp > 0
            val density = swipeRefresh.resources.displayMetrics.density
            swipeRefresh.setDistanceToTriggerSync((refreshTriggerDp * density).toInt())

            val target = url
            // update can rerun on unrelated recompositions; only navigate when the URL changes.
            if (target != null && webView.tag != target) {
                webView.tag = target
                webView.loadUrl(target)
            }
        },
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
