/**
 * @file index.ts — folder barrel for the Supabase integration.
 * @module src/integrations/supabase
 *
 * Re-exports the client singleton + the per-resource namespaces. Callers
 * always import from the folder, never the file:
 *   import { supabase, auth, machines } from '@/integrations/supabase'
 */
export { supabase } from './client';
export * as auth from './auth';
export * as machines from './machines';
export * as bookings from './bookings';
