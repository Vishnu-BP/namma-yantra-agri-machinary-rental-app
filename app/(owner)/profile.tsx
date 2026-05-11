/**
 * @file (owner)/profile.tsx — owner profile tab with sign-out.
 * @module app
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';

const log = createLogger('UI');
const authLog = createLogger('AUTH');

export default function OwnerProfile() {
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    log.info('OwnerProfile: page visited');
  }, []);

  const handleSignOut = async () => {
    authLog.info('OwnerProfile: sign-out tapped');
    try {
      await auth.signOut();
      authLog.info('OwnerProfile: sign-out completed');
      router.replace('/(onboarding)');
    } catch (err) {
      authLog.error('OwnerProfile: signOut failed', err);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 px-6 py-6 sm:px-8 md:max-w-2xl md:mx-auto md:w-full">
        <Text className="text-ink text-2xl font-semibold mb-1">
          {profile?.display_name}
        </Text>
        <Text className="text-ink-soft text-sm mb-1">Owner</Text>
        <Text className="text-ink-mute text-sm mb-8">
          {profile?.village}, {profile?.district}
        </Text>

        <Pressable
          onPress={handleSignOut}
          className="bg-error rounded-xl py-4 items-center min-h-[44px] justify-center"
        >
          <Text className="text-white text-base font-semibold">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
