import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

export interface RecurrenceOptions {
    frequency: 'daily' | 'weekly' | 'monthly' | 'none';
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

    let currentDate = new Date(startDate);
    let instanceCount = 0;

    while (currentDate <= endDate && instanceCount < maxInstances) {
        // Move to next occurrence
        switch (options.frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
        }

        if (currentDate > endDate) break;

        // Create instance
        const instance = {
            Title: parentTask.Title,
            Description: parentTask.Description,
            Completed: false,
            Priority: parentTask.Priority,
            Deadline: currentDate.toISOString().split('T')[0],
            Tags: parentTask.Tags,
            Recurrence: options.frequency,
            ParentTaskId: parentTaskId,
            URL: parentTask.URL,
        };

        try {
            const created = await pb.collection('Todo').create(instance);
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

    let currentStart = new Date(startDate);
    let instanceCount = 0;

    while (currentStart <= endDate && instanceCount < maxInstances) {
        // Move to next occurrence
        switch (options.frequency) {
            case 'daily':
                currentStart.setDate(currentStart.getDate() + 1);
                break;
            case 'weekly':
                currentStart.setDate(currentStart.getDate() + 7);
                break;
            case 'monthly':
                currentStart.setMonth(currentStart.getMonth() + 1);
                break;
        }

        if (currentStart > endDate) break;

        const currentEnd = new Date(currentStart.getTime() + duration);

        // Create instance
        const instance = {
            EventName: parentEvent.EventName,
            Description: parentEvent.Description,
            AllDay: parentEvent.AllDay,
            Start: currentStart.toISOString(),
            End: currentEnd.toISOString(),
            Location: parentEvent.Location,
            Color: parentEvent.Color,
            Tags: parentEvent.Tags,
            Recurrence: options.frequency,
            ParentEventId: parentEventId,
            Tasks: [], // Don't duplicate tasks for recurring events
        };

        try {
            const created = await pb.collection('Calendar').create(instance);
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
    const instances = await pb.collection(collection).getFullList({
        filter: `${fieldName} = "${parentId}"`
    });

    for (const instance of instances) {
        await pb.collection(collection).delete(instance.id);
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
    const instances = await pb.collection(collection).getFullList({
        filter: `${fieldName} = "${parentId}"`
    });

    for (const instance of instances) {
        await pb.collection(collection).update(instance.id, updates);
    }
}
