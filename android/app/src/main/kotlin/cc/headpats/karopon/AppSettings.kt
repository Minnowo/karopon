package cc.headpats.karopon

import android.content.Context
import android.net.Uri

const val PREFS_NAME = "karopon"
private const val SERVER_MODE_KEY = "server_mode"
private const val REMOTE_URL_KEY = "remote_url"
private const val REFRESH_TRIGGER_DP_KEY = "refresh_trigger_dp"

// SwipeRefreshLayout defaults to 64dp, and the finger has to travel about twice this distance.
const val DEFAULT_REFRESH_TRIGGER_DP = 160

enum class ServerMode { LOCAL, REMOTE }

data class AppSettings(
    val serverMode: ServerMode,
    val remoteUrl: String,

    // Pull distance for pull-to-refresh, 0 disables it.
    val refreshTriggerDp: Int = DEFAULT_REFRESH_TRIGGER_DP,
) {

    fun save(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putString(SERVER_MODE_KEY, serverMode.name)
            .putString(REMOTE_URL_KEY, remoteUrl)
            .putInt(REFRESH_TRIGGER_DP_KEY, refreshTriggerDp)
            .apply()
    }

    companion object {
        fun load(context: Context): AppSettings {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val mode = ServerMode.entries.find { it.name == prefs.getString(SERVER_MODE_KEY, null) } ?: ServerMode.LOCAL
            return AppSettings(
                mode,
                prefs.getString(REMOTE_URL_KEY, null) ?: "",
                prefs.getInt(REFRESH_TRIGGER_DP_KEY, DEFAULT_REFRESH_TRIGGER_DP),
            )
        }
    }
}

/** Adds https:// if no scheme is given. Returns null unless the result is an https URL with a host. */
fun normalizeRemoteUrl(input: String): String? {
    val trimmed = input.trim()
    if (trimmed.isEmpty()) {
        return null
    }

    val url = if ("://" in trimmed) trimmed else "https://$trimmed"
    val uri = Uri.parse(url)
    if (uri.scheme != "https" || uri.host.isNullOrEmpty()) {
        return null
    }
    return url
}
