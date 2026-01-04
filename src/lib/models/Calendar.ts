import { Tags } from "./Tags.ts";
import { User } from "./User.ts";
import {Todo} from "./Todo.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface Calendar<K extends objectModes> {
    id: string;
    AllDay: boolean;
    Description: string;
    EventName: string;
    Start: string;
    End: string;
    Location: {lat: number, lon: number};
    Color: string;
    Tasks: sqlRelation<Todo<K>, K>[];
    Tags?: sqlRelation<Tags<K>, K>[];
    Recurrence?: "none"|"daily"|"weekly"|"monthly";
    RecurrencePattern?: Object;
    RecurrenceEndDate?: string;
    user: sqlRelation<User<K>, K>;
    created: string;
    updated: string;
}