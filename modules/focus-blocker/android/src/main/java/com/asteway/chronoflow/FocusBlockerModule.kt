package com.asteway.chronoflow

import android.content.Intent
import android.os.Build
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocusBlockerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FocusBlocker")

    Function("isAvailable") { true }

    Function("isAccessibilityEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val expected = "${context.packageName}/${FocusBlockerAccessibilityService::class.java.name}"
      Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        ?.split(':')?.any { it.equals(expected, ignoreCase = true) } == true
    }

    AsyncFunction("getInstalledApps") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      val pm = context.packageManager
      @Suppress("DEPRECATION")
      pm.getInstalledApplications(0)
        .filter { it.packageName != context.packageName && pm.getLaunchIntentForPackage(it.packageName) != null }
        .mapNotNull { app ->
          runCatching {
            val drawable = pm.getApplicationIcon(app)
            val bitmap = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, 64, 64)
            drawable.draw(canvas)
            val bytes = java.io.ByteArrayOutputStream().use { output ->
              bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
              output.toByteArray()
            }
            bitmap.recycle()
            mapOf(
              "packageName" to app.packageName,
              "name" to pm.getApplicationLabel(app).toString(),
              "icon" to Base64.encodeToString(bytes, Base64.NO_WRAP),
            )
          }.getOrNull()
        }
        .sortedBy { it["name"]?.lowercase() }
    }

    Function("openAccessibilitySettings") {
      val context = appContext.reactContext ?: return@Function null
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("startSession") { packages: List<String>, endAt: Double, playAudio: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      if (packages.isEmpty() && !playAudio) return@Function false
      val intent = Intent(context, FocusSessionService::class.java)
        .setAction(FocusSessionService.ACTION_START)
        .putStringArrayListExtra(FocusSessionService.EXTRA_PACKAGES, ArrayList(packages))
        .putExtra(FocusSessionService.EXTRA_END_AT, endAt.toLong())
        .putExtra(FocusSessionService.EXTRA_AUDIO, playAudio)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      true
    }

    Function("pauseSession") {
      appContext.reactContext?.startService(Intent(appContext.reactContext, FocusSessionService::class.java).setAction(FocusSessionService.ACTION_PAUSE))
    }
    Function("resumeSession") {
      appContext.reactContext?.startService(Intent(appContext.reactContext, FocusSessionService::class.java).setAction(FocusSessionService.ACTION_RESUME))
    }
    Function("stopSession") {
      appContext.reactContext?.startService(Intent(appContext.reactContext, FocusSessionService::class.java).setAction(FocusSessionService.ACTION_STOP))
    }
    Function("cancelSession") {
      appContext.reactContext?.startService(Intent(appContext.reactContext, FocusSessionService::class.java).setAction(FocusSessionService.ACTION_CANCEL))
    }
  }
}
