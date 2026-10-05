package cc.headpats.karopon

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import android.webkit.JavascriptInterface
import java.util.concurrent.atomic.AtomicInteger

private const val TAG = "TtsJsBridge"

// WebView has no speechSynthesis, so the web UI speaks through this instead.
// Other apps' audio is ducked while anything is queued or speaking.
class TtsJsBridge(context: Context) : TextToSpeech.OnInitListener {

    private val tts = TextToSpeech(context.applicationContext, this)

    private val audioManager = context.getSystemService(AudioManager::class.java)

    private val attributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()

    private val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attributes)
        .build()

    private val nextUtteranceId = AtomicInteger()

    // Utterances that haven't finished, errored, or been flushed yet.
    private val pending = AtomicInteger()

    @Volatile
    private var ready = false

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        Log.i(TAG, "init status=$status engine=${tts.defaultEngine} engines=${tts.engines.map { it.name }}")

        if (ready) {
            tts.setAudioAttributes(attributes)
            tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}

                override fun onDone(utteranceId: String?) = finished()

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) = finished()

                override fun onError(utteranceId: String?, errorCode: Int) = finished()

                // Also called for utterances flushed from the queue before they started.
                override fun onStop(utteranceId: String?, interrupted: Boolean) = finished()
            })
        }
    }

    @JavascriptInterface
    fun speak(text: String, interrupt: Boolean) {
        if (!ready) {
            return
        }

        if (pending.getAndIncrement() == 0) {
            audioManager.requestAudioFocus(focusRequest)
        }

        val mode = if (interrupt) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
        val id = nextUtteranceId.incrementAndGet().toString()
        if (tts.speak(text, mode, null, id) != TextToSpeech.SUCCESS) {
            finished()
        }
    }

    @JavascriptInterface
    fun stop() {
        tts.stop()
    }

    fun shutdown() {
        tts.shutdown()
        audioManager.abandonAudioFocusRequest(focusRequest)
    }

    private fun finished() {
        if (pending.decrementAndGet() <= 0) {
            pending.set(0)
            audioManager.abandonAudioFocusRequest(focusRequest)
        }
    }
}
