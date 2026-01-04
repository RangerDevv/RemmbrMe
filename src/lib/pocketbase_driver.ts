import PocketBase, {RecordService} from "pocketbase";
import {iocContainer} from "./needle.ts";
import {
    AuthResponse,
    AuthStore,
    BackendCollection,
    BackendDriver,
    collectionMapping,
    collectionName,
    createFields, dependencies,
    QueryOptions,
    updateFields
} from "./backend_types.ts";

class PocketbaseCollection<T extends collectionName> implements BackendCollection<T> {
    private pb: RecordService;
    private authStore: AuthStore;

    constructor(pb: PocketBase, authStore: AuthStore, name: T) {
        this.pb = pb.collection(name);
        this.authStore = authStore;
    }

    private _authWithPassword(usernameOrEmail: string, password: string): Promise<AuthResponse> {
        return this.pb.authWithPassword(usernameOrEmail, password);
    }

    //Only allows the method to be called on the users collection.
    public authWithPassword: (T extends "users" ? typeof this._authWithPassword: never) = this._authWithPassword as any

    public getOne(id: string, options?: QueryOptions): Promise<collectionMapping[T]> {
        if (options) {
            options.filter = `${options.filter || ""} && user = ${this.authStore.record.id}`
        }
        return this.pb.getOne(id, options)
    }

    public getFullList(options: QueryOptions): Promise<collectionMapping[T][]> {
        return this.pb.getFullList(options)
    }

    public create(fields: createFields<T>): Promise<collectionMapping<"create">[T]> {
        return this.pb.create(fields);
    }

    public update(id: string, fields: updateFields<T>): Promise<collectionMapping<"create">[T]> {
        return this.pb.update(id, fields);
    }

    public delete(id: string): Promise<boolean> {
        return this.pb.delete(id);
    }
}

export class PocketbaseDriver implements BackendDriver {
    private readonly pb: PocketBase;

    public authStore: AuthStore;

    constructor(pb: PocketBase) {
        this.pb = pb;
        this.authStore = pb.authStore as unknown as AuthStore;
    }

    public collection<T extends collectionName>(name: T) {
        return new PocketbaseCollection(this.pb, this.authStore, name);
    }

    public static bind(container: iocContainer<dependencies>) {
        const pb = container.$import("pocketbase")

        container.singleton(
            "backend",
            () => new PocketbaseDriver(pb)
        )
    }
}