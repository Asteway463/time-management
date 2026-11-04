package com.asteway.chronoflow

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class FocusBlockerAccessibilityService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return
    val prefs = getSharedPreferences("focus-blocker", MODE_PRIVATE)
    if (!prefs.getBoolean("running", false) || pkg !in (prefs.getStringSet("packages", emptySet()) ?: emptySet())) return
    val endAt = prefs.getLong("endAt", 0L)
    if (endAt <= System.currentTimeMillis()) return
    performGlobalAction(GLOBAL_ACTION_HOME)
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    if (launch != null) startActivity(launch)
  }
  override fun onInterrupt() {}
}
