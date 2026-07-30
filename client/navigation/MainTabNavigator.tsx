import React, { useState, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";

import TrainingStackNavigator from "@/navigation/TrainingStackNavigator";
import ProgressStackNavigator from "@/navigation/ProgressStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { WeightReminderPopup } from "@/components/WeightReminderPopup";
import { WeightUpsellPopup } from "@/components/WeightUpsellPopup";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  Home: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [reminderShown, setReminderShown] = useState(false);

  const handleNavigateToReminder = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Main",
        params: {
          screen: "Profile",
          params: {
            screen: "WeightReminder",
            params: { prefill: true },
          },
        },
      })
    );
  }, [navigation]);

  return (
    <>
      <WeightReminderPopup onShown={() => setReminderShown(true)} />
      {reminderShown ? null : (
        <WeightUpsellPopup onNavigateToReminder={handleNavigateToReminder} />
      )}
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.backgroundRoot,
          borderTopWidth: 0,
          borderTopColor: "transparent",
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={TrainingStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressStackNavigator}
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Feather name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </>
  );
}
