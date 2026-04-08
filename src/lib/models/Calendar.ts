import { Tags } from "./Tags.ts";
import { User } from "./User.ts";
import {Todo} from "./Todo.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface RecurrenceException {
    date: string;          // ISO date string of the instance being overridden
    deleted?: boolean;     // If true, this instance is removed
    EventName?: string;
    Description?: string;
    Start?: string;        // Override start time (ISO)
    End?: string;          // Override end time (ISO)
    Color?: string;
    AllDay?: boolean;
}

export interface Calendar<K extends objectModes> {
    id: string;
    AllDay: boolean;
    Description: string;
    EventName: string;
    Start: string;
    End: string;
    Color: string;
    Tasks: sqlRelation<Todo<K>, K>[];
    Tags?: sqlRelation<Tags<K>, K>[];
    Recurrence?: "none"|"daily"|"weekly"|"monthly"|"custom";
    RecurrencePattern?: { days: number[] };
    RecurrenceEndDate?: string;
    RecurrenceExceptions?: RecurrenceException[];
    user: sqlRelation<User<K>, K>;
    created: string;
    updated: string;
}