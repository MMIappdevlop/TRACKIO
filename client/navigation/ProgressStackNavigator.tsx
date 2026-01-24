import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProgressHomeScreen from "@/screens/ProgressHomeScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProgressStackParamList = {
  ProgressHome: undefined;
  SessionDetail: { sessionId: string };
  TaskDetail: { taskTemplateId: string; taskName: string };
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
          headerTitle: "Session",
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.taskName,
        })}
      />
    </Stack.Navigator>
  );
}
