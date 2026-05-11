/**
 * @file (renter)/bookings.tsx — placeholder for the My Bookings tab.
 * @module app
 *
 * Real content lands in L3 (booking flow + status filters). For now it's
 * an honest "coming soon" so the tab bar works end-to-end without a 404.
 */
import { useEffect } from 'react';
import { Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { createLogger } from '@/lib/logger';

const log = createLogger('UI');

export default function Bookings() {
  useEffect(() => {
    log.info('Bookings: page visited');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <EmptyState
        icon={Calendar}
        title="Bookings coming soon"
        body="Renting machines lands in Layer 3. For now, browse the Discover tab to see what's available."
      />
    </SafeAreaView>
  );
}
