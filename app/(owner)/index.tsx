/**
 * @file (owner)/index.tsx — placeholder owner home.
 * @module app
 *
 * L1 just proves auth + routing. The real owner Add Machine + Requests
 * tabs land in L3/L4. For now: greet by name, show district, and offer
 * sign-out so we can re-test the auth flow during dev.
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

export default function OwnerHome() {
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    log.info('Owner home: page visited');
  }, []);

  const handleSignOut = async () => {
    authLog.info('Owner: sign-out tapped');
    try {
      await auth.signOut();
      authLog.info('Owner home: sign-out completed');
      // Why: explicit destination. See note in (renter)/index.tsx.
      router.replace('/(onboarding)');
    } catch (err) {
      authLog.error('signOut UI', err);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Why: same responsive pattern as (auth)/index.tsx — see that file's note. */}
      <View className="flex-1 px-6 py-6 justify-center sm:px-8 sm:py-10 md:max-w-2xl md:mx-auto md:w-full md:px-12 lg:max-w-3xl lg:py-16">
        <Text className="text-ink text-2xl font-semibold mb-2">
          Welcome, {profile?.display_name}
        </Text>
        <Text className="text-ink-soft text-base mb-2">
          Owner mode — Layer 1
        </Text>
        <Text className="text-ink-mute text-sm mb-8">
          {profile?.village}, {profile?.district}
        </Text>
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
