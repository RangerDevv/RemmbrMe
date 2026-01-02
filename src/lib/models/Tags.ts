import {User} from "./User.ts";

export interface Tags {
    id: string,
    name: string;
    color: string;
    user: User;
    created: Date;
    updated: Date;
}