package com.asteway.chronoflow

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class FocusModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FocusModule"

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        val context = reactApplicationContext
        val expectedService = ComponentName(context, BlockAccessibilityService::class.java)
        val enabledServices = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)

        if (enabledServices == null) {
            promise.resolve(false)
            return
        }

        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)
        while (colonSplitter.hasNext()) {
            val componentName = ComponentName.unflattenFromString(colonSplitter.next())
            if (componentName != null &&
                componentName.packageName.equals(expectedService.packageName, ignoreCase = true) &&
                componentName.className.equals(expectedService.className, ignoreCase = true)
            ) {
                promise.resolve(true)
                return
            }
        }
        promise.resolve(false)
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun setBlockState(packages: ReadableArray, reason: String, endAt: Double) {
        val packageSet = mutableSetOf<String>()
        for (i in 0 until packages.size()) {
            packages.getString(i)?.let { packageSet.add(it) }
        }

        BlockAccessibilityService.instance?.setBlockState(
            packageSet,
            reason,
            endAt.toLong(),
            ""
        )
    }

    @ReactMethod
    fun clearBlockState() {
        BlockAccessibilityService.instance?.clearBlockState()
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val apps = pm.getInstalledApplications(0)
            val result = Arguments.createArray()

            for (app in apps) {
                // Filter out system apps if desired, or just show all
                val isSystemApp = (app.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                if (!isSystemApp || app.packageName == "com.android.chrome" || app.packageName == "com.google.android.youtube") {
                    val map = Arguments.createMap()
                    map.putString("packageName", app.packageName)
                    map.putString("label", pm.getApplicationLabel(app).toString())
                    result.pushMap(map)
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_APPS_ERROR", e.message)
        }
    }
}
