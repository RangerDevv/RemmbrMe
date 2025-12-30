import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { pb } from './pocketbase';

interface NotificationSchedule {
  id: string;
  type: 'task' | 'event';
  title: string;
  body: string;
  time: Date;
  notified: boolean;
}

let notificationSchedule: NotificationSchedule[] = [];
let checkInterval: number | null = null;
let permissionGranted = false;

// Initialize notifications system
export async function initNotifications() {
  // Check if permission is already granted
  permissionGranted = await isPermissionGranted();

  // If not, request permission
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  if (permissionGranted) {
    console.log('✅ Notification permission granted');
    // Start checking for notifications every 30 seconds
    startNotificationChecker();
  } else {
    console.log('❌ Notification permission denied');
  }
}

// Start the notification checker interval
function startNotificationChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  // Check immediately
  checkAndSendNotifications();

  // Then check every 30 seconds
  checkInterval = window.setInterval(() => {
    checkAndSendNotifications();
  }, 30000); // 30 seconds
}

// Stop the notification checker
export function stopNotificationChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// Update notification schedule with current tasks and events
export async function updateNotificationSchedule() {
  if (!pb.authStore.isValid) return;

  const userId = pb.authStore.model?.id;
  if (!userId) return;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  notificationSchedule = [];

  try {
    // Fetch tasks due today or tomorrow
    const tasks = await pb.collection('Todos').getFullList({
      filter: `User="${userId}" && Completed=false && DueDate>="${now.toISOString()}" && DueDate<="${tomorrow.toISOString()}"`,
      sort: 'DueDate',
    });

    // Fetch events today or tomorrow
    const events = await pb.collection('Calendar').getFullList({
      filter: `User="${userId}" && Start>="${now.toISOString()}" && Start<="${tomorrow.toISOString()}"`,
      sort: 'Start',
    });

    // Schedule notifications for tasks
    for (const task of tasks) {
      const dueDate = new Date(task.DueDate);
      
      // 10 minutes before
      const tenMinsBefore = new Date(dueDate.getTime() - 10 * 60 * 1000);
      if (tenMinsBefore > now) {
        notificationSchedule.push({
          id: `task-${task.id}-10min`,
          type: 'task',
          title: '⏰ Task Reminder',
          body: `"${task.Title}" is due in 10 minutes!`,
          time: tenMinsBefore,
          notified: false,
        });
      }

      // At task time
      if (dueDate > now) {
        notificationSchedule.push({
          id: `task-${task.id}-now`,
          type: 'task',
          title: '📋 Task Due Now',
          body: `"${task.Title}" is due now!`,
          time: dueDate,
          notified: false,
        });
      }
    }

    // Schedule notifications for events
    for (const event of events) {
      const eventStart = new Date(event.Start);
      
      // 10 minutes before
      const tenMinsBefore = new Date(eventStart.getTime() - 10 * 60 * 1000);
      if (tenMinsBefore > now) {
        notificationSchedule.push({
          id: `event-${event.id}-10min`,
          type: 'event',
          title: '📅 Event Starting Soon',
          body: `"${event.EventName}" starts in 10 minutes!`,
          time: tenMinsBefore,
          notified: false,
        });
      }

      // At event time
      if (eventStart > now) {
        notificationSchedule.push({
          id: `event-${event.id}-now`,
          type: 'event',
          title: '📅 Event Starting Now',
          body: `"${event.EventName}" is starting now!`,
          time: eventStart,
          notified: false,
        });
      }
    }

    // Sort by time
    notificationSchedule.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    console.log(`📅 Scheduled ${notificationSchedule.length} notifications`);
  } catch (error) {
    console.error('Failed to update notification schedule:', error);
  }
}

// Check and send due notifications
async function checkAndSendNotifications() {
  if (!permissionGranted) return;

  const now = new Date();

  for (const notification of notificationSchedule) {
    if (!notification.notified && notification.time <= now) {
      try {
        await sendNotification({
          title: notification.title,
          body: notification.body,
          sound: 'default', // Play notification sound
        });
        notification.notified = true;
        console.log(`✅ Sent notification: ${notification.title} - ${notification.body}`);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }

  // Clean up old notifications (older than 1 hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  notificationSchedule = notificationSchedule.filter(
    (n) => n.time > oneHourAgo
  );
}

// Manually trigger notification update (call this after creating/updating/deleting tasks or events)
export function refreshNotifications() {
  updateNotificationSchedule();
}
