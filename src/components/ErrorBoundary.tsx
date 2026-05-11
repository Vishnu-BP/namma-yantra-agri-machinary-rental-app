/**
 * @file ErrorBoundary.tsx — root-level render-error catcher.
 * @module src/components
 *
 * React's class-based error boundary that wraps the whole app tree in
 * `_layout.tsx`. Any render-time throw inside any screen gets caught
 * here and shows a recoverable error UI instead of a hard JS crash that
 * the user can't escape from. The error message is visible in dev so
 * we can diagnose; in prod we still show the message because this is
 * a demo app and recruiters seeing the actual error is more useful
 * than a generic "Something went wrong".
 *
 * "Try again" rebuilds the tree from scratch — fixes most transient
 * issues (failed image fetch, intermittent realtime drop). If the bug
 * is deterministic, the user can use the back gesture to leave the
 * screen.
 */
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';

const log = createLogger('UI');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    log.error('ErrorBoundary caught render error', error);
    if (info.componentStack) {
      log.error('Component stack', new Error(info.componentStack));
    }
  }

  handleReset = () => {
    log.info('ErrorBoundary: reset tapped');
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message ?? 'Unknown error';

    return (
      <SafeAreaView className="flex-1 bg-bg">
        <ScrollView contentContainerClassName="flex-grow items-center justify-center p-8">
          <View className="w-16 h-16 bg-error/10 rounded-full items-center justify-center mb-4">
            <AlertTriangle size={32} color={colors.error} />
          </View>
          <Text className="text-ink text-xl font-bold mb-2 text-center">
            Something broke
          </Text>
          <Text className="text-ink-soft text-sm text-center mb-6">
            {message}
          </Text>
          <Button
            label="Try again"
            onPress={this.handleReset}
            variant="primary"
            icon={RefreshCw}
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }
}
