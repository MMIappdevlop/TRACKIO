import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileHomeScreen from "@/screens/ProfileHomeScreen";
import BadgesScreen from "@/screens/BadgesScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import DataBackupScreen from "@/screens/DataBackupScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Badges: undefined;
  Settings: undefined;
  DataBackup: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileHomeScreen}
        options={{
          headerTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="Badges"
        component={BadgesScreen}
        options={{
          headerTitle: "Badges",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="DataBackup"
        component={DataBackupScreen}
        options={{
          headerTitle: "Data & Backup",
        }}
      />
    </Stack.Navigator>
  );
}
