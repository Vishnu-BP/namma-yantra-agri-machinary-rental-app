/**
 * @file openrouter.ts — minimal OpenRouter chat-completions client.
 * @module supabase/functions/_shared
 *
 * Wraps the global `fetch` against OpenRouter's OpenAI-compatible endpoint
 * with sensible defaults (timeout, JSON parsing, error message extraction).
 * Edge functions import `callOpenRouter` and pass the API key from
 * `Deno.env.get('OPENROUTER_API_KEY')` — the helper itself never touches
 * environment variables.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterChoice {
  message?: { role?: string; content?: string };
  finish_reason?: string;
}

interface OpenRouterResponse {
  id?: string;
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: number };
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 25_000;

export class OpenRouterError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Send a chat-completions request to OpenRouter and return the assistant's
 * reply text. Throws OpenRouterError on HTTP errors or malformed responses.
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: { timeoutMs?: number; appUrl?: string; appTitle?: string } = {},
): Promise<string> {
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500);
  if (!model) throw new OpenRouterError('model required', 400);
  if (!messages.length) throw new OpenRouterError('messages required', 400);

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Why: OpenRouter recommends both headers for attribution and to
        // avoid generic-traffic rate limits on the free tier.
        'HTTP-Referer': opts.appUrl ?? 'https://namma-yantra.app',
        'X-Title': opts.appTitle ?? 'Namma-Yantra Share',
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await safeRead(res);
      throw new OpenRouterError(
        `OpenRouter ${res.status}: ${body.slice(0, 200)}`,
        res.status,
      );
    }

    const json = (await res.json()) as OpenRouterResponse;
    if (json.error) {
      throw new OpenRouterError(
        json.error.message ?? 'OpenRouter returned an error',
        json.error.code ?? 502,
      );
    }
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new OpenRouterError('OpenRouter returned empty reply', 502);
    }
    return reply;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new OpenRouterError(`OpenRouter timeout after ${timeoutMs}ms`, 504);
    }
    if (err instanceof OpenRouterError) throw err;
    throw new OpenRouterError(`OpenRouter fetch failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

async function safeRead(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
