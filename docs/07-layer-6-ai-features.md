
# LAYER 6 — AI features

**Goal:** All four GenAI features working end-to-end via Supabase Edge Functions calling Groq.

**Why this layer:** This is the differentiator. The marketplace works without AI — AI makes it intelligent.

## Prerequisites
- Layer 5 complete
- Groq account with API key

## Order within this layer

Build the AI features in this order — each one builds on the shared infrastructure from the previous:

1. **6.A** — Shared Groq helper + edge function infrastructure
2. **6.B** — AI Feature 1: Smart Price Suggester
3. **6.C** — AI Feature 2: Listing Copy Generator
4. **6.D** — AI Feature 3: Crop-Aware Recommender
5. **6.E** — AI Feature 4: Condition Report from Photo

Each sub-step is its own commit.

## 6.A — Shared infrastructure

### 6.A.1 Set Groq secret in Supabase

```bash
supabase secrets set GROQ_API_KEY=<your_groq_key>
```

Verify: `supabase secrets list`

### 6.A.2 Shared Groq helper

In Deno (Supabase Edge Functions runtime), we use the Groq SDK via esm.sh. To avoid duplicating the helper across all four edge functions, create a shared module.

Create `supabase/functions/_shared/groq.ts`:

```typescript
import Groq from 'https://esm.sh/groq-sdk@0.7.0';
import { z, ZodSchema } from 'https://esm.sh/zod@3.23.8';

export function getGroqClient() {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  return new Groq({ apiKey });
}

interface CallTextArgs<T> {
  systemPrompt: string;
  userMessage: string;
  schema: ZodSchema<T>;
  model?: string;
  maxRetries?: number;
}

export async function callGroqJson<T>({
  systemPrompt,
  userMessage,
  schema,
  model = 'llama-3.3-70b-versatile',
  maxRetries = 1,
}: CallTextArgs<T>): Promise<T> {
  const groq = getGroqClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error('Empty response from Groq');
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw new Error(`Groq call failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

interface CallVisionArgs<T> {
  systemPrompt: string;
  imageUrl: string;
  userMessage: string;
  schema: ZodSchema<T>;
  model?: string;
}

export async function callGroqVision<T>({
  systemPrompt,
  imageUrl,
  userMessage,
  schema,
  model = 'llama-3.2-90b-vision-preview',
}: CallVisionArgs<T>): Promise<T> {
  const groq = getGroqClient();
  // Vision models may not support response_format: json_object reliably
  // — we instruct strict JSON in the prompt and parse defensively.
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: imageUrl } },
        ] as any,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Empty vision response');
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in vision response');
  return schema.parse(JSON.parse(jsonMatch[0]));
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function requireAuth(req: Request): Promise<{ userId: string; authHeader: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, 401);
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return jsonResponse({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } }, 401);
  }
  return { userId: user.id, authHeader };
}
```

### 6.A.3 AI usage rate limiting (optional but recommended)

```bash
supabase migration new ai_usage_table
```

```sql
CREATE TABLE ai_usage (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  count       INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, function_name)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
-- Service role only; clients never read this directly
CREATE POLICY "ai_usage_service_only" ON ai_usage FOR ALL TO service_role USING (true);

CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_function TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
  current_window TIMESTAMPTZ;
BEGIN
  -- Reset window if older than 24 hours
  INSERT INTO ai_usage (user_id, function_name, count, window_start)
  VALUES (p_user_id, p_function, 1, NOW())
  ON CONFLICT (user_id, function_name)
  DO UPDATE SET
    count = CASE
      WHEN ai_usage.window_start < NOW() - INTERVAL '24 hours' THEN 1
      ELSE ai_usage.count + 1
    END,
    window_start = CASE
      WHEN ai_usage.window_start < NOW() - INTERVAL '24 hours' THEN NOW()
      ELSE ai_usage.window_start
    END
  RETURNING count INTO current_count;

  -- Cap at 50 calls per 24h per function per user
  RETURN current_count <= 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Push: `supabase db push`

### 6.A.4 Client-side AI invoke wrapper

Create `src/lib/ai.ts`:

```typescript
import { supabase } from './supabase/client';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function callAI<T>(name: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) throw new Error(error.message);
  const response = data as ApiResponse<T>;
  if (!response.success || !response.data) {
    throw new Error(response.error?.message ?? 'AI call failed');
  }
  return response.data;
}
```

### 6.A.5 Reusable AI button component

Create `src/components/ai/AIButton.tsx`:

```typescript
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface Props {
  label: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function AIButton({ label, loading, onPress, disabled, variant = 'secondary' }: Props) {
  const bg = variant === 'primary' ? 'bg-primary' : 'bg-white border border-primary';
  const textColor = variant === 'primary' ? 'text-white' : 'text-primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      className={`${bg} flex-row items-center justify-center gap-2 py-3.5 rounded-xl`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Sparkles size={16} color={variant === 'primary' ? '#fff' : colors.primary} />
      )}
      <Text className={`${textColor} font-semibold text-sm`}>
        {loading ? 'Thinking...' : label}
      </Text>
    </Pressable>
  );
}
```

## 6.B — AI Feature 1: Smart Price Suggester

### 6.B.1 Edge function

```bash
supabase functions new ai-suggest-price
```

`supabase/functions/ai-suggest-price/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.8';
import { callGroqJson, jsonResponse, corsHeaders, requireAuth } from '../_shared/groq.ts';

const InputSchema = z.object({
  category: z.enum(['tractor', 'harvester', 'sprayer', 'tiller', 'other']),
  brand: z.string().min(1),
  model: z.string().min(1),
  yearOfPurchase: z.number().int().min(1990).max(new Date().getFullYear()),
  horsepower: z.number().optional(),
  district: z.string().min(1),
});

const OutputSchema = z.object({
  suggestedHourly: z.number().int().min(50).max(5000),
  suggestedDaily: z.number().int().min(500).max(30000),
  rangeLow: z.number().int(),
  rangeHigh: z.number().int(),
  reasoning: z.string().min(10).max(500),
});

const SYSTEM_PROMPT = `You are a pricing expert for farm machinery rentals in Karnataka, India.
You help equipment owners set fair, competitive rates.

Respond with ONLY valid JSON matching this schema:
{
  "suggestedHourly": <integer in INR>,
  "suggestedDaily": <integer in INR>,
  "rangeLow": <integer in INR>,
  "rangeHigh": <integer in INR>,
  "reasoning": "<1-2 sentence explanation>"
}

Pricing context for Karnataka (2024 averages):
- Tractors (35-50 HP): ₹400-700/hour, ₹2,500-4,500/day
- Tractors (50+ HP): ₹500-900/hour, ₹3,500-6,000/day
- Harvesters: ₹1,200-2,500/hour for combine
- Sprayers: ₹150-300/hour
- Power Tillers: ₹250-450/hour, ₹1,500-2,500/day

Adjustments:
- Newer machines (< 3 years): +15-20%
- Older machines (> 7 years): -15-20%
- High-demand districts (Mandya, Mysuru, Hassan): +10%
- Daily rate ≈ 7× hourly (bulk discount).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
  }
  const input = parsed.data;

  const userMessage = `Machine details:
- Category: ${input.category}
- Brand: ${input.brand}
- Model: ${input.model}
- Year of purchase: ${input.yearOfPurchase}
- Horsepower: ${input.horsepower ?? 'unknown'}
- District: ${input.district}, Karnataka

Suggest a fair rental price.`;

  try {
    const result = await callGroqJson({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: OutputSchema,
    });
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'AI_FAILED', message: (err as Error).message } }, 500);
  }
});
```

Deploy: `supabase functions deploy ai-suggest-price --no-verify-jwt`

### 6.B.2 Client component

Create `src/components/ai/PriceSuggester.tsx`:

```typescript
import { useState } from 'react';
import { View, Text } from 'react-native';
import { AIButton } from './AIButton';
import { callAI } from '../../lib/ai';
import { rupeesToPaise } from '../../lib/money';

interface Suggestion {
  suggestedHourly: number;
  suggestedDaily: number;
  rangeLow: number;
  rangeHigh: number;
  reasoning: string;
}

interface Props {
  category: string;
  brand: string;
  model: string;
  yearOfPurchase: number;
  horsepower?: number;
  district: string;
  onUseSuggestion: (hourlyRupees: number, dailyRupees: number) => void;
}

export function PriceSuggester(props: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callAI<Suggestion>('ai-suggest-price', {
        category: props.category,
        brand: props.brand,
        model: props.model,
        yearOfPurchase: props.yearOfPurchase,
        horsepower: props.horsepower,
        district: props.district,
      });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <View className="mb-4">
      {!result && (
        <AIButton label="Suggest a fair price" onPress={run} loading={loading} />
      )}
      {error && <Text className="text-error text-sm mt-2">{error}</Text>}
      {result && (
        <View className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Text className="text-primary text-xs font-bold uppercase mb-2">AI Suggestion</Text>
          <View className="flex-row justify-between py-1">
            <Text className="text-ink-mute text-sm">Suggested hourly</Text>
            <Text className="text-primary font-mono font-semibold">₹{result.suggestedHourly}/hr</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-ink-mute text-sm">Suggested daily</Text>
            <Text className="text-primary font-mono font-semibold">₹{result.suggestedDaily}/day</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-ink-mute text-sm">Range in {props.district}</Text>
            <Text className="font-mono font-semibold">₹{result.rangeLow} – ₹{result.rangeHigh}</Text>
          </View>
          <Text className="text-ink-soft text-xs italic mt-2 mb-3">"{result.reasoning}"</Text>
          <View className="flex-row gap-2">
            <AIButton
              label="Customize"
              variant="secondary"
              onPress={() => setResult(null)}
            />
            <View className="flex-1">
              <AIButton
                label="Use suggestion"
                variant="primary"
                onPress={() => {
                  props.onUseSuggestion(result.suggestedHourly, result.suggestedDaily);
                  setResult(null);
                }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

### 6.B.3 Wire into Add Machine pricing screen

In `app/(owner)/add-machine/pricing.tsx`, add `<PriceSuggester>` above the rate inputs. The `onUseSuggestion` callback writes both rupee values into the addMachineStore.

### 6.B.4 Acceptance for 6.B

- [ ] Owner taps "Suggest a fair price" on pricing step
- [ ] Loading spinner shows for ~2-3 seconds
- [ ] Result card appears with hourly + daily rates and reasoning
- [ ] Rates are within reasonable range for the machine type
- [ ] "Use suggestion" pre-fills both rate fields
- [ ] Multiple invocations may return slightly different results (temp 0.6)

**Commit:** `feat(L6.B): AI price suggester`

## 6.C — AI Feature 2: Listing Copy Generator

### 6.C.1 Edge function

```bash
supabase functions new ai-listing-copy
```

`supabase/functions/ai-listing-copy/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.8';
import { callGroqJson, jsonResponse, corsHeaders, requireAuth } from '../_shared/groq.ts';

const InputSchema = z.object({
  category: z.enum(['tractor', 'harvester', 'sprayer', 'tiller', 'other']),
  brand: z.string(),
  model: z.string(),
  yearOfPurchase: z.number().int(),
  horsepower: z.number().optional(),
  features: z.array(z.string()),
});

const OutputSchema = z.object({
  title: z.string().min(10).max(80),
  descriptionEn: z.string().min(20).max(280),
  descriptionKn: z.string().min(20).max(280),
});

const SYSTEM_PROMPT = `You write engaging, trustworthy listing descriptions for farm machinery rentals in Karnataka. Audience: small farmers with limited literacy.

Respond with ONLY valid JSON:
{
  "title": "<≤ 60 chars, brand + model + key benefit>",
  "descriptionEn": "<2-3 short sentences, ≤ 200 chars, English>",
  "descriptionKn": "<2-3 short sentences, ≤ 200 chars, in Kannada script>"
}

Rules:
- Title: brand + model + most useful concrete fact (HP, attachment, age)
- Avoid superlatives ("best", "amazing")
- Use simple, concrete words, not marketing jargon
- Kannada MUST be in Kannada script (ಕನ್ನಡ ಲಿಪಿ), NOT Latin transliteration
- Use everyday Kannada vocabulary, not Sanskritized formal words`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
  }
  const input = parsed.data;

  const userMessage = `Create a listing for:
- Category: ${input.category}
- Brand: ${input.brand} ${input.model}
- Year: ${input.yearOfPurchase}
- HP: ${input.horsepower ?? 'unknown'}
- Features: ${input.features.join(', ') || 'none specified'}`;

  try {
    const result = await callGroqJson({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: OutputSchema,
    });
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'AI_FAILED', message: (err as Error).message } }, 500);
  }
});
```

Deploy: `supabase functions deploy ai-listing-copy --no-verify-jwt`

### 6.C.2 Client component

Create `src/components/ai/DescriptionGenerator.tsx` following the same pattern as PriceSuggester. Wire into `app/(owner)/add-machine/details.tsx` above the description input fields.

### 6.C.3 Acceptance for 6.C

- [ ] Owner taps "Write description for me" on details step
- [ ] Loading shows briefly
- [ ] Both English and Kannada descriptions appear in the result card
- [ ] **Critical:** Kannada is in actual Kannada script (verify glyphs render — characters like ಮ ಹೀ ಂ ದ್ ರಾ should appear, NOT "Mahindra")
- [ ] Title is under 60 chars
- [ ] "Use this" pre-fills the title and both description fields in the addMachineStore

**Commit:** `feat(L6.C): AI listing copy generator`

## 6.D — AI Feature 3: Crop-Aware Recommender

### 6.D.1 Edge function

```bash
supabase functions new ai-crop-recommend
```

`supabase/functions/ai-crop-recommend/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.23.8';
import { callGroqJson, jsonResponse, corsHeaders, requireAuth } from '../_shared/groq.ts';

const InputSchema = z.object({
  cropType: z.string().min(1),
  landAcres: z.number().min(0.1).max(100),
  taskType: z.enum(['ploughing', 'sowing', 'spraying', 'harvesting', 'tilling']),
  district: z.string(),
});

const OutputSchema = z.object({
  recommendedCategory: z.enum(['tractor', 'harvester', 'sprayer', 'tiller', 'other']),
  recommendedSpecs: z.string().min(5).max(200),
  estimatedHours: z.number().min(0.5).max(100),
  estimatedCost: z.object({
    low: z.number().int().min(50),
    high: z.number().int().min(50),
  }),
  reasoning: z.string().min(20).max(500),
  alternativeOptions: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are an agricultural advisor helping small farmers in Karnataka choose the right machine for a specific task.

Respond with ONLY valid JSON:
{
  "recommendedCategory": "tractor"|"harvester"|"sprayer"|"tiller"|"other",
  "recommendedSpecs": "<concrete spec>",
  "estimatedHours": <number>,
  "estimatedCost": { "low": <INR>, "high": <INR> },
  "reasoning": "<2-3 sentences plain language>",
  "alternativeOptions": ["<optional alternative>"]
}

Knowledge:
- Paddy ploughing: 35-45 HP tractor + cultivator (1.5 hr/acre)
- Paddy harvesting: combine harvester or paddy reaper (1.5-2 hr/acre)
- Sugarcane: 50+ HP tractor; harvester rare/expensive
- Areca/Coconut: spraying mostly
- Tilling small plots (<1 acre): power tiller more economical than tractor

Pricing: ₹400-700/hr tractor, ₹1200-2500/hr combine, ₹150-300/hr sprayer, ₹250-450/hr tiller.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
  }
  const input = parsed.data;

  const userMessage = `Farmer query:
- Crop: ${input.cropType}
- Land: ${input.landAcres} acres
- Task: ${input.taskType}
- District: ${input.district}, Karnataka

Recommend the right machine.`;

  try {
    const result = await callGroqJson({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: OutputSchema,
    });
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'AI_FAILED', message: (err as Error).message } }, 500);
  }
});
```

Deploy: `supabase functions deploy ai-crop-recommend --no-verify-jwt`

### 6.D.2 AI Helper screen

Replace `app/(renter)/ai-helper.tsx` with the full crop recommender UI:

- Crop chips (single-select): Paddy / Sugarcane / Areca / Coconut / Other
- Land acres stepper (0.5 increments)
- Task chips: Plough / Sow / Spray / Harvest / Till
- "Find right machine" button → calls the edge function
- Result card with recommendation, time, cost, reasoning
- "Show me X near me" CTA → navigates to discover with category filter pre-applied

For the category filter handoff, store the desired category in the locationStore or a new filterStore, then read it on the discover screen.

### 6.D.3 Acceptance for 6.D

- [ ] AI Helper screen renders the full form
- [ ] All chips and stepper work
- [ ] Submission shows result card after ~2-3s
- [ ] Recommendation is correct for the input (e.g., paddy + harvest = combine harvester)
- [ ] CTA navigates to discover with category filter active
- [ ] Estimated cost is reasonable for the land size

**Commit:** `feat(L6.D): AI crop-aware recommender`

## 6.E — AI Feature 4: Condition Report from Photo

### 6.E.1 Edge function

```bash
supabase functions new ai-condition-report
```

`supabase/functions/ai-condition-report/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { callGroqVision, jsonResponse, corsHeaders, requireAuth } from '../_shared/groq.ts';

const InputSchema = z.object({
  machineId: z.string().uuid(),
  imageUrl: z.string().url(),
  ownerNotes: z.string().optional(),
});

const OutputSchema = z.object({
  rating: z.enum(['excellent', 'good', 'fair', 'needs_service']),
  summary: z.string().min(20).max(400),
  issuesNoted: z.array(z.string()).min(0).max(8),
});

const SYSTEM_PROMPT = `You are an inspector assessing the visible condition of farm machinery from a photograph.

Respond with ONLY valid JSON:
{
  "rating": "excellent"|"good"|"fair"|"needs_service",
  "summary": "<2 sentences describing overall visible condition>",
  "issuesNoted": ["<observation 1>", "<observation 2>", ...]
}

Rating guidelines:
- "excellent" - looks new, no visible wear
- "good" - normal wear for age, no concerns
- "fair" - visible wear, still functional
- "needs_service" - visible damage, leaks, or major issues

Be honest but constructive. Note 2-4 specific observations the renter would care about.
Do NOT invent issues you cannot see. If the image is unclear, say so in the summary and rate conservatively.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const userId = auth.userId;

  const body = await req.json();
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
  }
  const input = parsed.data;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify ownership
  const { data: machine } = await admin
    .from('machines')
    .select('owner_id')
    .eq('id', input.machineId)
    .single();
  if (!machine) {
    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Machine not found' } }, 404);
  }
  if (machine.owner_id !== userId) {
    return jsonResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can generate a condition report' } }, 403);
  }

  const userMessage = `Assess this farm machine. Owner notes: ${input.ownerNotes ?? 'none'}.`;

  try {
    const result = await callGroqVision({
      systemPrompt: SYSTEM_PROMPT,
      imageUrl: input.imageUrl,
      userMessage,
      schema: OutputSchema,
    });

    // Save the report
    await admin.from('machines').update({
      condition: result.rating,
      condition_report_summary: result.summary,
      condition_report_issues: result.issuesNoted,
      condition_report_image_url: input.imageUrl,
      condition_report_generated_at: new Date().toISOString(),
    }).eq('id', input.machineId);

    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: { code: 'AI_FAILED', message: (err as Error).message } }, 500);
  }
});
```

Deploy: `supabase functions deploy ai-condition-report --no-verify-jwt`

### 6.E.2 Client flow

In owner's edit-machine screen, add a "Generate Condition Report" section.

Behavior:
1. Tap button → `expo-image-picker.launchCameraAsync()` opens camera
2. After photo capture, upload to Storage via `uploadConditionReportImage(machineId, photoUri)` → returns public URL
3. Call edge function: `await callAI<ConditionReport>('ai-condition-report', { machineId, imageUrl })`
4. Show loading state during the ~5-second AI processing
5. Display result card: rating badge + summary + issues list
6. The edge function already saves the report to the machines table; refetch the machine query so the UI updates

### 6.E.3 Display on detail screen

In `app/(renter)/machine/[id].tsx`, the condition section now reads from `condition_report_summary`, `condition_report_issues`, `condition_report_generated_at` columns and shows:
- Rating badge (color-coded by `condition` enum value)
- AI-inspected timestamp ("3 days ago" — use date-fns `formatDistanceToNow`)
- Summary in italic
- Bulleted issues list

### 6.E.4 Acceptance for 6.E

- [ ] Owner can take a fresh photo from inside the edit screen
- [ ] Photo uploads to `condition-reports` bucket successfully
- [ ] AI processes and returns within 5-8 seconds
- [ ] Condition report saves to machine row
- [ ] Renters viewing the machine see the report on detail screen
- [ ] Rating, summary, and issues all display correctly
- [ ] Timestamp shows ("Inspected 3 days ago" etc.)
- [ ] Re-generating the report updates the saved version
- [ ] **Authorization test:** sign in as a different owner, try calling the function with another machine's ID — must fail with FORBIDDEN

**Commit:** `feat(L6.E): AI condition report from photo`

## 6 — Final layer acceptance

- [ ] All 4 AI features deployed and working
- [ ] AI failure gracefully degrades (form still works without AI suggestion)
- [ ] Loading states present on every AI button
- [ ] No API keys in client code (verify via grep — `grep -r GROQ_API_KEY src/` should be empty)
- [ ] Edge function logs are clean (check Supabase dashboard → Edge Functions → Logs)

**Master commit for L6:** Already done as sub-commits. No additional commit needed.

---
