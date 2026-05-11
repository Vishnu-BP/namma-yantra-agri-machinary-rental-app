/**
 * @file useBookings.ts — TanStack Query hooks for the bookings domain.
 * @module src/hooks
 *
 * Three read hooks (renter list, owner list, machine bookings for conflict
 * detection) and two mutation hooks (create, respond). Stale times follow
 * CLAUDE.md: bookings are never stale (staleTime: 0) to avoid showing
 * outdated status to either party.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookings as bookingsApi } from '@/integrations/supabase';
import type { RespondToBookingParams, CreateBookingParams } from '@/integrations/supabase/bookings';

// ─── Read hooks ───────────────────────────────────────────────────────────────

/**
 * All bookings where the signed-in user is the renter.
 * Disabled when renterId is undefined (not yet loaded).
 */
export function useRenterBookings(renterId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'renter', renterId],
    queryFn: () => bookingsApi.fetchRenterBookings(renterId!),
    enabled: !!renterId,
    staleTime: 0,
  });
}

/**
 * All bookings where the signed-in user is the machine owner.
 * Disabled when ownerId is undefined.
 */
export function useOwnerBookings(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'owner', ownerId],
    queryFn: () => bookingsApi.fetchOwnerBookings(ownerId!),
    enabled: !!ownerId,
    staleTime: 0,
  });
}

/**
 * Active (pending/accepted) bookings for a specific machine.
 * Used to derive disabled calendar dates. 30s stale time is fine here since
 * a stale list only means a slightly-too-available calendar — the server's
 * EXCLUDE constraint is the real guard.
 */
export function useMachineBookings(machineId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'machine', machineId],
    queryFn: () => bookingsApi.fetchMachineBookings(machineId!),
    enabled: !!machineId,
    staleTime: 30_000,
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Creates a booking request via the create-booking edge function.
 * On success: invalidates the renter's booking list and machine bookings cache.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateBookingParams) => bookingsApi.createBooking(params),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'renter', booking.renter_id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'machine', booking.machine_id] });
    },
  });
}

/**
 * Owner accept/decline or renter cancel via the respond-to-booking edge function.
 * On success: invalidates both owner and renter booking lists and the machine cache.
 */
export function useRespondToBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: RespondToBookingParams) => bookingsApi.respondToBooking(params),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'owner', booking.owner_id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'renter', booking.renter_id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'machine', booking.machine_id] });
      void queryClient.invalidateQueries({ queryKey: ['machine', booking.machine_id] });
    },
  });
}
