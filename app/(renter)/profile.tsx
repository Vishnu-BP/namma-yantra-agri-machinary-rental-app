/**
 * @file (renter)/profile.tsx — renter's profile + language toggle + sign-out.
 * @module app
 *
 * Shows account details, a language toggle (EN ↔ ಕನ್ನಡ) that persists the
 * preference to the profiles table, and sign-out. Language is switched via
 * i18n.changeLanguage() so all t() calls re-render without a full reload.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogOut, MapPin, Tag, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { auth, supabase } from '@/integrations/supabase';
import i18n from '@/lib/i18n';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

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
      <ScrollView className="flex-1">
        {/* ── Gradient header banner ── */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={{ paddingTop: 40, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
            <User size={32} color="white" />
          </View>
          <Text className="text-white text-xl font-bold">
            {profile?.display_name ?? '—'}
          </Text>
          <Text className="text-white/70 text-sm mt-0.5">
            {profile?.village ?? '—'}, {profile?.district ?? '—'}
          </Text>
        </LinearGradient>

        <View className="px-6 pt-6">
          {/* ── Details card with icon-labeled rows ── */}
          <View className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden mb-6">
            <View className="flex-row items-center gap-3 px-4 py-4 border-b border-border">
              <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                <User size={16} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-ink-mute text-xs">{t('profile.name')}</Text>
                <Text className="text-ink text-base font-medium mt-0.5">
                  {profile?.display_name ?? '—'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 px-4 py-4 border-b border-border">
              <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                <MapPin size={16} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-ink-mute text-xs">{t('profile.location')}</Text>
                <Text className="text-ink text-base font-medium mt-0.5">
                  {profile?.village ?? '—'}, {profile?.district ?? '—'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 px-4 py-4">
              <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                <Tag size={16} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-ink-mute text-xs">{t('profile.role')}</Text>
                <Text className="text-ink text-base font-medium mt-0.5 capitalize">
                  {profile?.role ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Language toggle ── */}
          <View className="bg-surface border border-border rounded-2xl shadow-card p-4 mb-6">
            <Text className="text-ink-soft text-sm font-medium mb-3">{t('profile.language')}</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleToggleLanguage}
                className={`flex-1 py-3 rounded-xl items-center border-2 active:opacity-70 ${
                  i18n.language === 'en' ? 'bg-primary border-primary shadow-cta' : 'bg-surface border-border'
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
                className={`flex-1 py-3 rounded-xl items-center border-2 active:opacity-70 ${
                  i18n.language === 'kn' ? 'bg-primary border-primary shadow-cta' : 'bg-surface border-border'
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

          {/* ── Sign out (ghost — not the primary action) ── */}
          <Button
            label={t('profile.signOut')}
            onPress={handleSignOut}
            variant="ghost"
            icon={LogOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
