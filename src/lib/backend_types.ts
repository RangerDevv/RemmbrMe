import {User} from "./models/User";
import {Todo} from "./models/Todo";
import {Calendar} from "./models/Calendar";
import {Tags} from "./models/Tags";
import PocketBase from "pocketbase";

/**
 * Editable types; these should be changed when a new table is added in the db or a new dependency for IoC.
 */
export interface collectionMapping<K extends objectModes="read"> {
    Todo: Todo<K>;
    users: User;
    Calendar: Calendar<K>;
    Tags: Tags<K>;
}

export interface dependencies {
    pocketbase: PocketBase;
    backend: BackendDriver;
}

/**
 * Non-editable types; these should not be changed because they are interfaces needed to implement backend drivers.
 */

export interface QueryOptions {
    filter?: string;
    expand?: string;
    sort?: string;
    limit?: number;
}

export interface AuthResponse {
    record: User;
    token: string;
}

export interface AuthStore {
    onChange: (callback: (token: string, record: User | null) => void) => () => void;
    clear: () => void;
    record: User;
    isValid: boolean;
}

export type objectModes = "create" | "read"
export type collectionName = keyof collectionMapping<objectModes>;
export type createFields<T extends collectionName> = Omit<collectionMapping<"create">[T], "id" | "created" | "updated">;
export type updateFields<T extends collectionName> = Partial<createFields<T>>;
export type sqlRelation<T extends collectionMapping<K>[collectionName], K extends objectModes> = K extends "create" ? string : T;

export interface BackendCollection<T extends collectionName> {
    authWithPassword: (T extends "users" ? (usernameOrEmail: string, password: string) => Promise<AuthResponse> : never);
    getOne: (id: string, options: QueryOptions) => Promise<collectionMapping[T]>;
    getFullList: (options: QueryOptions) => Promise<collectionMapping[T][]>;
    create: (fields: createFields<T>) => Promise<collectionMapping<"create">[T]>;
    update: (id: string, fields: updateFields<T>) => Promise<collectionMapping<"create">[T]>;
    delete: (id: string) => Promise<boolean>;
}

export interface BackendDriver {
    authStore: AuthStore;
    collection: <T extends collectionName> (name: T) => BackendCollection<T>;
}

