/**
 * @file ChatMessage.tsx — single message bubble in the AI chat thread.
 * @module src/components/ai
 *
 * Renders user messages on the right (primary background, white text) and
 * assistant messages on the left (surface background, ink text). Bubble
 * width is capped at 80% so long lines wrap before they hit the edge.
 */
import { Text, View } from 'react-native';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <View
      className={`max-w-[80%] my-1 ${isUser ? 'self-end' : 'self-start'}`}
    >
      <View
        className={`px-3.5 py-2.5 rounded-2xl ${
          isUser
            ? 'bg-primary rounded-br-md'
            : 'bg-surface border border-border rounded-bl-md'
        }`}
      >
        <Text
          className={`text-base leading-6 ${isUser ? 'text-white' : 'text-ink'}`}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}
