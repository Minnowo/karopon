package cc.headpats.karopon

import android.content.Context
import android.webkit.JavascriptInterface

class AlarmJsBridge(context: Context) {

    private val scheduler = AlarmScheduler(context)

    @JavascriptInterface
    fun schedule(id: Int, whenMillis: Double, title: String, body: String, isAlarm: Boolean, sound: String) {
        scheduler.schedule(id, whenMillis.toLong(), title, body, isAlarm, sound)
    }

    @JavascriptInterface
    fun cancel(id: Int) {
        scheduler.cancel(id)
    }
}
