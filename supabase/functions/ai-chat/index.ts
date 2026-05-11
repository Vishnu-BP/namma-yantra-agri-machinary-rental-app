/**
 * @file ai-chat/index.ts — Edge function: chat with the in-app assistant.
 * @module edge-functions
 *
 * POST { messages: [{role, content}, ...], model: string }
 *
 * Validates the JWT, picks an allowed model, prepends the Namma-Yantra
 * system prompt, and forwards to OpenRouter. Returns the assistant's
 * reply text.
 *
 * The OpenRouter API key lives only in `Deno.env.get('OPENROUTER_API_KEY')`
 * — set via `supabase secrets set OPENROUTER_API_KEY=...`. Never logged.
 *
 * Auth: caller must be authenticated. Anonymous abuse of the free key
 * is blocked at the JWT check.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { callOpenRouter, OpenRouterError, type ChatMessage } from '../_shared/openrouter.ts';
import { NAMMA_YANTRA_SYSTEM_PROMPT } from './system-prompt.ts';

// ─── CORS / response helpers ──────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── Allowed models — verified live on OpenRouter ─────────────────────────────

// Why pinned: lets us reject arbitrary model strings from the client (which
// would otherwise be a free way to test paid models if the key has credit).
const ALLOWED_MODELS = new Set<string>([
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
]);

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// ─── Body validation ──────────────────────────────────────────────────────────

interface RequestBody {
  messages?: unknown;
  model?: unknown;
}

function isValidMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === 'user' || obj.role === 'assistant') &&
    typeof obj.content === 'string' &&
    obj.content.length > 0 &&
    obj.content.length <= 4000
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    console.log('[ai-chat] missing Supabase env vars');
    return json({ error: 'Server misconfigured' }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // ── Body parsing ────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return json({ error: 'messages must be a non-empty array' }, 400);
  }
  if (rawMessages.length > 30) {
    return json({ error: 'messages too long (max 30 turns)' }, 400);
  }
  if (!rawMessages.every(isValidMessage)) {
    return json({ error: 'messages contain invalid entries' }, 400);
  }

  const requestedModel = typeof body.model === 'string' ? body.model : DEFAULT_MODEL;
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

  // ── OpenRouter call ─────────────────────────────────────────────────────
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    console.log('[ai-chat] OPENROUTER_API_KEY not set');
    return json({ error: 'AI service not configured' }, 500);
  }

  const messagesForLlm: ChatMessage[] = [
    { role: 'system', content: NAMMA_YANTRA_SYSTEM_PROMPT },
    ...(rawMessages as ChatMessage[]),
  ];

  try {
    const reply = await callOpenRouter(apiKey, model, messagesForLlm);
    console.log(`[ai-chat] ok user=${user.id.slice(0, 8)} model=${model} reply_len=${reply.length}`);
    return json({ reply, model });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      console.log(`[ai-chat] openrouter error status=${err.status} msg=${err.message}`);
      return json({ error: err.message }, err.status >= 400 && err.status < 600 ? err.status : 502);
    }
    console.log('[ai-chat] unexpected error', err);
    return json({ error: 'AI request failed' }, 502);
  }
});
