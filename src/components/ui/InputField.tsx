/**
 * @file InputField.tsx — unified form field: label + input + error/hint.
 * @module src/components/ui
 *
 * Replaces the copy-pasted `Text label + TextInput + error Text` triple that
 * appears ~25 times across forms. Focus state switches the border to primary
 * via local state (NativeWind v4 has no focus-within on native).
 *
 * Designed for React Hook Form Controller wrapping:
 *   <Controller control={control} name="village"
 *     render={({ field: { onChange, value } }) => (
 *       <InputField label={t('...')} value={value} onChangeText={onChange}
 *         error={errors.village?.message} />
 *     )} />
 */
import { AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { colors } from '@/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  hint?: string;
  /** Shown inside input on the left, e.g. "₹" */
  prefix?: string;
  /** Shown inside input on the right, e.g. "/hr" */
  suffix?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInput['props']['autoComplete'];
  maxLength?: number;
  editable?: boolean;
  secureTextEntry?: boolean;
  /** Outer container layout escape hatch (mb-4, mt-2, etc.) */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  hint,
  prefix,
  suffix,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  maxLength,
  editable = true,
  secureTextEntry = false,
  className = '',
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = focused
    ? 'border-primary'
    : error
    ? 'border-error'
    : 'border-border';

  return (
    <View className={className}>
      <Text className="text-ink-soft text-sm font-medium mb-1.5">{label}</Text>

      <View
        className={`flex-row items-center bg-surface rounded-xl px-4 border ${borderClass} ${
          multiline ? 'py-3' : 'min-h-[52px]'
        } ${!editable ? 'opacity-60' : ''}`}
      >
        {prefix ? (
          <Text className="text-ink-mute text-base mr-2">{prefix}</Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMute}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          maxLength={maxLength}
          editable={editable}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-ink text-base"
          style={multiline ? { textAlignVertical: 'top', minHeight: numberOfLines * 24 } : undefined}
        />

        {suffix ? (
          <Text className="text-ink-mute text-base ml-2">{suffix}</Text>
        ) : null}
      </View>

      {error ? (
        <View className="flex-row items-center gap-1 mt-1">
          <AlertCircle size={12} color={colors.error} />
          <Text className="text-error text-xs flex-1">{error}</Text>
        </View>
      ) : hint ? (
        <Text className="text-ink-mute text-xs mt-1">{hint}</Text>
      ) : null}
    </View>
  );
}
