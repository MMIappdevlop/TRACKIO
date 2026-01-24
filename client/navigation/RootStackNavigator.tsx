import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import SessionRunScreen from "@/screens/SessionRunScreen";
import SessionSummaryScreen from "@/screens/SessionSummaryScreen";
import AddTaskScreen from "@/screens/AddTaskScreen";
import IntervalTimerScreen from "@/screens/IntervalTimerScreen";
import ImportProgramScreen from "@/screens/ImportProgramScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  SessionRun: {
    sessionTemplateId: string;
    sessionTemplateName: string;
    programId: string;
    programName: string;
  };
  SessionSummary: {
    completedSessionId: string;
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

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
          headerTitle: "Session Complete",
          presentation: "modal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{
          headerTitle: "Add Task",
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
          headerTitle: "Import Program",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
