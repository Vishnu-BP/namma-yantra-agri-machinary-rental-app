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
import { Alert, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { auth } from '@/integrations/supabase';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { syncSessionAndProfile } from '@/hooks/useAuthListener';
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
      // Why: proactively sync session+profile into the store so the
      // navigation guard fires on the SAME tick the busy spinner stops.
      // Otherwise the user briefly sees /(auth) while the SIGNED_IN
      // listener races to fetch the profile in the background.
      await syncSessionAndProfile();
      log.info('Auth: OTP verified — guard will route');
    } catch (err) { log.error('verifyOtp UI', err); showError('Could not verify code', err); }
    finally { setBusy(false); }
  };

  // OAuth removed from V1 — Google/GitHub had post-auth deep-link issues
  // on Android that required app restart. Email OTP is the only sign-in.

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
