package cc.headpats.karopon

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

private const val CHANNEL_REMINDERS = "reminders"
private const val CHANNEL_ALARMS = "alarms"

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(EXTRA_REMINDER_ID, 0)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
        val body = intent.getStringExtra(EXTRA_BODY) ?: ""
        val isAlarm = intent.getBooleanExtra(EXTRA_IS_ALARM, false)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannels(notificationManager)

        val notification = if (isAlarm) {
            buildAlarmNotification(context, id, title, body)
        } else {
            buildReminderNotification(context, title, body)
        }

        notificationManager.notify(id, notification)
    }

    private fun ensureChannels(notificationManager: NotificationManager) {
        notificationManager.createNotificationChannel(
            NotificationChannel(CHANNEL_REMINDERS, "Reminders", NotificationManager.IMPORTANCE_DEFAULT),
        )
        notificationManager.createNotificationChannel(
            NotificationChannel(CHANNEL_ALARMS, "Alarms", NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun buildReminderNotification(context: Context, title: String, body: String) =
        NotificationCompat.Builder(context, CHANNEL_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent(context))
            .build()

    // Locked device -> the system launches AlarmRingActivity full-screen; unlocked ->
    // it's shown as a heads-up notification instead, per Android's fullScreenIntent rules.
    private fun buildAlarmNotification(context: Context, id: Int, title: String, body: String): android.app.Notification {
        val ringIntent = Intent(context, AlarmRingActivity::class.java).apply {
            putExtra(EXTRA_REMINDER_ID, id)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_BODY, body)
        }
        val ringPendingIntent = PendingIntent.getActivity(
            context,
            id,
            ringIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(context, CHANNEL_ALARMS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(ringPendingIntent, true)
            .setContentIntent(ringPendingIntent)
            .setAutoCancel(true)
            .build()
    }

    private fun openAppPendingIntent(context: Context) = PendingIntent.getActivity(
        context,
        0,
        Intent(context, MainActivity::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}
