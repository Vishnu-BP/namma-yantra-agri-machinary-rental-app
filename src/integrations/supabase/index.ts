/**
 * @file index.ts — folder barrel for the Supabase integration.
 * @module src/integrations/supabase
 *
 * Re-exports the client singleton so callers import from the folder, not
 * the file: `import { supabase } from '@/integrations/supabase'`.
 */
export { supabase } from './client';
