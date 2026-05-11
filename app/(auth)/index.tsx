/**
 * @file (auth)/index.tsx — single auth screen.
 * @module app
 *
 * Three sign-in options on one screen: Google OAuth, GitHub OAuth, and
 * email + 6-digit OTP. The OTP flow auto-creates the auth user if the
 * email is new (Supabase default). After successful auth, the auth
 * listener populates `authStore`; the root dispatcher takes over and
 * redirects to role-select (fresh user) or the role-specific home.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { auth, supabase } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

/**
 * After a successful sign-in, figure out where to send the user.
 * Existing user with a profile → their role's home. Fresh user → role-select.
 * We fetch profile inline (rather than waiting for the auth listener) so the
 * navigation doesn't race the listener's async setState.
 */
async function navigateAfterAuth(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    log.warn('Auth: no session after sign-in, returning to (auth)');
    router.replace('/(auth)');
    return;
  }
  const profile = await auth.getProfile(session.user.id);
  // Atomic store update so any listener re-runs see consistent state.
  useAuthStore.setState({ session, profile });
  if (!profile) {
    router.replace('/(auth)/role-select');
    return;
  }
  router.replace(profile.role === 'owner' ? '/(owner)' : '/(renter)');
}

const log = createLogger('AUTH');

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type EmailForm = z.infer<typeof emailSchema>;

const otpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, 'Code is 6 digits'),
});
type OtpForm = z.infer<typeof otpSchema>;

type Step = 'enter-email' | 'enter-otp';

export default function Auth() {
  const [step, setStep] = useState<Step>('enter-email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    log.info('Auth: page visited');
  }, []);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  });

  const showError = (title: string, err: unknown) =>
    Alert.alert(title, err instanceof Error ? err.message : 'Please try again.');

  const handleSendOtp = async (data: EmailForm) => {
    log.info('Auth: send-code tapped');
    setBusy(true);
    try {
      await auth.sendOtp(data.email);
      setEmail(data.email);
      setStep('enter-otp');
      log.info('Auth: OTP step entered');
    } catch (err) {
      log.error('sendOtp UI', err);
      showError('Could not send code', err);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (data: OtpForm) => {
    log.info('Auth: verify-OTP tapped');
    setBusy(true);
    try {
      await auth.verifyOtp(email, data.token);
      log.info('Auth: OTP verified');
      await navigateAfterAuth();
    } catch (err) {
      log.error('verifyOtp UI', err);
      showError('Could not verify code', err);
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (
    provider: 'google' | 'github',
    fn: () => Promise<boolean>
  ) => {
    log.info('Auth: OAuth tapped', { provider });
    setBusy(true);
    try {
      const ok = await fn();
      log.info('Auth: OAuth completed', { provider, completed: ok });
      // Why: only the native path returns control here after a successful
      // sign-in (web does a full-page redirect and never reaches this line).
      if (ok) await navigateAfterAuth();
    } catch (err) {
      log.error(`${provider} UI`, err);
      showError('Sign in failed', err);
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEmail = () => {
    log.info('Auth: returned to email step');
    setStep('enter-email');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Why: responsive container. Mobile is full-bleed (default px-6); md+ caps
          width + centers so desktop browsers don't render 1920px-wide buttons.
          NativeWind v4 evaluates breakpoints from useWindowDimensions on native and
          via CSS media queries on web — same className across platforms. */}
      <View className="flex-1 px-6 py-6 justify-center sm:px-8 sm:py-10 md:max-w-2xl md:mx-auto md:w-full md:px-12 lg:max-w-3xl lg:py-16">
        <Text className="text-ink text-3xl font-semibold mb-2">Namma-Yantra</Text>
        <Text className="text-ink-soft text-base mb-10">
          Sign in or create an account to continue
        </Text>

        {step === 'enter-email' && (
          <View>
            <Pressable
              onPress={() => handleOAuth('google', auth.signInWithGoogle)}
              disabled={busy}
              className="bg-surface border border-border rounded-xl items-center justify-center py-4 mb-3 min-h-[44px]"
            >
              <Text className="text-ink text-base font-medium">
                Continue with Google
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleOAuth('github', auth.signInWithGitHub)}
              disabled={busy}
              className="bg-surface border border-border rounded-xl items-center justify-center py-4 mb-6 min-h-[44px]"
            >
              <Text className="text-ink text-base font-medium">
                Continue with GitHub
              </Text>
            </Pressable>

            <View className="flex-row items-center my-2">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-ink-mute mx-4">or</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            <Text className="text-ink-soft text-sm mt-6 mb-2">Email</Text>
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.inkMute}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-base"
                />
              )}
            />
            {emailForm.formState.errors.email && (
              <Text className="text-error text-sm mt-1">
                {emailForm.formState.errors.email.message}
              </Text>
            )}

            <Pressable
              onPress={emailForm.handleSubmit(handleSendOtp)}
              disabled={busy}
              className="bg-primary rounded-xl py-4 items-center mt-6 min-h-[44px] justify-center"
            >
              <Text className="text-white text-base font-semibold">
                {busy ? 'Sending…' : 'Send code'}
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'enter-otp' && (
          <View>
            <Text className="text-ink text-base mb-2">
              Sent a 6-digit code to <Text className="font-semibold">{email}</Text>
            </Text>
            <Controller
              control={otpForm.control}
              name="token"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="123456"
                  placeholderTextColor={colors.inkMute}
                  keyboardType="number-pad"
                  maxLength={6}
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-2xl text-center tracking-widest mt-4"
                />
              )}
            />
            {otpForm.formState.errors.token && (
              <Text className="text-error text-sm mt-1">
                {otpForm.formState.errors.token.message}
              </Text>
            )}
            <Pressable
              onPress={otpForm.handleSubmit(handleVerifyOtp)}
              disabled={busy}
              className="bg-primary rounded-xl py-4 items-center mt-6 min-h-[44px] justify-center"
            >
              <Text className="text-white text-base font-semibold">
                {busy ? 'Verifying…' : 'Verify'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleChangeEmail}
              className="items-center mt-4 min-h-[44px] justify-center"
            >
              <Text className="text-ink-soft text-sm">Use a different email</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
