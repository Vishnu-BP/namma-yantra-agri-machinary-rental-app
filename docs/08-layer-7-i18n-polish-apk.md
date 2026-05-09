
# LAYER 7 — i18n + polish + APK

**Goal:** App is fully bilingual (English + Kannada), visually polished, free of bugs, and exported as an APK ready for submission.

## Prerequisites
- Layer 6 complete

## Deliverables

### 7.1 i18n setup

Create `src/lib/i18n/index.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import kn from './kn.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, kn: { translation: kn } },
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v3', // for React Native
  interpolation: { escapeValue: false },
});

export default i18n;
```

Import in `app/_layout.tsx` so it initializes on app start.

### 7.2 Translation files

Create `src/lib/i18n/en.json` with comprehensive keys:

```json
{
  "common": {
    "back": "Back",
    "continue": "Continue",
    "cancel": "Cancel",
    "save": "Save",
    "confirm": "Confirm",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry"
  },
  "auth": {
    "login": { "title": "Sign in", "email": "Email", "password": "Password", "submit": "Sign in" },
    "signup": { "title": "Create account", "submit": "Create account" },
    "roleSelect": {
      "title": "Welcome to Namma-Yantra",
      "owner": "I rent out machines",
      "renter": "I rent machines from others"
    }
  },
  "discover": {
    "title": "Discover",
    "filters": { "all": "All", "tractor": "Tractors", "harvester": "Harvesters", "sprayer": "Sprayers", "tiller": "Tillers" },
    "empty": "No machines nearby",
    "kmAway": "{{km}} km away"
  },
  "booking": {
    "request": "Request rental",
    "selectDates": "Select dates",
    "duration": "Duration",
    "hourly": "Hourly",
    "daily": "Daily",
    "total": "Total",
    "send": "Send request to owner",
    "confirmTitle": "Request sent!",
    "confirmText": "{{name}} will be notified.",
    "status": {
      "pending": "Pending",
      "accepted": "Accepted",
      "declined": "Declined",
      "completed": "Completed",
      "cancelled": "Cancelled"
    }
  },
  "machine": {
    "available": "Available",
    "inUse": "In use",
    "perHour": "per hour",
    "perDay": "per day",
    "minHours": "min {{n}} hrs",
    "condition": {
      "excellent": "Excellent",
      "good": "Good",
      "fair": "Fair",
      "needs_service": "Needs Service"
    }
  },
  "ai": {
    "suggestPrice": "Suggest a fair price",
    "writeDescription": "Write description for me",
    "findMachine": "Find right machine",
    "generateReport": "Generate condition report",
    "thinking": "Thinking..."
  },
  "owner": {
    "listings": "My listings",
    "addMachine": "Add machine",
    "requests": "Requests",
    "earnings": "Earnings",
    "accept": "Accept",
    "decline": "Decline"
  }
}
```

Create `src/lib/i18n/kn.json` with all the same keys translated to Kannada. Use the existing prototype's Kannada strings as starting point; for new strings, use Google Translate or ChatGPT and verify with a native Kannada speaker.

### 7.3 Replace all UI strings

Sweep every screen/component and replace hardcoded strings with `t('...')`:

```typescript
// Before
<Text>Discover</Text>

// After
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<Text>{t('discover.title')}</Text>
```

### 7.4 Language toggle

In `app/(renter)/profile.tsx` and `app/(owner)/profile.tsx`:

```typescript
import i18n from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase/client';
import { useAuthStore } from '../../src/stores/authStore';

const profile = useAuthStore((s) => s.profile);

const toggleLang = async () => {
  const newLang = i18n.language === 'en' ? 'kn' : 'en';
  await i18n.changeLanguage(newLang);
  if (profile) {
    await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', profile.id);
  }
};
```

On app load, after profile is fetched, call `i18n.changeLanguage(profile.preferred_language)`.

### 7.5 Visual polish pass

Go screen by screen:

- [ ] **Loading skeletons** — every data-fetching screen has a skeleton, not just spinner
- [ ] **Empty states** — every list screen has a beautiful empty state with icon + copy
- [ ] **Pull-to-refresh** — on every list
- [ ] **Toast notifications** — install `react-native-toast-message` and add success/error toasts for major actions
- [ ] **Splash screen** — custom splash with logo
- [ ] **App icon** — designed and applied
- [ ] **Smooth transitions** — every navigation has the iOS-style slide
- [ ] **Tap feedback** — every Pressable has scale or opacity feedback
- [ ] **Form validation messages** — clear, actionable
- [ ] **Custom machinery icons** — replace generic Lucide icons with custom SVGs for tractor, harvester, sprayer, tiller (use the prototype's icons as reference)

### 7.6 Error handling sweep

- [ ] Every TanStack Query has `onError` showing a toast
- [ ] Every mutation has try/catch with user-facing error
- [ ] Network offline → show banner "You're offline. Some features may not work."
- [ ] AI failures → "AI suggestion unavailable. Please enter manually."
- [ ] Image upload retry button on failure

### 7.7 Demo data + reset script

Create `scripts/reset-and-seed.ts` that:
1. Deletes all rows from `bookings`, `machines`, `profiles` (cascade)
2. Deletes all storage objects in both buckets
3. Creates 2 demo accounts: `owner@demo.com` and `renter@demo.com` (password: `demo1234`)
4. Seeds 12 high-quality machines under the owner account
5. Verifies the machines have `is_currently_available = true`

This is your "clean state for demo" button.

### 7.8 EAS Build for APK

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Edit `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "<your_url>",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<your_anon_key>"
      }
    }
  }
}
```

Build:

```bash
eas build --platform android --profile preview
```

Download the APK from the link EAS provides.

### 7.9 Test the APK on a clean device

- [ ] Install APK on a fresh Android device (or wipe an emulator)
- [ ] Run through the full demo script
- [ ] Verify all 4 AI features work
- [ ] Verify Kannada renders correctly
- [ ] Verify real-time across two installs

### 7.10 Final README update

Update `README.md` with:
- Project overview + screenshots
- Features list (highlight: real-time via Postgres Changes, conflict prevention via EXCLUDE constraint)
- Setup instructions for evaluators
- Architecture diagram (link to design doc)
- Demo accounts + how to reset state
- APK download link
- Acknowledgments (Anthropic / Claude Code, Groq, Supabase)

### 7.11 Optional but impressive

- [ ] Record a 2-minute demo video, upload to YouTube unlisted, link in README
- [ ] Create a simple landing webpage at a Vercel deploy with the APK download
- [ ] Write a short blog post on Hashnode about the build experience

## Acceptance criteria for Layer 7

- [ ] App fully bilingual — every visible string responds to language toggle
- [ ] Language toggle persists across app restarts
- [ ] Kannada renders without missing glyphs on a clean device
- [ ] All visual polish items in §7.5 done
- [ ] All error states in §7.6 handled
- [ ] APK successfully built via EAS
- [ ] APK installs and runs on a clean Android device
- [ ] All success criteria from the brief verified once more
- [ ] README is comprehensive
- [ ] Repo is clean (no console.logs, no commented-out code, no .env committed)

**Commit:** `feat(L7): i18n, polish, and APK build ready`

**Tag:** `git tag v1.0.0`

---
