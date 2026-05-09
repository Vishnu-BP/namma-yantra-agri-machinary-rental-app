/**
 * @file index.tsx — Layer 0 health-check landing screen.
 * @module app
 *
 * Calls a deliberately non-existent table on Supabase. The expected
 * outcome is a 42P01 ("relation does not exist") error — that error
 * proves we reached Postgres successfully (network + env vars + client
 * are wired correctly). Any other outcome means a real config problem.
 *
 * Replaced in L1 with the auth/landing screen.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';

const log = createLogger('DB');

// Why: two codes mean "table missing, server reached." 42P01 is the raw
// Postgres code; PGRST205 is what PostgREST returns when its schema cache
// has no entry. A 200 response with either code proves we connected,
// authenticated, and got a real answer back — exactly the signal we want.
const TABLE_MISSING_CODES: readonly string[] = ['42P01', 'PGRST205'];

type HealthStatus = 'connecting' | 'connected' | 'error';

export default function Index() {
  const [status, setStatus] = useState<HealthStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { error } = await supabase.from('_health').select('*').limit(1);
      if (cancelled) return;

      if (error && TABLE_MISSING_CODES.includes(error.code)) {
        log.info('Health check passed (table missing as expected)', { code: error.code });
        setStatus('connected');
        return;
      }

      if (error) {
        log.error('Unexpected health-check error', error);
        setErrorMessage(error.message);
        setStatus('error');
        return;
      }

      // Unexpected: _health actually exists. Connection is fine, just surprising.
      log.warn('Reachable but _health table actually exists');
      setStatus('connected');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel =
    status === 'connecting'
      ? 'Connecting…'
      : status === 'connected'
        ? 'Connected to Supabase ✓'
        : `Error: ${errorMessage ?? 'unknown'}`;

  const statusClassName =
    status === 'connecting'
      ? 'text-ink-mute'
      : status === 'connected'
        ? 'text-avail'
        : 'text-error';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-ink text-3xl font-semibold mb-2">
          Namma-Yantra Share
        </Text>
        <Text className="text-ink-soft text-base mb-8">Layer 0</Text>
        <Text className={`${statusClassName} text-base`}>{statusLabel}</Text>
      </View>
    </SafeAreaView>
  );
}
