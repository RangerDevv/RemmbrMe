import { Tags } from "./Tags.ts";
import { User} from "./User.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface Todo<K extends objectModes> {
    id: string;
    Title: string;
    Description: string;
    Completed: boolean;
    Url?: string;
    File?: File;
    Priority: "P1"|"P2"|"P3"|"P4"|"P5";
    Deadline?: Date;
    Tags?: sqlRelation<Tags<K>, K>[],
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: Date;
    user: sqlRelation<User, K>;
    created: Date;
    updated: Date;
}
