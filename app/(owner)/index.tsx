/**
 * @file (owner)/index.tsx — owner's machine listings screen.
 * @module app
 *
 * Shows all machines the signed-in owner has created (any status). Tapping
 * a card navigates to the edit screen. FAB in the bottom-right opens the
 * Add Machine flow. Empty state is shown when the owner has no listings yet.
 */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Tractor } from 'lucide-react-native';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MachineCard } from '@/components/machine/MachineCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useOwnerMachines } from '@/hooks/useMachines';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/authStore';
import type { Machine } from '@/types/database';

const log = createLogger('UI');

export default function OwnerListings() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { data: machines, isLoading, refetch } = useOwnerMachines(profile?.id);

  useEffect(() => {
    log.info('Owner listings: page visited');
  }, []);

  const handleAddMachine = () => {
    log.info('Owner listings: add machine tapped');
    router.push('/(owner)/add-machine' as Parameters<typeof router.push>[0]);
  };

  const handleCardPress = (machine: Machine) => {
    log.info('Owner listings: machine card tapped', { machineId: machine.id });
    router.push(
      `/(owner)/machine/${machine.id}/edit` as Parameters<typeof router.push>[0],
    );
  };

  if (isLoading) {
    return <LoadingState subtitle="Loading your machines…" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-ink text-xl font-bold">{t('owner.listings')}</Text>
        <Pressable
          onPress={handleAddMachine}
          className="flex-row items-center gap-1.5 bg-primary px-4 py-2 rounded-xl min-h-[44px] justify-center"
        >
          <Plus size={16} color={colors.surface} />
          <Text className="text-white font-semibold text-sm">{t('owner.addMachine')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={machines ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <MachineCard
            machine={item}
            distanceKm={null}
            onPress={() => handleCardPress(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Tractor}
            title={t('owner.noMachines')}
            body={t('owner.noMachinesBody')}
            ctaLabel={t('owner.addMachineTitle')}
            onCtaPress={handleAddMachine}
          />
        }
      />
    </SafeAreaView>
  );
}
