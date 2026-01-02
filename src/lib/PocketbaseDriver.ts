import { Todo } from "./models/Todo.ts";
import { User } from "./models/User.ts";
import { Calendar } from "./models/Calendar.ts";
import { Tags } from "./models/Tags.ts";
import {dependencies} from "./backend.ts";
import PocketBase, {RecordService} from "pocketbase";
import {iocContainer} from "./needle.ts";

interface collectionMapping {
    Todo: Todo,
    users: User,
    Calendar: Calendar,
    Tags: Tags
}

interface QueryOptions {
    filter?: string,
    expand?: string,
    sort?: string,
}

interface AuthResponse {
    record: User,
    token: string,
}

interface AuthStore {
    onChange: (callback: (token: string, record: User | null) => void) => () => void,
    clear: () => void,
    record: User,
    isValid: boolean
}

type collectionName = keyof collectionMapping
type createFields<T extends collectionName> = Omit<collectionMapping[T], "id"|"created"|"updated">
type updateFields<T extends collectionName> = Partial<createFields<T>>

class PocketbaseCollection<T extends collectionName> {
    private pb: RecordService;

    constructor(pb: PocketBase, name: T) {
        this.pb = pb.collection(name);
    }

    private _authWithPassword(usernameOrEmail: string, password: string): Promise<AuthResponse> {
        return this.pb.authWithPassword(usernameOrEmail, password);
    }

    //Only allows the method to be called on the users collection.
    public authWithPassword: (T extends "users" ? typeof this._authWithPassword: never) = this._authWithPassword as any

    public getOne(id: string, options?: QueryOptions): Promise<collectionMapping[T]> {
        return this.pb.getOne(id, options)
    }

    public getFullList(options: QueryOptions): Promise<collectionMapping[T][]> {
        return this.pb.getFullList(options)
    }

    public create(fields: createFields<T>): Promise<collectionMapping[T]> {
        return this.pb.create(fields);
    }

    public update(id: string, fields: updateFields<T>): Promise<collectionMapping[T]> {
        return this.pb.update(id, fields);
    }

    public delete(id: string): Promise<boolean> {
        return this.pb.delete(id);
    }
}

export class PocketbaseDriver {
    private readonly pb: PocketBase;

    public authStore: AuthStore;

    constructor(pb: PocketBase) {
        this.pb = pb;
        this.authStore = pb.authStore as unknown as AuthStore;
    }

    public collection<T extends collectionName>(name: T) {
        return new PocketbaseCollection(this.pb, name);
    }

    public static bind(container: iocContainer<dependencies>) {
        const pb = container.$import("pocketbase")

        container.singleton(
            "backend",
            () => new PocketbaseDriver(pb)
        )
    }
}