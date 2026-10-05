package cc.headpats.karopon

import android.webkit.JavascriptInterface
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import org.json.JSONObject

// Receives the web UI's theme colors so the native UI can match them.
class ThemeJsBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun setColors(json: String) {
        activity.runOnUiThread { activity.setWebThemeColors(json) }
    }
}

/** Parses the JSON sent by the web UI's SyncAndroidTheme, skipping anything that isn't a color. */
fun parseWebThemeColors(json: String): Map<String, Color> {
    val obj = runCatching { JSONObject(json) }.getOrNull() ?: return emptyMap()
    return obj.keys().asSequence().mapNotNull { role ->
        runCatching { role to Color(android.graphics.Color.parseColor(obj.getString(role))) }.getOrNull()
    }.toMap()
}

/** Maps the web UI's --color-c-* roles onto a Material 3 color scheme. Dark is assumed until colors arrive. */
fun webColorScheme(colors: Map<String, Color>): ColorScheme {
    val surface = colors["surface"]
    val base = if (surface != null && surface.luminance() > 0.5f) lightColorScheme() else darkColorScheme()
    fun c(role: String, fallback: Color) = colors[role] ?: fallback

    return base.copy(
        primary = c("primary", base.primary),
        onPrimary = c("on-primary", base.onPrimary),
        primaryContainer = c("primary-container", base.primaryContainer),
        onPrimaryContainer = c("on-primary-container", base.onPrimaryContainer),
        secondary = c("secondary", base.secondary),
        onSecondary = c("on-secondary", base.onSecondary),
        secondaryContainer = c("secondary-container", base.secondaryContainer),
        onSecondaryContainer = c("on-secondary-container", base.onSecondaryContainer),
        tertiary = c("tertiary", base.tertiary),
        onTertiary = c("on-tertiary", base.onTertiary),
        tertiaryContainer = c("tertiary-container", base.tertiaryContainer),
        onTertiaryContainer = c("on-tertiary-container", base.onTertiaryContainer),
        error = c("error", base.error),
        onError = c("on-error", base.onError),
        errorContainer = c("error-container", base.errorContainer),
        onErrorContainer = c("on-error-container", base.onErrorContainer),
        background = c("surface", base.background),
        onBackground = c("on-surface", base.onBackground),
        surface = c("surface", base.surface),
        onSurface = c("on-surface", base.onSurface),
        surfaceVariant = c("surface-container-3", base.surfaceVariant),
        onSurfaceVariant = c("on-surface-variant", base.onSurfaceVariant),
        surfaceTint = c("primary", base.surfaceTint),
        surfaceDim = c("surface-dim", base.surfaceDim),
        surfaceBright = c("surface-bright", base.surfaceBright),
        // The web has surface + 6 container levels where M3 has 5, so its lowest is the plain surface.
        surfaceContainerLowest = c("surface", base.surfaceContainerLowest),
        surfaceContainerLow = c("surface-container-1", base.surfaceContainerLow),
        surfaceContainer = c("surface-container-2", base.surfaceContainer),
        surfaceContainerHigh = c("surface-container-3", base.surfaceContainerHigh),
        surfaceContainerHighest = c("surface-container-4", base.surfaceContainerHighest),
        outline = c("outline", base.outline),
        outlineVariant = c("outline-variant", base.outlineVariant),
        inverseSurface = c("inverse-surface", base.inverseSurface),
        inverseOnSurface = c("inverse-on-surface", base.inverseOnSurface),
        inversePrimary = c("inverse-primary", base.inversePrimary),
    )
}
