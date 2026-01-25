import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { CommonActions, StackActions } from "@react-navigation/native";

import TrainingStackNavigator from "@/navigation/TrainingStackNavigator";
import ProgressStackNavigator from "@/navigation/ProgressStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  TrainingTab: undefined;
  ProgressTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="TrainingTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          }),
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
        name="TrainingTab"
        component={TrainingStackNavigator}
        options={{
          title: "Training",
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const rootNav = navigation.getParent();
            if (rootNav) {
              rootNav.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "Main",
                      state: {
                        routes: [
                          {
                            name: "TrainingTab",
                            state: {
                              routes: [{ name: "TrainingHome" }],
                            },
                          },
                        ],
                      },
                    },
                  ],
                })
              );
            } else {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "TrainingTab" }],
                })
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressStackNavigator}
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
