/**
 * @file ModelPicker.tsx — horizontal chip row to choose which free model handles the chat.
 * @module src/components/ai
 *
 * Renders the AVAILABLE_MODELS list as scrollable pills. Selected pill gets
 * the primary background; tapping any other pill calls `onSelect` with the
 * new model id. Caller controls the selected state — this is a dumb chip row.
 */
import { Pressable, ScrollView, Text } from 'react-native';

import { AVAILABLE_MODELS } from '@/integrations/supabase/ai';

interface ModelPickerProps {
  selected: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelPicker({ selected, onSelect, disabled = false }: ModelPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-surface border-b border-border"
      contentContainerClassName="px-3 py-2 gap-2"
    >
      {AVAILABLE_MODELS.map((m) => {
        const isActive = m.id === selected;
        return (
          <Pressable
            key={m.id}
            onPress={() => !disabled && onSelect(m.id)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full border ${
              isActive
                ? 'bg-primary border-primary'
                : 'bg-surface border-border'
            } ${disabled ? 'opacity-50' : 'active:opacity-70'}`}
          >
            <Text
              className={`text-xs font-semibold ${
                isActive ? 'text-white' : 'text-ink-soft'
              }`}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
