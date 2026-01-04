import {User} from "./User.ts";
import {objectModes, sqlRelation} from "../backend_types.ts";

export interface Tags<K extends objectModes> {
    id: string,
    name: string;
    color: string;
    user: sqlRelation<User, K>;
    created: Date;
    updated: Date;
}