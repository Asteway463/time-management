package com.asteway.chronoflow

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocusBlockerModule : Module() {
  private companion object {
    const val ACCESSIBILITY_SERVICE = "com.asteway.chronoflow.FocusBlockerAccessibilityService"
  }

  /**
   * The default release build intentionally ships WITHOUT the accessibility
   * service so that the sideloaded APK does not request a Play Protect
   * "sensitive permission". The service class is not even compiled into that
   * build, so we must check the merged manifest rather than assume the blocker
   * exists.
   */
  private fun blockerDeclared(): Boolean {
    val context = appContext.reactContext ?: return false
    val component = ComponentName(context.packageName, ACCESSIBILITY_SERVICE)
    return runCatching { context.packageManager.getServiceInfo(component, 0) }.isSuccess
  }

  override fun definition() = ModuleDefinition {
    Name("FocusBlocker")

    Function("isAvailable") { blockerDeclared() }

    Function("isAccessibilityEnabled") {
      if (!blockerDeclared()) return@Function false
      val context = appContext.reactContext ?: return@Function false
      val expected = "${context.packageName}/$ACCESSIBILITY_SERVICE"
      Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        ?.split(':')?.any { it.equals(expected, ignoreCase = true) } == true
    }

    AsyncFunction("getInstalledApps") {
      // Do not enumerate other apps unless the blocker capability is part of
      // this build. The default build has no legitimate reason to read it.
      if (!blockerDeclared()) return@AsyncFunction emptyList<Map<String, String>>()
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      val pm = context.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(launcherIntent, 0)
        .map { it.activityInfo.applicationInfo }
        .distinctBy { it.packageName }
        .filter { it.packageName != context.packageName }
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
        }.sortedBy { it["name"]?.lowercase() }
    }

    Function("openAccessibilitySettings") {
      if (!blockerDeclared()) return@Function null
      val context = appContext.reactContext ?: return@Function null
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("startSession") { packages: List<String>, endAt: Double, playAudio: Boolean, mode: String, holdSeconds: Int ->
      val context = appContext.reactContext ?: return@Function false
      if (packages.isEmpty() && !playAudio) return@Function false
      if (packages.isNotEmpty() && !blockerDeclared()) return@Function false
      val intent = Intent(context, FocusSessionService::class.java)
        .setAction(FocusSessionService.ACTION_START)
        .putStringArrayListExtra(FocusSessionService.EXTRA_PACKAGES, ArrayList(packages))
        .putExtra(FocusSessionService.EXTRA_END_AT, endAt.toLong())
        .putExtra(FocusSessionService.EXTRA_AUDIO, playAudio)
        .putExtra(FocusSessionService.EXTRA_MODE, mode)
        .putExtra(FocusSessionService.EXTRA_HOLD_SECONDS, holdSeconds)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      true
    }

    Function("getLastBlockedApp") {
      if (!blockerDeclared()) return@Function null
      val context = appContext.reactContext ?: return@Function null
      val prefs = context.getSharedPreferences("focus-blocker", android.content.Context.MODE_PRIVATE)
      if (!prefs.getBoolean("running", false)) return@Function null
      val packageName = prefs.getString("blockedPackage", null) ?: return@Function null
      if (packageName == context.packageName) return@Function null
      mapOf(
        "packageName" to packageName,
        "name" to (prefs.getString("blockedAppName", null) ?: packageName),
        "blockedAt" to prefs.getLong("blockedAt", 0L),
      )
    }

    /**
     * Grants a short one-time pass for an app and launches it. The accessibility
     * service checks `allowPackage`/`allowUntil` before blocking again, which is
     * how the 3-second hold in the UI opens the unselected app.
     */
    Function("openBlockedApp") { packageName: String ->
      if (!blockerDeclared()) return@Function false
      val context = appContext.reactContext ?: return@Function false
      val launch = context.packageManager.getLaunchIntentForPackage(packageName) ?: return@Function false
      val prefs = context.getSharedPreferences("focus-blocker", android.content.Context.MODE_PRIVATE)
      prefs.edit()
        .putString("allowPackage", packageName)
        .putLong("allowUntil", System.currentTimeMillis() + 15_000L)
        .remove("blockedPackage")
        .remove("blockedAppName")
        .putLong("blockedAt", 0L)
        .apply()
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
      context.startActivity(launch)
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