/**
 * @file index.ts — folder barrel for the navigation module.
 * @module src/navigation
 *
 * Callers import from the folder, never the file:
 *   import { ROUTES, computeRootRoute, navigate } from '@/navigation'
 */
export { ROUTES } from './routes';
export { computeRootRoute } from './dispatcher';
export type { DispatcherState, RouteDecision } from './dispatcher';
export { navigate } from './navigate';
