import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import type { AlarmSound } from '../types';

/**
 * Bundled alarm tones. `default` deliberately has no asset so the system sound
 * is used, which respects the device's alarm volume and silent-mode policy.
 */
const ASSETS = {
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  digital: require('../../assets/sounds/digital.wav'),
  gentle: require('../../assets/sounds/gentle.wav'),
} as const;

const ALARM_VIBRATION = [0, 600, 300, 600, 300, 600];
const FOCUS_VIBRATION = [0, 260, 140, 260, 140, 420];

let audioModeReady: Promise<void> | null = null;

function ensureAudioMode() {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {
      audioModeReady = null;
    });
  }
  return audioModeReady;
}

function vibrate(pattern: number[], type: Haptics.NotificationFeedbackType) {
  try {
    void Haptics.notificationAsync(type).catch(() => {});
  } catch {
    // Haptics unavailable on this platform.
  }
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate(pattern, false);
  } catch {
    // Vibration unavailable.
  }
}

/** Plays a bundled tone once and releases the player afterwards. */
function playTone(source: number, volume: number, durationMs: number) {
  let player: AudioPlayer | null = null;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      player?.pause();
      player?.remove();
    } catch {
      // The player may already be released.
    }
    player = null;
  };
  try {
    player = createAudioPlayer(source);
    player.loop = false;
    player.volume = volume;
    player.play();
    setTimeout(release, durationMs);
  } catch {
    // Audio is a bonus; a failed tone must never break the alert.
    release();
  }
}

/**
 * Plays a looping alarm tone while `active` is true. The system default sound
 * is delivered by the notification itself, so only bundled tones are played
 * here. The audio mode uses `doNotMix` so an alarm always wins over any
 * focus-session ambient audio.
 */
export function useAlarmSound(sound: AlarmSound | undefined, active: boolean) {
  const source = sound && sound !== 'default' ? ASSETS[sound] : null;

  useEffect(() => {
    void ensureAudioMode();
  }, []);

  useEffect(() => {
    if (!active) return;
    vibrate(ALARM_VIBRATION, Haptics.NotificationFeedbackType.Warning);
    if (!source) return;

    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(source);
      player.loop = true;
      player.volume = 0.95;
      player.play();
    } catch {
      // Audio is a bonus; a failed preview must never stop the alarm screen.
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        // The player may already be released when the modal closes.
      }
    };
  }, [active, source]);
}

/** Plays a short one-shot preview for the alarm form. */
export function playAlarmPreview(sound: AlarmSound) {
  if (sound === 'default') return;
  void ensureAudioMode();
  playTone(ASSETS[sound], 0.9, 2400);
}

/**
 * Sound and vibration when a focus session (or a break) finishes. This is the
 * in-app alert that runs alongside the completion dialog, so the end of a
 * session is noticeable even when the phone is face down.
 */
export function playFocusCompleteAlert() {
  void ensureAudioMode();
  vibrate(FOCUS_VIBRATION, Haptics.NotificationFeedbackType.Success);
  playTone(ASSETS.chime, 0.95, 3200);
}
