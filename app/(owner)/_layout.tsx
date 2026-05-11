/**
 * @file (owner)/_layout.tsx — bottom-tab layout for the owner app.
 * @module app
 *
 * Three tabs: Machines (L4), Requests (L3), Profile.
 */
import { Tabs } from 'expo-router';
import { ClipboardList, Tractor, User } from 'lucide-react-native';

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
        name="index"
        options={{
          title: 'Machines',
          tabBarIcon: ({ color }) => <Tractor size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <ClipboardList size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={TAB_ICON_SIZE} color={color} />,
        }}
      />
    </Tabs>
  );
}
