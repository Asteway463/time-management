import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { RADII, SPACE, TYPE, useThemedStyles, type ThemeColors } from '../theme';

type Props = {
  label: string;
  holdingLabel?: string;
  holdSeconds?: number;
  onComplete: () => void;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
};

/**
 * A press-and-hold control. The action only fires after the full hold duration,
 * which makes it hard to leave a focus lock accidentally.
 */
export function HoldToConfirm({
  label,
  holdingLabel,
  holdSeconds = 3,
  onComplete,
  variant = 'danger',
  disabled = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const progress = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [holding, setHolding] = useState(false);
  onCompleteRef.current = onComplete;

  useEffect(() => () => {
    progress.stopAnimation();
  }, [progress]);

  const start = () => {
    if (disabled) return;
    completedRef.current = false;
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(1, holdSeconds) * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || completedRef.current) return;
      completedRef.current = true;
      setHolding(false);
      progress.setValue(0);
      onCompleteRef.current();
    });
  };

  const cancel = () => {
    if (completedRef.current) return;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    setHolding(false);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Press and hold for ${holdSeconds} seconds.`}
      accessibilityHint="Keep your finger on the button for the full duration."
      disabled={disabled}
      onPressIn={start}
      onPressOut={cancel}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, {
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]}
      />
      <View pointerEvents="none" style={styles.content}>
        <Text style={styles.text}>{holding ? (holdingLabel ?? `Keep holding… ${holdSeconds}s`) : label}</Text>
        <Text style={styles.hint}>{holding ? 'Release to cancel' : `Hold for ${holdSeconds} seconds`}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  button: {
    minHeight: 62,
    borderRadius: RADII.md,
    backgroundColor: COLORS.danger,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: SPACE.lg,
  },
  buttonPrimary: { backgroundColor: COLORS.primaryStrong },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  content: { alignItems: 'center', gap: 2 },
  text: { color: COLORS.white, fontSize: TYPE.body, fontWeight: '800', textAlign: 'center' },
  hint: { color: 'rgba(255, 255, 255, 0.8)', fontSize: TYPE.micro, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.92 },
});
