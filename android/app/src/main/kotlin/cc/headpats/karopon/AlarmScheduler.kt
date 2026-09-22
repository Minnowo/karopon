package cc.headpats.karopon

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

const val EXTRA_REMINDER_ID = "reminder_id"
const val EXTRA_TITLE = "title"
const val EXTRA_BODY = "body"
const val EXTRA_IS_ALARM = "is_alarm"
const val EXTRA_SOUND = "sound"

class AlarmScheduler(private val context: Context) {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun schedule(id: Int, whenMillis: Long, title: String, body: String, isAlarm: Boolean, sound: String) {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(EXTRA_REMINDER_ID, id)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_BODY, body)
            putExtra(EXTRA_IS_ALARM, isAlarm)
            putExtra(EXTRA_SOUND, sound)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        if (isAlarm) {
            // Exempt from Doze, shows the alarm-clock status bar icon.
            val showIntent = PendingIntent.getActivity(
                context,
                id,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(whenMillis, showIntent), pendingIntent)
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMillis, pendingIntent)
        }
    }

    fun cancel(id: Int) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
    }
}
