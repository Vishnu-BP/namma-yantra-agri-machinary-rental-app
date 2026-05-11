/**
 * @file ChatScreen.tsx — full chat UI shared by both renter and owner ai-helper tabs.
 * @module src/components/ai
 *
 * Manages the conversation state in local component state (not persisted —
 * a fresh chat each time the tab is opened is the V1 behavior). Calls the
 * `ai-chat` edge function via the `ai` integration namespace; surfaces a
 * typing indicator while pending and a toast on error.
 *
 * The model picker lives at the top — switching mid-conversation just
 * changes which model handles the *next* message; prior context still
 * gets forwarded.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ChatInput } from '@/components/ai/ChatInput';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { ModelPicker } from '@/components/ai/ModelPicker';
import { TypingIndicator } from '@/components/ai/TypingIndicator';
import { ai } from '@/integrations/supabase';
import { DEFAULT_MODEL_ID, type ChatMessage as ChatMsg } from '@/integrations/supabase/ai';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';

const log = createLogger('AI');

interface ChatScreenProps {
  /** Logger prefix so renter / owner page-mount events are distinguishable. */
  pageTag: string;
}

export function ChatScreen({ pageTag }: ChatScreenProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);

  useEffect(() => {
    log.info(`${pageTag}: page visited`);
  }, [pageTag]);

  const handleSend = useCallback(
    async (text: string) => {
      log.info(`${pageTag}: send tapped`, { len: text.length, model });
      const next: ChatMsg[] = [...messages, { role: 'user', content: text }];
      setMessages(next);
      setPending(true);

      try {
        const { reply, model: usedModel } = await ai.chat(next, model);
        log.info(`${pageTag}: reply received`, { model: usedModel, len: reply.length });
        setMessages([...next, { role: 'assistant', content: reply }]);
      } catch (err) {
        log.error(`${pageTag}: chat failed`, err);
        toast.error(t('ai.errorTitle'), {
          description: err instanceof Error ? err.message : t('common.tryAgain'),
        });
      } finally {
        setPending(false);
      }
    },
    [messages, model, pageTag, t],
  );

  const handleSelectModel = (id: string) => {
    log.info(`${pageTag}: model switched`, { model: id });
    setModel(id);
  };

  // Auto-scroll to the newest message whenever messages or pending change.
  useEffect(() => {
    if (messages.length === 0 && !pending) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, pending]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={{
            paddingTop: 16,
            paddingBottom: 16,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
            <Sparkles size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-bold">
              {t('ai.chatTitle')}
            </Text>
            <Text className="text-white/70 text-xs mt-0.5">
              {t('ai.chatSubtitle')}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Model picker ── */}
        <ModelPicker
          selected={model}
          onSelect={handleSelectModel}
          disabled={pending}
        />

        {/* ── Message list ── */}
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Sparkles size={28} color={colors.primary} />
            </View>
            <Text className="text-ink text-lg font-bold text-center mb-2">
              {t('ai.welcome')}
            </Text>
            <Text className="text-ink-soft text-sm text-center leading-6">
              {t('ai.welcomeBody')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => `msg-${i}`}
            contentContainerClassName="px-3 pt-3 pb-2"
            renderItem={({ item }) => (
              <ChatMessage role={item.role} content={item.content} />
            )}
            ListFooterComponent={pending ? <TypingIndicator /> : null}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <ChatInput
          onSend={handleSend}
          placeholder={t('ai.placeholder')}
          disabled={pending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
