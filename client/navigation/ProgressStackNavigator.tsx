import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProgressHomeScreen from "@/screens/ProgressHomeScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import TrainingCalendarScreen from "@/screens/TrainingCalendarScreen";
import LongTermProgressScreen from "@/screens/LongTermProgressScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProgressStackParamList = {
  ProgressHome: undefined;
  SessionDetail: { sessionId: string };
  TaskDetail: { taskTemplateId: string; taskName: string };
  TrainingCalendar: undefined;
  LongTermProgress: undefined;
};

const Stack = createNativeStackNavigator<ProgressStackParamList>();

export default function ProgressStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ProgressHome"
        component={ProgressHomeScreen}
        options={{
          headerTitle: "Progress",
        }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{
          headerTitle: "Workout Details",
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.taskName,
        })}
      />
      <Stack.Screen
        name="TrainingCalendar"
        component={TrainingCalendarScreen}
        options={{
          headerTitle: "Training History",
        }}
      />
      <Stack.Screen
        name="LongTermProgress"
        component={LongTermProgressScreen}
        options={{
          headerTitle: "Long-Term Progress",
        }}
      />
    </Stack.Navigator>
  );
}
