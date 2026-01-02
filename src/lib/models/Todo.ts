import { Tags } from "./Tags.ts";
import { User} from "./User.ts";

export interface Todo {
    id: string;
    Title: string;
    Description: string;
    Completed: boolean;
    Url?: string;
    File?: File;
    Priority: "P1"|"P2"|"P3"|"P4"|"P5";
    Deadline?: Date;
    Tags?: Tags[],
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: Date;
    user: User;
    created: Date;
    updated: Date;
}
