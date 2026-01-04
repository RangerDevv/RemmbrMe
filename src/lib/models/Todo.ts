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
    Priority: `P${number}`;
    Deadline?: string;
    Tags?: sqlRelation<Tags<K>, K>[],
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: string;
    user: sqlRelation<User<K>, K>;
    created: string;
    updated: string;
}
