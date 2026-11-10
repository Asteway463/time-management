package com.asteway.chronoflow

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.content.Context
import android.os.PowerManager
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.random.Random

/** Lightweight, looping low-volume brown-noise ambience generated in memory. */
internal class FocusAudioEngine(context: Context) {
  private val active = AtomicBoolean(false)
  private val wakeLock = context.getSystemService(PowerManager::class.java)
    .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AtnasFlow:FocusAudio").apply { setReferenceCounted(false) }
  private var audioTrack: AudioTrack? = null
  private var worker: Thread? = null

  fun start() {
    if (!active.compareAndSet(false, true)) return
    val sampleRate = 22_050
    val chunk = ShortArray(2_048)
    val track = runCatching {
      AudioTrack.Builder()
        .setAudioAttributes(AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build())
        .setAudioFormat(AudioFormat.Builder()
          .setSampleRate(sampleRate)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .build())
        .setBufferSizeInBytes(chunk.size * 2)
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
    }.getOrElse { active.set(false); return }
    audioTrack = track
    if (!runCatching {
      if (!wakeLock.isHeld) wakeLock.acquire()
      track.setVolume(0.12f)
      track.play()
    }.isSuccess) {
      stop()
      return
    }
    worker = Thread({
      var brown = 0.0
      while (active.get()) {
        for (i in chunk.indices) {
          brown = (brown + Random.nextDouble(-1.0, 1.0) * 0.035).coerceIn(-1.0, 1.0)
          chunk[i] = (brown * 5_800).toInt().toShort()
        }
        val written = runCatching { track.write(chunk, 0, chunk.size, AudioTrack.WRITE_BLOCKING) }.getOrDefault(-1)
        if (written < 0) break
      }
    }, "AtnasFlowFocusAudio").apply { isDaemon = true; start() }
  }

  fun stop() {
    active.set(false)
    runCatching { audioTrack?.pause() }
    runCatching { audioTrack?.flush() }
    runCatching { audioTrack?.release() }
    audioTrack = null
    worker = null
    if (wakeLock.isHeld) runCatching { wakeLock.release() }
  }
}
