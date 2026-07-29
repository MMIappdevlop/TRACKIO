import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { NavigationContainer, createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WeightLogModal } from "@/components/WeightLogModal";
import {
  WEIGHT_REMINDER_PREFIX,
  TRAINING_REMINDER_PREFIX,
} from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const navigationRef = createNavigationContainerRef();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [weightLogVisible, setWeightLogVisible] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Handle notification taps (no-op on web)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const identifier = response.notification.request.identifier;

        if (identifier.startsWith(WEIGHT_REMINDER_PREFIX)) {
          setWeightLogVisible(true);
        } else if (identifier.startsWith(TRAINING_REMINDER_PREFIX)) {
          if (navigationRef.isReady()) {
            navigationRef.dispatch(
              CommonActions.navigate({
                name: "Main",
                params: {
                  screen: "Home",
                },
              })
            );
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Handle cold-start notification taps: when the app was fully closed and the
  // user tapped a notification to open it, `addNotificationResponseReceivedListener`
  // won't fire. Read the last response once after the navigation container is ready.
  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;

    const handleColdStartNotification = async () => {
      // Wait until the navigation container is mounted and ready
      const waitForNav = () =>
        new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (navigationRef.isReady()) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });

      await waitForNav();

      if (cancelled) return;

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!lastResponse) return;

      const identifier = lastResponse.notification.request.identifier;

      if (identifier.startsWith(WEIGHT_REMINDER_PREFIX)) {
        setWeightLogVisible(true);
      } else if (identifier.startsWith(TRAINING_REMINDER_PREFIX)) {
        navigationRef.dispatch(
          CommonActions.navigate({
            name: "Main",
            params: {
              screen: "Home",
            },
          })
        );
      }
    };

    handleColdStartNotification();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <NavigationContainer ref={navigationRef}>
              <RootStackNavigator />
            </NavigationContainer>
            <StatusBar style="light" />
            <WeightLogModal
              visible={weightLogVisible}
              onClose={() => setWeightLogVisible(false)}
            />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
