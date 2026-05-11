/**
 * @file (renter)/_layout.tsx — bottom-tab layout for the renter app.
 * @module app
 *
 * Four tabs per the L2 spec:
 *   Discover (machines feed) · Bookings (L3) · AI Helper (L6) · Profile
 * Detail / nested routes (e.g., machine/[id]) render inside the tab navigator
 * and hide the tab bar by default — see expo-router's Tabs docs.
 */
import { Tabs } from 'expo-router';
import { Calendar, Search, Sparkles, User } from 'lucide-react-native';

import { colors } from '@/theme/colors';

const TAB_ICON_SIZE = 22;

export default function RenterLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMute,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Search size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <Calendar size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-helper"
        options={{
          title: 'AI Helper',
          tabBarIcon: ({ color }) => <Sparkles size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      {/* Why: hide the (renter)/index route from the tab bar — it just
          redirects to /discover so old links keep working. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {/* Why: machine/[id] and book/[machineId] are sub-routes accessed via push; not tabs. */}
      <Tabs.Screen name="machine/[id]" options={{ href: null }} />
      <Tabs.Screen name="book/[machineId]" options={{ href: null }} />
    </Tabs>
  );
}
