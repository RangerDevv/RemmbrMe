import { Tags } from "./Tags.ts";
import { User } from "./User.ts";

export interface Calendar {
    id: string;
    AllDay: boolean;
    Description: string;
    Tags?: Tags[];
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: Date;
    user: User;
    Start: Date;
    End: Date;
    Color: string;
    created: Date;
    updated: Date;
}