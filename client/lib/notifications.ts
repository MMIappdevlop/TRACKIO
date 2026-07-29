import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") return "denied";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as NotificationPermissionStatus;
  } catch {
    return "undetermined";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") return "denied";
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status as NotificationPermissionStatus;
  } catch {
    return "denied";
  }
}

export async function cancelNotificationsByPrefix(prefix: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

export interface ReminderConfig {
  prefix: string;
  title: string;
  body: string;
  days: number[];
  hour: number;
  minute: number;
}

export async function scheduleWeeklyReminders(config: ReminderConfig): Promise<void> {
  if (Platform.OS === "web") return;

  await cancelNotificationsByPrefix(config.prefix);

  for (const dayOfWeek of config.days) {
    const identifier = `${config.prefix}_day_${dayOfWeek}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: config.title,
        body: config.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: dayOfWeek + 1,
        hour: config.hour,
        minute: config.minute,
      },
    });
  }
}

export const WEIGHT_REMINDER_PREFIX = "trackio_weight_reminder";
export const TRAINING_REMINDER_PREFIX = "trackio_training_reminder";
