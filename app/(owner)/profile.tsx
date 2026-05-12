/**
 * @file (owner)/profile.tsx — owner profile tab with language toggle + sign-out.
 * @module app
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogOut, MapPin, ShoppingCart, Tag, Tractor, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { VIEW_MODE_STORAGE_KEY } from '@/hooks/useAuthListener';
import { auth, supabase } from '@/integrations/supabase';
import i18n from '@/lib/i18n';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

const log = createLogger('UI');
const authLog = createLogger('AUTH');

export default function OwnerProfile() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const setViewMode = useAuthStore((s) => s.setViewMode);

  useEffect(() => {
    log.info('OwnerProfile: page visited');
  }, []);

  const handleSwitchToRenter = async () => {
    log.info('OwnerProfile: view mode switched', { mode: 'renter' });
    setViewMode('renter');
    try {
      await AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, 'renter');
    } catch (err) {
      log.error('viewMode persist failed', err);
    }
    router.replace('/(renter)');
  };

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

          {/* ── View-mode toggle — flip between renter/owner shells ── */}
          <View className="bg-surface border border-border rounded-2xl shadow-card p-4 mb-6">
            <Text className="text-ink-soft text-sm font-medium mb-3">
              {t('profile.viewMode')}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleSwitchToRenter}
                className="flex-1 py-3 rounded-xl items-center border-2 bg-surface border-border active:opacity-70 flex-row justify-center gap-2"
              >
                <ShoppingCart size={16} color={colors.inkSoft} />
                <Text className="text-ink-soft font-semibold text-sm">
                  {t('profile.viewAsRenter')}
                </Text>
              </Pressable>
              <Pressable
                disabled
                className="flex-1 py-3 rounded-xl items-center border-2 bg-primary border-primary shadow-cta flex-row justify-center gap-2"
              >
                <Tractor size={16} color="white" />
                <Text className="text-white font-semibold text-sm">
                  {t('profile.viewAsOwner')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── My Machines — primary CTA, replaces the deprecated Machines tab ── */}
          <Button
            label={t('profile.myMachines')}
            onPress={() => {
              log.info('OwnerProfile: my-machines tapped');
              router.push('/(owner)/listings' as Parameters<typeof router.push>[0]);
            }}
            variant="primary"
            icon={Tractor}
            className="mb-3"
          />

          {/* ── Sign out (ghost) ── */}
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
