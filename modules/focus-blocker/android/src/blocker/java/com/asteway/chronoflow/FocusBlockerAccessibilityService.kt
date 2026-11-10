package com.asteway.chronoflow

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/**
 * Enforces focus sessions. Two modes are supported:
 *
 * - `block-selected`: only the selected packages are blocked.
 * - `allow-only`: every package except the selected ones is blocked.
 *
 * When a blocked app is opened the service records it, returns to the home
 * screen, and brings Atna's Flow forward. The user can then hold the app name in
 * the app for a few seconds to receive a short one-time pass.
 */
class FocusBlockerAccessibilityService : AccessibilityService() {
  private val prefs by lazy { getSharedPreferences("focus-blocker", MODE_PRIVATE) }

  /** The home launcher is never blocked: pressing Home should not be treated as opening a blocked app. */
  private val homePackage: String? by lazy {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    @Suppress("DEPRECATION")
    packageManager.resolveActivity(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
      ?.activityInfo?.packageName
  }

  private val neverBlock = setOf(
    "android",
    "com.android.systemui",
    "com.android.phone",
    "com.android.server.telecom",
    "com.android.settings",
    "com.android.permissioncontroller",
    "com.android.emergency",
    "com.android.incallui",
    "com.google.android.dialer",
  )

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName || pkg in neverBlock) return

    if (!prefs.getBoolean("running", false)) return
    val endAt = prefs.getLong("endAt", 0L)
    val now = System.currentTimeMillis()
    if (endAt <= now) return

    // A recent hold-to-open grant lets the app through exactly once.
    val allowPackage = prefs.getString("allowPackage", null)
    val allowUntil = prefs.getLong("allowUntil", 0L)
    if (allowPackage == pkg && now < allowUntil) return

    val packages = prefs.getStringSet("packages", emptySet()) ?: emptySet()
    val mode = prefs.getString("mode", "block-selected") ?: "block-selected"
    val blocked = if (mode == "allow-only") pkg !in packages else pkg in packages
    if (!blocked) return

    val label = runCatching {
      val info = packageManager.getApplicationInfo(pkg, 0)
      packageManager.getApplicationLabel(info).toString()
    }.getOrDefault(pkg)

    prefs.edit()
      .putString("blockedPackage", pkg)
      .putString("blockedAppName", label)
      .putLong("blockedAt", now)
      .apply()

    performGlobalAction(GLOBAL_ACTION_HOME)
    val launch = packageManager.getLaunchIntentForPackage(packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    if (launch != null) {
      runCatching { startActivity(launch) }
    }
  }

  override fun onInterrupt() {}
}
