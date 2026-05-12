/**
 * @file ai.ts — client wrapper for the `ai-chat` edge function.
 * @module src/integrations/supabase
 *
 * Exposes `chat(messages)` which invokes the edge function with the caller's
 * session token. The edge function transparently tries 5 free OpenRouter
 * models in fallback order and returns whichever succeeds first — clients
 * never pick a model. Components never call `supabase.functions.invoke`
 * directly; they go through this namespace.
 */
import { supabase } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply: string;
}

/**
 * Send the conversation so far to the chat edge function and return the
 * assistant's reply. Throws if the function returns a non-2xx or the body
 * is missing `reply`. Model selection is server-side and opaque.
 */
export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke<ChatResponse>(
    'ai-chat',
    { body: { messages } },
  );
  if (error) throw error;
  if (!data || typeof data.reply !== 'string') {
    throw new Error('Empty reply from assistant');
  }
  return data;
}
