import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../constants';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Last-resort boundary so a render error shows a recovery screen instead of a
 * blank window. It deliberately uses fixed colours: it can render before the
 * theme provider is mounted.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      console.error('Atna\'s Flow render error', error);
    }
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME} hit an unexpected error</Text>
        <Text style={styles.body}>
          Your saved tasks, alarms, notes, and focus history are still on this device.
        </Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => BackHandler.exitApp()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>Close app</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081321',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: '#F4F7FB', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: '#98A8BC', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#6971F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { minHeight: 44, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#98A8BC', fontSize: 14, fontWeight: '600' },
});
