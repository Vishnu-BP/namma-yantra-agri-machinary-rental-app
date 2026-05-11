/**
 * @file (owner)/profile.tsx — owner profile tab with language toggle + sign-out.
 * @module app
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

export default function OwnerProfile() {
  const { t } = useTranslation();
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
      Alert.alert(t('profile.signOutFailed'), t('common.retry'));
    }
  };

  const handleToggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'kn' : 'en';
    log.info('OwnerProfile: language toggled', { newLang });
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
      <View className="flex-1 px-6 py-6 sm:px-8 md:max-w-2xl md:mx-auto md:w-full">
        <Text className="text-ink text-2xl font-semibold mb-1">
          {profile?.display_name}
        </Text>
        <Text className="text-ink-soft text-sm mb-1">{t('auth.roleSelect.owner')}</Text>
        <Text className="text-ink-mute text-sm mb-8">
          {profile?.village}, {profile?.district}
        </Text>

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
          className="bg-error rounded-xl py-4 items-center min-h-[44px] justify-center active:opacity-70"
        >
          <Text className="text-white text-base font-semibold">{t('profile.signOut')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
