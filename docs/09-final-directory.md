
# Reference: directory at the end of build

```
namma-yantra/
├── app/                      # 18+ screens via expo-router
├── src/
│   ├── components/
│   │   ├── ui/              # Card, Badge, etc.
│   │   ├── machine/         # MachineCard, AvailabilityBadge, ...
│   │   ├── booking/         # PriceCalculator, BookingCard, ...
│   │   └── ai/              # PriceSuggester, etc.
│   ├── hooks/               # useMachines, useBookings, useAvailability, etc.
│   ├── lib/
│   │   ├── supabase/        # client, auth, machines, bookings, storage
│   │   ├── i18n/            # en.json, kn.json
│   │   ├── distance.ts
│   │   ├── pricing.ts
│   │   ├── booking-conflict.ts
│   │   ├── range.ts
│   │   ├── geohash.ts
│   │   ├── money.ts
│   │   └── ai.ts
│   ├── stores/              # authStore, locationStore, addMachineStore
│   ├── types/               # database
│   └── theme/               # colors
├── supabase/
│   ├── migrations/          # init_profiles, init_machines, init_bookings, ai_usage_table, sync_availability_function, ...
│   └── functions/
│       ├── _shared/         # groq.ts
│       ├── create-booking/
│       ├── respond-to-booking/
│       ├── ai-suggest-price/
│       ├── ai-listing-copy/
│       ├── ai-crop-recommend/
│       └── ai-condition-report/
├── scripts/
│   ├── seed.ts
│   └── reset-and-seed.ts
├── assets/
├── eas.json
├── app.json
├── tailwind.config.js
├── babel.config.js
├── .env.example
├── README.md
├── CLAUDE.md
└── PRD.md (this file)
```

