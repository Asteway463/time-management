package com.asteway.chronoflow

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class FocusSessionService : Service() {
  private val prefs by lazy { getSharedPreferences("focus-blocker", MODE_PRIVATE) }
  private val focusAudio by lazy { FocusAudioEngine(this) }
  override fun onCreate() { super.onCreate(); createChannels() }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      if (prefs.getBoolean("running", false)) {
        val endAt = prefs.getLong("endAt", 0L)
        if (endAt > System.currentTimeMillis()) {
          startForeground(NOTIFICATION_ID, notification("Focus session active"))
          if (prefs.getBoolean("playAudio", false)) focusAudio.start()
          scheduleEnd(endAt)
        } else {
          finishSession()
        }
      } else {
        stopSelf()
        return START_NOT_STICKY
      }
      return START_STICKY
    }
    when (intent?.action) {
      ACTION_START -> {
        val packages = intent.getStringArrayListExtra(EXTRA_PACKAGES) ?: arrayListOf()
        val endAt = intent.getLongExtra(EXTRA_END_AT, 0L)
        val playAudio = intent.getBooleanExtra(EXTRA_AUDIO, false)
        prefs.edit().putStringSet("packages", packages.toSet()).putLong("endAt", endAt).putBoolean("running", true).putBoolean("playAudio", playAudio).apply()
        startForeground(NOTIFICATION_ID, notification("Focus session active"))
        if (playAudio) focusAudio.start() else focusAudio.stop()
        scheduleEnd(endAt)
      }
      ACTION_PAUSE -> {
        prefs.edit().putBoolean("running", false).apply()
        focusAudio.stop()
        cancelEndAlarm()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
      ACTION_RESUME -> {
        val endAt = prefs.getLong("endAt", 0L)
        if (endAt > System.currentTimeMillis()) {
          prefs.edit().putBoolean("running", true).apply()
          if (prefs.getBoolean("playAudio", false)) focusAudio.start()
          startForeground(NOTIFICATION_ID, notification("Focus session active")); scheduleEnd(endAt)
        }
      }
      ACTION_STOP -> if (prefs.getBoolean("running", false)) finishSession() else cancelSession()
      ACTION_CANCEL -> cancelSession()
    }
    return START_STICKY
  }
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onDestroy() { focusAudio.stop(); super.onDestroy() }
  private fun scheduleEnd(endAt: Long) {
    val alarm = getSystemService(AlarmManager::class.java)
    val pending = PendingIntent.getService(this, 23, Intent(this, FocusSessionService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarm.canScheduleExactAlarms()) {
      alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending)
    } else {
      alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending)
    }
  }
  private fun finishSession() {
    focusAudio.stop()
    cancelEndAlarm()
    prefs.edit().clear().apply()
    getSystemService(NotificationManager::class.java).notify(24, NotificationCompat.Builder(this, DONE_CHANNEL)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Focus session complete")
      .setContentText("Your selected apps are available again.").setAutoCancel(true).build())
    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
  }
  private fun cancelEndAlarm() {
    val pending = PendingIntent.getService(this, 23, Intent(this, FocusSessionService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
    if (pending != null) {
      getSystemService(AlarmManager::class.java).cancel(pending)
      pending.cancel()
    }
  }
  private fun cancelSession() {
    focusAudio.stop()
    cancelEndAlarm()
    prefs.edit().clear().apply()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }
  private fun notification(text: String) = NotificationCompat.Builder(this, SESSION_CHANNEL)
    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Ast Time")
    .setContentText(text).setOngoing(true).setCategory(NotificationCompat.CATEGORY_SERVICE).build()
  private fun createChannels() {
    if (Build.VERSION.SDK_INT >= 26) {
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(NotificationChannel(SESSION_CHANNEL, "Focus sessions", NotificationManager.IMPORTANCE_LOW))
      manager.createNotificationChannel(NotificationChannel(DONE_CHANNEL, "Focus completion", NotificationManager.IMPORTANCE_DEFAULT))
    }
  }
  companion object {
    const val ACTION_START = "com.asteway.chronoflow.START"
    const val ACTION_PAUSE = "com.asteway.chronoflow.PAUSE"
    const val ACTION_RESUME = "com.asteway.chronoflow.RESUME"
    const val ACTION_STOP = "com.asteway.chronoflow.STOP"
    const val ACTION_CANCEL = "com.asteway.chronoflow.CANCEL"
    const val EXTRA_PACKAGES = "packages"
    const val EXTRA_END_AT = "endAt"
    const val EXTRA_AUDIO = "playAudio"
    const val SESSION_CHANNEL = "asttime-focus-session"
    const val DONE_CHANNEL = "asttime-focus-completion"
    const val NOTIFICATION_ID = 23
  }
}
