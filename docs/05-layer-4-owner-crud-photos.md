
# LAYER 4 — Owner CRUD + photos

**Goal:** Owner can create, edit, pause, archive their machine listings, including uploading real photos to Supabase Storage.

**Why this layer:** Up until now machines have been seeded. Now owners create their own.

## Prerequisites
- Layer 3 complete

## Deliverables

### 4.1 Storage buckets setup

In the Supabase dashboard, create two buckets:

1. **`machine-images`** — Public bucket. Click "Create bucket," name it `machine-images`, toggle "Public bucket" ON.
2. **`condition-reports`** — Public bucket. Same process.

Then add storage policies. In SQL editor, run:

```sql
-- Storage policies for machine-images bucket
CREATE POLICY "machine_images_read_all"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'machine-images');

CREATE POLICY "machine_images_insert_owners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'machine-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "machine_images_delete_owners"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'machine-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );

-- Same pattern for condition-reports bucket
CREATE POLICY "condition_reports_read_all"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'condition-reports');

CREATE POLICY "condition_reports_insert_owners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'condition-reports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );
```

### 4.2 Storage utilities

Create `src/lib/supabase/storage.ts`:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './client';

export async function uploadMachineImage(
  machineId: string,
  localUri: string,
  index: number
): Promise<string> {
  // Compress + resize before upload
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Read as ArrayBuffer for upload
  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${machineId}/${index}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('machine-images')
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage.from('machine-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadConditionReportImage(
  machineId: string,
  localUri: string
): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  const timestamp = Date.now();
  const path = `${machineId}/${timestamp}.jpg`;
  const { error } = await supabase.storage
    .from('condition-reports')
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('condition-reports').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMachineImages(machineId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from('machine-images')
    .list(machineId);
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${machineId}/${f.name}`);
  await supabase.storage.from('machine-images').remove(paths);
}
```

### 4.3 Machine CRUD operations

Update `src/lib/supabase/machines.ts` to add:

```typescript
import { encodeGeohash } from '../geohash';

export async function createMachine(input: {
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  ownerVillage: string;
  category: MachineCategory;
  brand: string;
  model: string;
  yearOfPurchase: number;
  horsepower?: number;
  title: string;
  descriptionEn: string;
  descriptionKn: string;
  features: string[];
  hourlyRatePaise: number;
  dailyRatePaise: number;
  minimumHours: number;
  locationLat: number;
  locationLng: number;
  village: string;
  district: string;
  condition: MachineCondition;
  lastServiceDate?: string;
}): Promise<string> {
  const geohash = encodeGeohash(input.locationLat, input.locationLng);
  const { data, error } = await supabase
    .from('machines')
    .insert({
      owner_id: input.ownerId,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      owner_village: input.ownerVillage,
      category: input.category,
      brand: input.brand,
      model: input.model,
      year_of_purchase: input.yearOfPurchase,
      horsepower: input.horsepower ?? null,
      title: input.title,
      description_en: input.descriptionEn,
      description_kn: input.descriptionKn,
      features: input.features,
      hourly_rate_paise: input.hourlyRatePaise,
      daily_rate_paise: input.dailyRatePaise,
      minimum_hours: input.minimumHours,
      location_lat: input.locationLat,
      location_lng: input.locationLng,
      village: input.village,
      district: input.district,
      geohash,
      condition: input.condition,
      last_service_date: input.lastServiceDate ?? null,
      status: 'active',
      is_currently_available: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateMachine(id: string, patch: Partial<Machine>): Promise<void> {
  // If location changed, recompute geohash
  const update: any = { ...patch };
  if (patch.location_lat !== undefined && patch.location_lng !== undefined) {
    update.geohash = encodeGeohash(patch.location_lat, patch.location_lng);
  }
  const { error } = await supabase.from('machines').update(update).eq('id', id);
  if (error) throw error;
}

export async function updateMachineImages(
  id: string,
  imageUrls: string[],
  primaryImageUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('machines')
    .update({ image_urls: imageUrls, primary_image_url: primaryImageUrl })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMachine(id: string): Promise<void> {
  const { error } = await supabase.from('machines').delete().eq('id', id);
  if (error) throw error;
}
```

### 4.4 Add Machine flow

Replace `app/(owner)/listings.tsx` with the real listings screen showing the owner's machines (using `useOwnerMachines(profile.id)`).

Create the add-machine flow at `app/(owner)/add-machine/`:

```
add-machine/
  _layout.tsx       # Stack navigator
  index.tsx         # Step 1: photos
  details.tsx       # Step 2: details
  pricing.tsx       # Step 3: pricing
```

Create a Zustand store to share state across steps.

`src/stores/addMachineStore.ts`:

```typescript
import { create } from 'zustand';
import { MachineCategory, MachineCondition } from '../types/database';

interface State {
  imageLocalUris: string[];
  primaryIndex: number;
  category: MachineCategory;
  brand: string;
  model: string;
  yearOfPurchase: number;
  horsepower?: number;
  features: string[];
  title: string;
  descriptionEn: string;
  descriptionKn: string;
  hourlyRupees: number;
  dailyRupees: number;
  minimumHours: number;
  condition: MachineCondition;
  lastServiceDate: string;
  locationLat: number;
  locationLng: number;
  set: <K extends keyof Omit<State, 'set' | 'reset'>>(key: K, value: State[K]) => void;
  reset: () => void;
}

const initial = {
  imageLocalUris: [],
  primaryIndex: 0,
  category: 'tractor' as MachineCategory,
  brand: '',
  model: '',
  yearOfPurchase: new Date().getFullYear(),
  features: [] as string[],
  title: '',
  descriptionEn: '',
  descriptionKn: '',
  hourlyRupees: 0,
  dailyRupees: 0,
  minimumHours: 2,
  condition: 'good' as MachineCondition,
  lastServiceDate: new Date().toISOString(),
  locationLat: 12.5218,
  locationLng: 76.8951,
};

export const useAddMachineStore = create<State>((set) => ({
  ...initial,
  set: (key, value) => set({ [key]: value } as any),
  reset: () => set(initial),
}));
```

**Step 1 — Photos** (`index.tsx`):
- Image picker grid (max 5 via `expo-image-picker.launchImageLibraryAsync`)
- Tap to set primary
- "Continue" button (disabled if 0 photos)

**Step 2 — Details** (`details.tsx`):
- Form with all spec fields
- Brand autocomplete from static list: Mahindra, Sonalika, John Deere, Eicher, Massey Ferguson, New Holland, TAFE, Kubota, Force, Escorts
- Features as multi-select chips
- Title + descriptions text fields (AI generation comes in L6)

**Step 3 — Pricing** (`pricing.tsx`):
- Hourly/daily inputs in rupees (UI), converted to paise on submit
- Minimum hours input
- Map widget (use `react-native-maps`) to confirm location, defaults to owner's home
- "Publish listing" button

On publish:
1. Call `createMachine()` with all fields → get back machine ID
2. Upload all images to Storage at `{machineId}/{index}.jpg`
3. Call `updateMachineImages(id, urls, urls[primaryIndex])`
4. Reset addMachineStore
5. Invalidate `['machines']` query
6. Navigate back to listings

### 4.5 Edit machine screen

Create `app/(owner)/machine/[id]/edit.tsx`:
- Pre-fill all fields from `useMachine(id)`
- Save button → `updateMachine()`
- Status toggle (Active/Paused/Archived)
- Delete button with confirmation modal (calls `deleteMachine()` and `deleteMachineImages()`)

## Acceptance criteria for Layer 4

- [ ] Owner can navigate to "Add machine" from listings tab
- [ ] Step 1 lets them pick up to 5 photos from gallery
- [ ] Photos display in grid with primary selector
- [ ] Step 2 form validates all fields (no empty brand, model, etc.)
- [ ] Step 3 lets them set rates and pin location on map
- [ ] Publishing creates a row in `machines` table + uploads images
- [ ] Public URLs of uploaded images return the actual image (test in browser)
- [ ] New machine appears in owner's listings
- [ ] New machine appears in renter's discover feed
- [ ] Edit screen pre-fills with existing data
- [ ] Saving edits updates the row correctly
- [ ] Pausing changes status to 'paused' and the machine disappears from renter's discover
- [ ] Archiving sets status to 'archived'
- [ ] Deleting prompts confirmation, then removes row + storage objects
- [ ] **RLS test:** sign in as a different user and try to UPDATE another owner's machine via SQL editor — must be denied
- [ ] Image upload compresses to under 1MB before upload (verify by checking the file size in Storage dashboard)
- [ ] No TypeScript errors

**Commit:** `feat(L4): owner CRUD with photo upload`

---
