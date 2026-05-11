/**
 * @file ChatInput.tsx — text input + send button at the bottom of the chat screen.
 * @module src/components/ai
 *
 * Auto-grows up to ~4 lines, then scrolls. Send button is disabled when the
 * input is empty or while a previous message is in flight.
 */
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View className="flex-row items-end gap-2 bg-surface border-t border-border px-3 pt-3 pb-3">
      <View className="flex-1 bg-bg border border-border rounded-2xl px-3 min-h-[44px] justify-center">
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMute}
          multiline
          maxLength={2000}
          className="text-ink text-base py-2"
          style={{ maxHeight: 120 }}
          editable={!disabled}
        />
      </View>
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        className={`w-11 h-11 rounded-full items-center justify-center shadow-cta ${
          canSend ? 'bg-primary active:opacity-80' : 'bg-border'
        }`}
      >
        <Send size={18} color={canSend ? 'white' : colors.inkMute} />
      </Pressable>
    </View>
  );
}
