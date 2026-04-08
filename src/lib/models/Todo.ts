import { Tags } from "./Tags.ts";
import { User} from "./User.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Todo<K extends objectModes> {
    id: string;
    Title: string;
    Description: string;
    Completed: boolean;
    Url?: string;
    File?: File;
    Priority: `P${number}`;
    Deadline?: string;
    Duration?: number;
    Tags?: sqlRelation<Tags<K>, K>[],
    Subtasks?: Subtask[];
    Recurrence?: "none"|"daily"|"weekly"|"monthly"|"custom";
    RecurrencePattern?: { days: number[] };
    RecurrenceEndDate?: string;
    user: sqlRelation<User<K>, K>;
    created: string;
    updated: string;
}
