import {objectModes} from "../backend_types.ts";

export interface User<K extends objectModes> {
    id: string;
    email: string;
    emailVisibility: boolean;
    oldPassword?: K extends "create" ? string : never;
    password?: K extends "create" ? string : never;
    passwordConfirm?: K extends "create" ? string : never;
    verified?: boolean;
    name: string;
    avatar?: File;
    proUser: boolean;
    created: string;
    updated: string;
}