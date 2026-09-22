package cc.headpats.karopon

import android.webkit.JavascriptInterface

class AlarmJsBridge(private val activity: MainActivity) {

    private val scheduler = AlarmScheduler(activity)

    @JavascriptInterface
    fun schedule(id: Int, whenMillis: Double, title: String, body: String, isAlarm: Boolean, sound: String) {
        activity.runOnUiThread { activity.ensureAlarmPermissions() }
        scheduler.schedule(id, whenMillis.toLong(), title, body, isAlarm, sound)
    }

    @JavascriptInterface
    fun cancel(id: Int) {
        scheduler.cancel(id)
    }
}
