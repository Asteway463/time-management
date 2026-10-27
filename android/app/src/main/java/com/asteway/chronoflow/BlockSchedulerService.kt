package com.asteway.chronoflow

import android.app.Service
import android.content.Intent
import android.os.IBinder

class BlockSchedulerService : Service() {

    companion object {
        const val ACTION_RECHECK = "com.asteway.chronoflow.RECHECK"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_RECHECK -> {
                val service = BlockAccessibilityService.instance
                if (service != null && BlockAccessibilityService.active) {
                    if (System.currentTimeMillis() > BlockAccessibilityService.sessionEndAt &&
                        BlockAccessibilityService.sessionEndAt > 0
                    ) {
                        service.clearBlockState()
                        stopSelf()
                        return START_NOT_STICKY
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}