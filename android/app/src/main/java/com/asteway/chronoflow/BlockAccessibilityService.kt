package com.asteway.chronoflow

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import java.util.concurrent.ConcurrentHashMap

class BlockAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        var instance: BlockAccessibilityService? = null
        var active: Boolean = false
            private set
        var blockedPackages: Set<String> = emptySet()
        var blockReason: String = "Focus session active"
        var sessionEndAt: Long = 0
        var bypassToken: String = ""
        private val toastHandler = Handler(Looper.getMainLooper())
        private val lastToast = ConcurrentHashMap<String, Long>()
        private const val TOAST_DEBOUNCE_MS = 30_000L
    }

    private fun maybeToast(message: String) {
        val now = System.currentTimeMillis()
        val last = lastToast[message] ?: 0L
        if (now - last < TOAST_DEBOUNCE_MS) return
        lastToast[message] = now
        toastHandler.post {
            Toast.makeText(instance, message, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                AccessibilityServiceInfo.FLAG_INCLUDE_NOTIMPORTANT_EVENTS
        }
        accessibilityServiceInfo = info
        active = true
    }

    override fun onDisconnected() {
        super.onDisconnected()
        active = false
        instance = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!active) return
        if (event == null) return
        if (blockedPackages.isEmpty()) return
        if (System.currentTimeMillis() > sessionEndAt && sessionEndAt > 0) {
            return
        }
        val packageName = event.packageName?.toString() ?: return
        if (packageName == getPackageName()) return
        if (blockedPackages.contains(packageName)) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            maybeToast(blockReason)
        }
    }

    override fun onInterrupt() {
        // No-op: service interrupted, block state is cleared elsewhere.
    }

    fun setBlockState(
        packages: Set<String>,
        reason: String,
        endAt: Long,
        token: String,
    ) {
        blockedPackages = packages
        blockReason = reason
        sessionEndAt = endAt
        bypassToken = token
    }

    fun clearBlockState() {
        blockedPackages = emptySet()
        blockReason = "Focus session active"
        bypassToken = ""
    }

    fun performBack() {
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    fun performHome() {
        performGlobalAction(GLOBAL_ACTION_HOME)
    }
}

class BootReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: android.content.Context, intent: android.content.Intent?) {
        if (intent == null) return
        val action = intent.action ?: return
        if (action == android.content.Intent.ACTION_BOOT_COMPLETED ||
            action == android.content.Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            val scheduled = android.content.Intent(context, BlockSchedulerService::class.java).apply {
                this.action = BlockSchedulerService.ACTION_RECHECK
            }
            context.startService(scheduled)
        }
    }
}