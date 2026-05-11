/**
 * @file (renter)/profile.tsx — renter's profile + sign-out.
 * @module app
 *
 * Sign-out lives here now (was on the L1 placeholder home). Real profile
 * editing (preferred language toggle, push-token management, etc.) lands
 * in L7. L2 just shows the basics so we have somewhere to put the
 * sign-out button under the new Tabs layout.
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

export default function Profile() {
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    log.info('Profile: page visited');
  }, []);

  const handleSignOut = async () => {
    authLog.info('Profile: sign-out tapped');
    try {
      await auth.signOut();
      authLog.info('Profile: sign-out completed');
      router.replace('/(onboarding)');
    } catch (err) {
      authLog.error('signOut UI', err);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-ink text-2xl font-semibold mb-1">Profile</Text>
        <Text className="text-ink-soft text-sm mb-8">
          Account details · sign out
        </Text>

        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <Text className="text-ink-mute text-xs">Name</Text>
          <Text className="text-ink text-base font-medium mt-1">
            {profile?.display_name ?? '—'}
          </Text>
          <Text className="text-ink-mute text-xs mt-3">Location</Text>
          <Text className="text-ink text-base font-medium mt-1">
            {profile?.village ?? '—'}, {profile?.district ?? '—'}
          </Text>
          <Text className="text-ink-mute text-xs mt-3">Role</Text>
          <Text className="text-ink text-base font-medium mt-1 capitalize">
            {profile?.role ?? '—'}
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          className="bg-primary rounded-xl py-4 items-center min-h-[44px] justify-center"
        >
          <Text className="text-white text-base font-semibold">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
