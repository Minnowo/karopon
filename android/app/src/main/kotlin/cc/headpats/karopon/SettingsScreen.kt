package cc.headpats.karopon

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

private const val MAX_REFRESH_TRIGGER_DP = 400
private const val REFRESH_TRIGGER_STEP_DP = 20

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(settings: AppSettings, onSave: (AppSettings) -> Unit, onBack: () -> Unit) {
    var mode by remember { mutableStateOf(settings.serverMode) }
    var remoteUrl by remember { mutableStateOf(settings.remoteUrl) }
    var refreshTriggerDp by remember { mutableIntStateOf(settings.refreshTriggerDp) }
    val normalizedUrl = normalizeRemoteUrl(remoteUrl)
    val urlError = mode == ServerMode.REMOTE && normalizedUrl == null

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("Server", style = MaterialTheme.typography.titleMedium)

            ServerModeOption(
                title = "Local",
                description = "Run the server on this device",
                selected = mode == ServerMode.LOCAL,
                onClick = { mode = ServerMode.LOCAL },
            )
            ServerModeOption(
                title = "Remote",
                description = "Connect to a server at the URL below",
                selected = mode == ServerMode.REMOTE,
                onClick = { mode = ServerMode.REMOTE },
            )

            OutlinedTextField(
                value = remoteUrl,
                onValueChange = { remoteUrl = it },
                label = { Text("Remote URL") },
                placeholder = { Text("https://example.com") },
                supportingText = { Text("Must be an https:// URL") },
                singleLine = true,
                enabled = mode == ServerMode.REMOTE,
                isError = urlError,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Pull to refresh", style = MaterialTheme.typography.titleMedium)
            Text(
                if (refreshTriggerDp == 0) "Off" else "Pull distance: $refreshTriggerDp dp",
                style = MaterialTheme.typography.bodyMedium,
            )
            Slider(
                value = refreshTriggerDp.toFloat(),
                onValueChange = { refreshTriggerDp = it.roundToInt() },
                valueRange = 0f..MAX_REFRESH_TRIGGER_DP.toFloat(),
                steps = MAX_REFRESH_TRIGGER_DP / REFRESH_TRIGGER_STEP_DP - 1,
            )

            Button(
                onClick = { onSave(AppSettings(mode, normalizedUrl ?: remoteUrl.trim(), refreshTriggerDp)) },
                enabled = !urlError,
                modifier = Modifier.align(Alignment.End),
            ) {
                Text("Save")
            }
        }
    }
}

@Composable
private fun ServerModeOption(title: String, description: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onClick, role = Role.RadioButton)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = null)
        Column(modifier = Modifier.padding(start = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(description, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
