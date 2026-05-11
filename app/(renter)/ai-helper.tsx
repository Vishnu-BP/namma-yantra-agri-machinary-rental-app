/**
 * @file (renter)/ai-helper.tsx — placeholder for the AI Helper tab.
 * @module app
 *
 * Crop-aware machine recommender lands in Layer 6 (Groq). For now it's an
 * honest "coming soon" so the tab bar works end-to-end.
 */
import { Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { createLogger } from '@/lib/logger';

const log = createLogger('UI');

export default function AIHelper() {
  useEffect(() => {
    log.info('AI Helper: page visited');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <EmptyState
        icon={Sparkles}
        title="AI Helper coming soon"
        body="Tell us your crop, land size, and task — we'll recommend the right machine. Lands in Layer 6."
      />
    </SafeAreaView>
  );
}
