package cc.headpats.karopon

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import android.webkit.JavascriptInterface

private const val TAG = "TtsJsBridge"

// WebView has no speechSynthesis, so the web UI speaks through this instead.
class TtsJsBridge(context: Context) : TextToSpeech.OnInitListener {

    private val tts = TextToSpeech(context.applicationContext, this)

    @Volatile
    private var ready = false

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        Log.i(TAG, "init status=$status engine=${tts.defaultEngine} engines=${tts.engines.map { it.name }}")
    }

    @JavascriptInterface
    fun speak(text: String, interrupt: Boolean) {
        Log.d(TAG, "speak ready=$ready interrupt=$interrupt text=$text")
        if (!ready) {
            return
        }
        tts.speak(text, if (interrupt) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD, null, null)
    }

    @JavascriptInterface
    fun stop() {
        tts.stop()
    }

    fun shutdown() {
        tts.shutdown()
    }
}
