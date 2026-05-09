## Folder Structure

The project follows a clean, **flat-but-organized** structure. Everything inside `src/` is grouped by concern, not by feature folders. Third-party integrations are isolated as proper modules so they can be swapped or extended without touching the rest of the app.

```
namma-yantra/
├── app/                          # expo-router routes (file-based)
│   ├── _layout.tsx              # Root providers (QueryClient, SafeArea, i18n)
│   ├── index.tsx                # Splash → routes based on auth/profile
│   ├── (auth)/                  # Login, signup, role-select
│   ├── (renter)/                # Renter tab screens + nested routes
│   └── (owner)/                 # Owner tab screens + nested routes
│
├── src/
│   ├── integrations/            # All third-party service code lives here as modules
│   │   ├── supabase/
│   │   │   ├── client.ts        # createClient() singleton
│   │   │   ├── auth.ts          # signIn, signUp, signOut, getProfile, createProfile
│   │   │   ├── machines.ts      # All machines table reads/writes
│   │   │   ├── bookings.ts      # All bookings reads + edge function invokes
│   │   │   ├── storage.ts       # Image upload/delete helpers
│   │   │   ├── realtime.ts      # Channel subscription helpers
│   │   │   └── index.ts         # Barrel export
│   │   └── groq/
│   │       └── README.md        # Note: Groq is only called from edge functions
│   │
│   ├── components/              # All React Native components
│   │   ├── ui/                  # Truly shared primitives (Card, Badge, Button, EmptyState)
│   │   ├── machine/             # MachineCard, AvailabilityBadge, ConditionBadge, CategoryFilter
│   │   ├── booking/             # PriceCalculator, DateRangePicker, BookingCard, StatusBadge
│   │   └── ai/                  # AIButton, PriceSuggester, DescriptionGenerator, etc.
│   │
│   ├── hooks/                   # All TanStack Query + custom hooks
│   │   ├── useAuth.ts
│   │   ├── useMachines.ts
│   │   ├── useBookings.ts
│   │   ├── useAvailability.ts
│   │   ├── useLocation.ts
│   │   └── useDistance.ts
│   │
│   ├── stores/                  # Zustand stores (cross-cutting client state only)
│   │   ├── authStore.ts
│   │   ├── locationStore.ts
│   │   ├── filterStore.ts
│   │   └── addMachineStore.ts
│   │
│   ├── lib/                     # Pure utilities — no feature awareness, no React, no Supabase
│   │   ├── logger.ts            # Tagged logger
│   │   ├── money.ts             # paise ↔ rupees, formatPaise
│   │   ├── range.ts             # tstzrange parse/format
│   │   ├── distance.ts          # Haversine
│   │   ├── geohash.ts           # Lat/lng → geohash
│   │   ├── pricing.ts           # Price calculation
│   │   └── booking-conflict.ts  # getDisabledDates etc.
│   │
│   ├── types/
│   │   └── database.ts          # All Postgres-mirroring types
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   ├── i18n/
│   │   ├── index.ts             # i18next init
│   │   ├── en.json
│   │   └── kn.json
│   │
│   └── constants/               # Static reference data
│       ├── districts.ts         # Karnataka districts list
│       ├── brands.ts            # Tractor brands autocomplete list
│       └── crops.ts             # Crop types
│
├── supabase/
│   ├── migrations/              # SQL migrations, append-only
│   └── functions/               # Edge functions
│       ├── _shared/             # groq.ts (shared client, JWT verify, CORS)
│       ├── create-booking/
│       ├── respond-to-booking/
│       ├── ai-suggest-price/
│       ├── ai-listing-copy/
│       ├── ai-crop-recommend/
│       └── ai-condition-report/
│
├── scripts/
│   ├── seed.ts
│   └── reset-and-seed.ts
│
├── assets/                       # Fonts, icons, splash images
└── tasks/
    └── todo.md                   # Current build layer + checklist
```