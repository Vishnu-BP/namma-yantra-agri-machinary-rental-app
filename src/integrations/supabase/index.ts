/**
 * @file index.ts — folder barrel for the Supabase integration.
 * @module src/integrations/supabase
 *
 * Re-exports the client singleton and the auth wrappers. Callers always
 * import from the folder, never the file:
 *   import { supabase, auth } from '@/integrations/supabase'
 */
export { supabase } from './client';
export * as auth from './auth';
