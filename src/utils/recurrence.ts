import {bk, currentUser} from '../lib/backend.ts';

export interface RecurrenceOptions {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom' | 'none';
    days?: number[]; // For custom: 0=Sun, 1=Mon, ..., 6=Sat
    endDate?: Date;
    count?: number; // Max instances to create
}

/**
 * Generate recurring instances for a task
 */
export async function generateRecurringTasks(
    parentTaskId: string,
    parentTask: any,
    options: RecurrenceOptions
) {
    if (options.frequency === 'none') return [];

    const instances: any[] = [];
    const startDate = parentTask.Deadline ? new Date(parentTask.Deadline) : new Date();
    const endDate = options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
    const maxInstances = options.count || 100;

    // Use a separate date to avoid mutation issues
    let currentDate = new Date(startDate);
    let instanceCount = 0;

    // Delete existing future instances first to avoid duplicates
    try {
        await deleteFutureInstances(parentTaskId, 'Todo');
    } catch (_e) {
        // Ignore if no existing instances
    }

    while (currentDate <= endDate && instanceCount < maxInstances) {
        // Create a new Date for the next occurrence to avoid mutation bugs
        const nextDate = new Date(currentDate);
        switch (options.frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly': {
                // Handle month rollover correctly (e.g., Jan 31 -> Feb 28)
                const targetMonth = nextDate.getMonth() + 1;
                const targetYear = nextDate.getFullYear() + Math.floor(targetMonth / 12);
                const actualMonth = targetMonth % 12;
                const originalDay = startDate.getDate();
                const daysInTargetMonth = new Date(targetYear, actualMonth + 1, 0).getDate();
                nextDate.setFullYear(targetYear, actualMonth, Math.min(originalDay, daysInTargetMonth));
                break;
            }
            case 'custom': {
                const days = options.days || [];
                if (days.length === 0) { currentDate = new Date(endDate.getTime() + 1); continue; }
                let found = false;
                for (let i = 1; i <= 7; i++) {
                    const candidate = new Date(currentDate);
                    candidate.setDate(candidate.getDate() + i);
                    if (days.includes(candidate.getDay())) {
                        nextDate.setTime(candidate.getTime());
                        found = true;
                        break;
                    }
                }
                if (!found) { currentDate = new Date(endDate.getTime() + 1); continue; }
                break;
            }
        }
        currentDate = nextDate;

        if (currentDate > endDate) break;

        // Preserve the original time from the deadline
        const deadlineDate = new Date(currentDate);
        if (parentTask.Deadline) {
            const origTime = new Date(parentTask.Deadline);
            deadlineDate.setHours(origTime.getHours(), origTime.getMinutes(), origTime.getSeconds(), 0);
        }

        const userId = currentUser()?.id;

        // Create instance
        const instance: Record<string, any> = {
            Title: parentTask.Title,
            Description: parentTask.Description,
            Completed: false,
            Priority: parentTask.Priority,
            Deadline: deadlineDate.toISOString(),
            Tags: parentTask.Tags || [],
            Recurrence: options.frequency as "none"|"daily"|"weekly"|"monthly"|"custom",
            ParentTaskId: parentTaskId,
            URL: parentTask.URL || '',
        };
        if (userId) instance.user = userId;

        try {
            const created = await bk.collection('Todo').create(instance as any);
            instances.push(created);
            instanceCount++;
        } catch (error) {
            console.error('Error creating recurring task instance:', error);
        }
    }

    return instances;
}

/**
 * Generate recurring instances for an event
 */
export async function generateRecurringEvents(
    parentEventId: string,
    parentEvent: any,
    options: RecurrenceOptions
) {
    if (options.frequency === 'none') return [];

    const instances: any[] = [];
    const startDate = new Date(parentEvent.Start);
    const eventEnd = new Date(parentEvent.End);
    const duration = eventEnd.getTime() - startDate.getTime();
    const endDate = options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const maxInstances = options.count || 100;

    // Delete existing future instances first to avoid duplicates
    try {
        await deleteFutureInstances(parentEventId, 'Calendar');
    } catch (_e) {
        // Ignore if no existing instances
    }

    let currentStart = new Date(startDate);
    let instanceCount = 0;

    while (currentStart <= endDate && instanceCount < maxInstances) {
        // Create a new Date for the next occurrence
        const nextStart = new Date(currentStart);
        switch (options.frequency) {
            case 'daily':
                nextStart.setDate(nextStart.getDate() + 1);
                break;
            case 'weekly':
                nextStart.setDate(nextStart.getDate() + 7);
                break;
            case 'monthly': {
                // Handle month rollover correctly
                const targetMonth = nextStart.getMonth() + 1;
                const targetYear = nextStart.getFullYear() + Math.floor(targetMonth / 12);
                const actualMonth = targetMonth % 12;
                const originalDay = startDate.getDate();
                const daysInTargetMonth = new Date(targetYear, actualMonth + 1, 0).getDate();
                nextStart.setFullYear(targetYear, actualMonth, Math.min(originalDay, daysInTargetMonth));
                break;
            }
            case 'custom': {
                const days = options.days || [];
                if (days.length === 0) { currentStart = new Date(endDate.getTime() + 1); continue; }
                let found = false;
                for (let i = 1; i <= 7; i++) {
                    const candidate = new Date(currentStart);
                    candidate.setDate(candidate.getDate() + i);
                    if (days.includes(candidate.getDay())) {
                        nextStart.setTime(candidate.getTime());
                        found = true;
                        break;
                    }
                }
                if (!found) { currentStart = new Date(endDate.getTime() + 1); continue; }
                break;
            }
        }
        currentStart = nextStart;

        if (currentStart > endDate) break;

        const currentEnd = new Date(currentStart.getTime() + duration);
        const userId = currentUser()?.id;

        // Create instance
        const instance: Record<string, any> = {
            EventName: parentEvent.EventName,
            Description: parentEvent.Description || '',
            AllDay: parentEvent.AllDay || false,
            Start: currentStart.toISOString(),
            End: currentEnd.toISOString(),
            Color: parentEvent.Color || '#3b82f6',
            Tags: parentEvent.Tags || [],
            Recurrence: options.frequency as "none"|"daily"|"weekly"|"monthly"|"custom",
            ParentEventId: parentEventId,
            Tasks: [], // Don't duplicate tasks for recurring events
        };
        if (userId) instance.user = userId;

        try {
            const created = await bk.collection('Calendar').create(instance as any);
            instances.push(created);
            instanceCount++;
        } catch (error) {
            console.error('Error creating recurring event instance:', error);
        }
    }

    return instances;
}

/**
 * Delete all future instances of a recurring task/event
 */
export async function deleteFutureInstances(parentId: string, collection: 'Todo' | 'Calendar') {
    const fieldName = collection === 'Todo' ? 'ParentTaskId' : 'ParentEventId';
    try {
        const instances = await bk.collection(collection).getFullList({
            filter: `${fieldName} = "${parentId}"`
        });

        for (const instance of instances) {
            await bk.collection(collection).delete(instance.id);
        }
    } catch (error) {
        console.error(`Error deleting future instances for ${parentId}:`, error);
    }
}

/**
 * Update all future instances of a recurring task/event
 */
export async function updateFutureInstances(
    parentId: string,
    collection: 'Todo' | 'Calendar',
    updates: any
) {
    const fieldName = collection === 'Todo' ? 'ParentTaskId' : 'ParentEventId';
    try {
        const instances = await bk.collection(collection).getFullList({
            filter: `${fieldName} = "${parentId}"`
        });

        for (const instance of instances) {
            await bk.collection(collection).update(instance.id, updates);
        }
    } catch (error) {
        console.error(`Error updating future instances for ${parentId}:`, error);
    }
}
