import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingScreen from "@/screens/OnboardingScreen";
import SessionRunScreen from "@/screens/SessionRunScreen";
import SessionSummaryScreen from "@/screens/SessionSummaryScreen";
import AddTaskScreen from "@/screens/AddTaskScreen";
import IntervalTimerScreen from "@/screens/IntervalTimerScreen";
import ImportProgramScreen from "@/screens/ImportProgramScreen";
import ProgramBuilderScreen from "@/screens/ProgramBuilderScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useSettings } from "@/hooks/useData";

export type RootStackParamList = {
  Main: undefined;
  SessionRun: {
    sessionTemplateId: string;
    sessionTemplateName: string;
    programId: string;
    programName: string;
    resumeSession?: boolean;
  };
  SessionSummary: {
    completedSessionId: string;
    completionRatio?: number;
  };
  AddTask: {
    sessionTemplateId: string;
    taskId?: string;
  };
  IntervalTimer: {
    taskName: string;
    workSeconds: number;
    restSeconds: number;
    rounds: number;
    onComplete: (roundsCompleted: number, totalSeconds: number) => void;
  };
  ImportProgram: undefined;
  ProgramBuilder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { settings, loading } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading) {
      const hasUserName = settings?.userName && settings.userName.trim().length > 0;
      setShowOnboarding(!hasUserName);
    }
  }, [settings, loading]);

  if (showOnboarding === null) {
    return null;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionRun"
        component={SessionRunScreen}
        options={({ route }) => ({
          headerTitle: route.params.sessionTemplateName,
          presentation: "modal",
          gestureEnabled: false,
        })}
      />
      <Stack.Screen
        name="SessionSummary"
        component={SessionSummaryScreen}
        options={{
          headerTitle: "Workout Summary",
          presentation: "modal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{
          headerTitle: "Add Exercise",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="IntervalTimer"
        component={IntervalTimerScreen}
        options={({ route }) => ({
          headerTitle: route.params.taskName,
          presentation: "fullScreenModal",
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="ImportProgram"
        component={ImportProgramScreen}
        options={{
          headerTitle: "Import Plan",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="ProgramBuilder"
        component={ProgramBuilderScreen}
        options={{
          headerTitle: "Create Plan",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
