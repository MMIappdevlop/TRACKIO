import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TrainingHomeScreen from "@/screens/TrainingHomeScreen";
import ProgramListScreen from "@/screens/ProgramListScreen";
import ProgramDetailScreen from "@/screens/ProgramDetailScreen";
import SessionTemplateDetailScreen from "@/screens/SessionTemplateDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TrainingStackParamList = {
  TrainingHome: undefined;
  ProgramList: undefined;
  ProgramDetail: { programId: string; programName: string };
  SessionTemplateDetail: { 
    templateId: string; 
    templateName: string;
    programId: string;
    programName: string;
  };
};

const Stack = createNativeStackNavigator<TrainingStackParamList>();

export default function TrainingStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TrainingHome"
        component={TrainingHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Trackio" />,
        }}
      />
      <Stack.Screen
        name="ProgramList"
        component={ProgramListScreen}
        options={{
          headerTitle: "Plans",
        }}
      />
      <Stack.Screen
        name="ProgramDetail"
        component={ProgramDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.programName,
        })}
      />
      <Stack.Screen
        name="SessionTemplateDetail"
        component={SessionTemplateDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.templateName,
        })}
      />
    </Stack.Navigator>
  );
}
