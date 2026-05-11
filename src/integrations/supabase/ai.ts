/**
 * @file ai.ts — client wrapper for the `ai-chat` edge function.
 * @module src/integrations/supabase
 *
 * Exposes `chat(messages, model)` which invokes the edge function with the
 * caller's session token. Components never call `supabase.functions.invoke`
 * directly — they go through this namespace.
 *
 * Also exports `AVAILABLE_MODELS` — the same allowlist enforced server-side,
 * mirrored here for the model-picker UI. If you change one, change both.
 */
import { supabase } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatModel {
  id: string;
  /** Friendly display name shown in the model picker. */
  label: string;
}

export const AVAILABLE_MODELS: ChatModel[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 80B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B' },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;

interface ChatResponse {
  reply: string;
  model: string;
}

/**
 * Send the conversation so far to the chat edge function and return the
 * assistant's reply. Throws if the function returns a non-2xx or the body
 * is missing `reply`.
 */
export async function chat(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL_ID,
): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke<ChatResponse>(
    'ai-chat',
    { body: { messages, model } },
  );
  if (error) throw error;
  if (!data || typeof data.reply !== 'string') {
    throw new Error('Empty reply from assistant');
  }
  return data;
}
