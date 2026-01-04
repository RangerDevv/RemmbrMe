import { Tags } from "./Tags.ts";
import { User } from "./User.ts";
import {Todo} from "./Todo.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface Calendar<K extends objectModes> {
    id: string;
    AllDay: boolean;
    Description: string;
    EventName: string;
    Start: Date;
    End: Date;
    Location: {lat: number, lon: number};
    Color: string;
    Tasks: sqlRelation<Todo<K>, K>[];
    Tags?: sqlRelation<Tags<K>, K>[];
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: Date;
    user: sqlRelation<User, K>;
    created: Date;
    updated: Date;
}