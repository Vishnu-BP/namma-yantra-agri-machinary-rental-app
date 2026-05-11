/**
 * @file (renter)/profile.tsx — renter's profile + language toggle + sign-out.
 * @module app
 *
 * Shows account details, a language toggle (EN ↔ ಕನ್ನಡ) that persists the
 * preference to the profiles table, and sign-out. Language is switched via
 * i18n.changeLanguage() so all t() calls re-render without a full reload.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, supabase } from '@/integrations/supabase';
import i18n from '@/lib/i18n';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';

const log = createLogger('UI');
const authLog = createLogger('AUTH');

export default function Profile() {
  const { t } = useTranslation();
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
      Alert.alert(t('profile.signOutFailed'), t('common.retry'));
    }
  };

  const handleToggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'kn' : 'en';
    log.info('Profile: language toggled', { newLang });
    await i18n.changeLanguage(newLang);
    if (profile?.id) {
      await supabase
        .from('profiles')
        .update({ preferred_language: newLang })
        .eq('id', profile.id);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-ink text-2xl font-semibold mb-1">{t('profile.title')}</Text>
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

        {/* Language toggle */}
        <View className="bg-surface border border-border rounded-xl p-4 mb-6">
          <Text className="text-ink-mute text-xs mb-3">{t('profile.language')}</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleToggleLanguage}
              className={`flex-1 py-3 rounded-xl items-center border active:opacity-70 ${
                i18n.language === 'en' ? 'bg-primary border-primary' : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  i18n.language === 'en' ? 'text-white' : 'text-ink-soft'
                }`}
              >
                {t('profile.english')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleToggleLanguage}
              className={`flex-1 py-3 rounded-xl items-center border active:opacity-70 ${
                i18n.language === 'kn' ? 'bg-primary border-primary' : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  i18n.language === 'kn' ? 'text-white' : 'text-ink-soft'
                }`}
              >
                {t('profile.kannada')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          className="bg-primary rounded-xl py-4 items-center min-h-[44px] justify-center active:opacity-70"
        >
          <Text className="text-white text-base font-semibold">{t('profile.signOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
