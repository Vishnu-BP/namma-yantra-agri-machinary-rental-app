
## Features — Complete Scope (Build End-to-End)

These are every user-facing feature in V1. Layers in `PRD.md` build them in dependency order. Nothing on this list is optional; nothing not on this list is in scope without explicit approval.


### Renter — Discovery
- Discover feed sorted by distance from current GPS
- Category filter pills: All, Tractors, Harvesters, Sprayers, Tillers
- Machine card showing image, title, brand+model, owner+village, distance, hourly rate, live availability badge
- Map view toggle (markers per category, distance-coded)
- Pull-to-refresh
- Empty state when nothing matches the filter
- Loading skeletons while fetching

### Machine Detail
- Image carousel with swipe pagination
- Live availability badge subscribed to Postgres Changes
- Pricing block (hourly + daily rates with minimum-hours hint)
- About section with English/Kannada toggle
- AI condition report section (rating + summary + bullet observations + timestamp)
- Owner card with name, village, completed-rentals count
- Booked-dates calendar showing unavailable windows
- "Request rental" floating CTA

### Renter — Booking Flow
- Multi-step booking: schedule → review → confirmation
- Calendar with disabled (red) booked dates and disabled past dates
- Hourly / Daily mode toggle
- Time-of-day pickers (hourly mode)
- Stepper for duration value (1–24 hours, 1–30 days)
- Live price calculator showing the formula explicitly: "3 days × ₹3,500 = ₹10,500"
- Optional notes-to-owner field
- Server-authoritative price computation (edge function)
- DB-level conflict prevention via EXCLUDE constraint
- Confirmation screen with checkmark animation

### Renter — My Bookings
- Bookings tab with status filter pills: All / Pending / Accepted / Past
- Booking card per row (image, title, dates, total, status badge)
- Cancel pending request
- Cancel accepted booking (with confirmation)
- Owner phone reveal + dialer launch after acceptance
- Past bookings (completed/declined/cancelled) read-only

### AI Helper (Renter)
- Conversational form: crop chips, land-acres stepper, task chips
- AI recommendation card with category, specs, estimated hours, cost range, reasoning
- "Show me X near me" CTA pre-applies category filter and navigates to Discover

### Owner — Listings Management
- My Listings home tab with active count and total earnings header
- Per-machine card with status pill, bookings count, earnings, hourly rate
- Add Machine FAB
- Edit machine (full form pre-filled)
- Pause / Archive / Delete machine
- Long-press context menu

### Owner — Add Machine Flow (3 steps)
- Step 1: Photo upload (max 5, primary selector, expo-image-picker)
- Step 2: Specs (category, brand autocomplete, model, year, HP, features chips, condition, last service date) + AI listing copy generator
- Step 3: Pricing + location pin (with AI price suggester) + publish action
- Image compression to 1024px / 80% before upload
- Storage uploads to `machine-images/{machineId}/{i}.jpg`

### Owner — Requests
- Requests tab with status filter pills: Pending / Accepted / Past
- Request card showing renter info (name, village, primary crop), schedule, total, optional notes
- Accept / Decline actions (Decline opens reason modal)
- Edge function authorizes the action and updates `is_currently_available` if the booking covers now

### Owner — Earnings Dashboard
- Hero card with total earnings + change-from-last-month
- Stat cards: completed rentals, active days
- Monthly bar chart (last 6 months, current month emphasized)
- Per-machine earnings breakdown
- All figures computed from `bookings` table, no real money movement

### AI — Four Production Features
- **Smart Price Suggester** (owner pricing step) — Groq text model with regional context
- **Listing Copy Generator** (owner details step) — Groq text model, returns title + EN + KN
- **Crop-Aware Recommender** (renter AI Helper tab) — Groq text model with agronomic knowledge
- **Condition Report from Photo** (owner edit screen) — Groq vision model, owner-only, saves to machine row
- All AI calls routed through edge functions (Groq key never on client)
- All return strict JSON validated by Zod
- All have graceful fallback messaging on failure
- Per-user rate limit of 50 calls per 24h per function

### Real-Time Availability
- `is_currently_available` column on `machines` broadcasts via Postgres Changes
- AvailabilityBadge subscribes per-machine on detail screens
- Discover feed subscribes once, patches TanStack cache on updates
- Sub-second propagation across devices
- Scheduled `pg_cron` job reconciles drift every 15 minutes
- Cleanup of channels on unmount (no leaks)

### Notifications
- Expo Push Notifications via FCM
- Push token saved to `profiles.expo_push_token` on login
- Database trigger inserts notification row on booking status change
- Edge function dispatches push from notification queue
- Deep-link to relevant booking detail screen on tap

### Localization
- Bilingual UI: English + Kannada
- All strings via `t('key')` from i18next, never hardcoded
- Language toggle in profile, persists to `profiles.preferred_language`
- AI content generated in both languages in a single Groq call
- Kannada always in Kannada script (ಕನ್ನಡ ಲಿಪಿ), enforced by system prompt

### Visual Polish
- Earthy color palette (mustard ochre primary, forest green accent, warm cream background)
- Cormorant Garamond serif for titles, Inter for body, JetBrains Mono for prices
- Custom machinery SVG icons (tractor, harvester, sprayer, tiller)
- Loading skeletons on every data screen
- Empty states with icon + copy on every list
- Pull-to-refresh on every list
- Toast notifications via `sonner-native` for major actions
- Splash screen with logo + custom app icon
- iOS-style horizontal slide page transitions
- Tap feedback (scale or opacity) on every Pressable

### Offline Behavior
- Persistent offline banner ("You're offline. Some features may not work.")
- Cached data remains readable (TanStack stale-while-revalidate)
- Booking creation refuses offline (cannot be queued — needs server-authoritative checks)
- AI features show "AI requires internet. Please enter manually."
- Image cache via `expo-image` disk cache

### Submission Deliverables
- Working Android APK via EAS Build
- Public GitHub repo with README, screenshots, setup instructions
- Demo accounts (`owner@demo.com` and `renter@demo.com`, password `demo1234`)
- 12 high-quality seeded machines across categories
- Reset script to restore clean demo state
- 5-minute demo video
- Architecture and PRD documentation
