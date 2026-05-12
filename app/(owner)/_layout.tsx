/**
 * @file (owner)/_layout.tsx — bottom-tab layout for the owner app.
 * @module app
 *
 * Three visible tabs: Requests, AI Helper, Profile. The owner's listings
 * (formerly its own tab) is reached via a "My Machines" button on the
 * Profile screen — keeps the bottom bar uncluttered and matches the
 * renter shell's three-tab cadence.
 */
import { Tabs } from 'expo-router';
import { ClipboardList, Sparkles, User } from 'lucide-react-native';

import { colors } from '@/theme/colors';

const TAB_ICON_SIZE = 22;

export default function OwnerLayout() {
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
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <ClipboardList size={TAB_ICON_SIZE} color={color} />,
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
      {/* Hide all non-tab routes from the tab bar */}
      <Tabs.Screen name="listings" options={{ href: null }} />
      <Tabs.Screen name="add-machine" options={{ href: null }} />
      <Tabs.Screen name="machine" options={{ href: null }} />
    </Tabs>
  );
}
