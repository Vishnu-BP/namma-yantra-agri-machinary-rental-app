/**
 * @file (auth)/index.tsx — single auth screen.
 * @module app
 *
 * Three sign-in options: Google OAuth, GitHub OAuth, and email + 6-digit OTP.
 * After successful auth the root dispatcher handles routing (role-select for
 * new users, role home for returning users).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Tractor } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { auth } from '@/integrations/supabase';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';

const log = createLogger('AUTH');

const emailSchema = z.object({ email: z.string().email('Enter a valid email address') });
type EmailForm = z.infer<typeof emailSchema>;

const otpSchema = z.object({ token: z.string().regex(/^\d{6}$/, 'Code is 6 digits') });
type OtpForm = z.infer<typeof otpSchema>;

type Step = 'enter-email' | 'enter-otp';

export default function Auth() {
  const [step, setStep] = useState<Step>('enter-email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { log.info('Auth: page visited'); }, []);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema), defaultValues: { token: '' } });

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
    } catch (err) { log.error('sendOtp UI', err); showError('Could not send code', err); }
    finally { setBusy(false); }
  };

  const handleVerifyOtp = async (data: OtpForm) => {
    log.info('Auth: verify-OTP tapped');
    setBusy(true);
    try {
      await auth.verifyOtp(email, data.token);
      log.info('Auth: OTP verified — guard will route');
      // Why: useAuthListener picks up the SIGNED_IN event, sets the
      // store, and useNavigationGuard re-routes automatically.
    } catch (err) { log.error('verifyOtp UI', err); showError('Could not verify code', err); }
    finally { setBusy(false); }
  };

  const handleOAuth = async (provider: 'google' | 'github', fn: () => Promise<boolean>) => {
    log.info('Auth: OAuth tapped', { provider });
    setBusy(true);
    try {
      const ok = await fn();
      log.info('Auth: OAuth completed', { provider, completed: ok });
      // Why: navigation guard handles routing once the SIGNED_IN event
      // fires from supabase-js — no manual replace needed here.
    } catch (err) { log.error(`${provider} UI`, err); showError('Sign in failed', err); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 py-6 justify-center sm:px-8 md:max-w-2xl md:mx-auto md:w-full md:px-12 lg:max-w-3xl lg:py-16">

        {/* Brand block */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 bg-primary rounded-2xl items-center justify-center mb-4 shadow-cta">
            <Tractor size={32} color="white" />
          </View>
          <Text className="text-ink text-3xl font-bold mb-1">Namma-Yantra</Text>
          <Text className="text-ink-soft text-base text-center">
            Sign in or create an account to continue
          </Text>
        </View>

        {step === 'enter-email' && (
          <View>
            {/* OAuth buttons */}
            <Pressable
              onPress={() => handleOAuth('google', auth.signInWithGoogle)}
              disabled={busy}
              className="bg-surface border-2 border-border rounded-2xl items-center justify-center py-4 mb-3 min-h-[48px] shadow-card active:opacity-75"
            >
              <Text className="text-ink text-base font-medium">Continue with Google</Text>
            </Pressable>

            <Pressable
              onPress={() => handleOAuth('github', auth.signInWithGitHub)}
              disabled={busy}
              className="bg-surface border-2 border-border rounded-2xl items-center justify-center py-4 mb-6 min-h-[48px] shadow-card active:opacity-75"
            >
              <Text className="text-ink text-base font-medium">Continue with GitHub</Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-ink-mute mx-4 text-sm">or continue with email</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Email input */}
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Email address"
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={emailForm.formState.errors.email?.message}
                />
              )}
            />

            <Button
              label={busy ? 'Sending…' : 'Send code'}
              onPress={emailForm.handleSubmit(handleSendOtp)}
              variant="primary"
              size="lg"
              loading={busy}
              className="mt-6"
            />
          </View>
        )}

        {step === 'enter-otp' && (
          <View>
            <Text className="text-ink text-base mb-5 text-center">
              We sent a 6-digit code to{'\n'}
              <Text className="font-bold">{email}</Text>
            </Text>

            {/* OTP large input — kept as raw TextInput for tracking-widest styling */}
            <View className="bg-surface border-2 border-border rounded-2xl shadow-card mb-1">
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
                    className="px-4 py-5 text-ink text-3xl text-center tracking-widest"
                  />
                )}
              />
            </View>
            {otpForm.formState.errors.token && (
              <Text className="text-error text-xs mt-1 mb-3">
                {otpForm.formState.errors.token.message}
              </Text>
            )}

            <Button
              label={busy ? 'Verifying…' : 'Verify'}
              onPress={otpForm.handleSubmit(handleVerifyOtp)}
              variant="primary"
              size="lg"
              loading={busy}
              className="mt-5"
            />
            <Button
              label="Use a different email"
              onPress={() => { log.info('Auth: returned to email step'); setStep('enter-email'); }}
              variant="ghost"
              className="mt-2"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
