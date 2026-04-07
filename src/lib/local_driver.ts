import {
    AuthResponse,
    AuthStore,
    BackendCollection,
    BackendDriver,
    collectionMapping,
    collectionName,
    createFields,
    QueryOptions,
    updateFields
} from "./backend_types.ts";
import { User } from "./models/User.ts";

// Generate unique IDs
function generateId(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 15);
}

function getStorageKey(collection: string): string {
    return `remmbrme_${collection}`;
}

function loadCollection<T>(collection: string): T[] {
    try {
        const raw = localStorage.getItem(getStorageKey(collection));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCollection<T>(collection: string, data: T[]): void {
    localStorage.setItem(getStorageKey(collection), JSON.stringify(data));
}

// Ensure a default local user exists
function ensureLocalUser(): User<"read"> {
    const key = getStorageKey('users');
    let users = loadCollection<User<"read">>(key.replace('remmbrme_', ''));
    if (users.length === 0) {
        const now = new Date().toISOString();
        const user: User<"read"> = {
            id: 'local_user_001',
            email: 'local@remmbrme.app',
            emailVisibility: false,
            name: 'User',
            proUser: false,
            created: now,
            updated: now,
        };
        users = [user];
        saveCollection('users', users);
    }
    return users[0];
}

class LocalCollection<T extends collectionName> implements BackendCollection<T> {
    private collectionName: T;
    private localUser: User<"read">;

    constructor(name: T, localUser: User<"read">) {
        this.collectionName = name;
        this.localUser = localUser;
    }

    private _authWithPassword(_usernameOrEmail: string, _password: string): Promise<AuthResponse> {
        return Promise.resolve({
            record: this.localUser,
            token: 'local_token'
        });
    }

    public authWithPassword: (T extends "users" ? typeof this._authWithPassword : never) = this._authWithPassword as any;

    public async getOne(id: string, options?: QueryOptions): Promise<collectionMapping[T]> {
        const items = loadCollection<any>(this.collectionName);
        const item = items.find((i: any) => i.id === id);
        if (!item) throw new Error(`Record not found: ${id}`);
        
        if (options?.expand) {
            return this.expandRelations(item, options.expand) as collectionMapping[T];
        }
        return item;
    }

    public async getFullList(options?: QueryOptions): Promise<collectionMapping[T][]> {
        let items = loadCollection<any>(this.collectionName);

        // Apply filter (basic support for user filter and field filters)
        if (options?.filter) {
            items = this.applyFilter(items, options.filter);
        }

        // Apply sort
        if (options?.sort) {
            items = this.applySort(items, options.sort);
        }

        // Apply limit
        if (options?.limit) {
            items = items.slice(0, options.limit);
        }

        // Expand relations
        if (options?.expand) {
            items = items.map((item: any) => this.expandRelations(item, options.expand!));
        }

        return items;
    }

    public async create(fields: createFields<T>): Promise<collectionMapping<"create">[T]> {
        const items = loadCollection<any>(this.collectionName);
        const now = new Date().toISOString();
        const record = {
            ...fields,
            id: generateId(),
            created: now,
            updated: now,
        };
        items.push(record);
        saveCollection(this.collectionName, items);
        return record as any;
    }

    public async update(id: string, fields: updateFields<T>): Promise<collectionMapping<"create">[T]> {
        const items = loadCollection<any>(this.collectionName);
        const index = items.findIndex((i: any) => i.id === id);
        if (index === -1) throw new Error(`Record not found: ${id}`);
        
        items[index] = {
            ...items[index],
            ...fields,
            updated: new Date().toISOString(),
        };
        saveCollection(this.collectionName, items);
        return items[index] as any;
    }

    public async delete(id: string): Promise<boolean> {
        const items = loadCollection<any>(this.collectionName);
        const filtered = items.filter((i: any) => i.id !== id);
        if (filtered.length === items.length) throw new Error(`Record not found: ${id}`);
        saveCollection(this.collectionName, filtered);
        return true;
    }

    private applyFilter(items: any[], filter: string): any[] {
        // Parse basic filter expressions like: user = "id" && field = "value"
        // Support: =, !=, ~, basic && and ||
        const conditions = filter.split('&&').map(c => c.trim()).filter(c => c);
        
        return items.filter(item => {
            return conditions.every(condition => {
                // Handle = operator
                const eqMatch = condition.match(/^(\w+)\s*=\s*"([^"]*)"$/);
                if (eqMatch) {
                    const [, field, value] = eqMatch;
                    return String(item[field]) === value;
                }
                
                // Handle != operator
                const neqMatch = condition.match(/^(\w+)\s*!=\s*"([^"]*)"$/);
                if (neqMatch) {
                    const [, field, value] = neqMatch;
                    return String(item[field]) !== value;
                }

                // Handle ~ (contains) operator
                const containsMatch = condition.match(/^(\w+)\s*~\s*"([^"]*)"$/);
                if (containsMatch) {
                    const [, field, value] = containsMatch;
                    return String(item[field] || '').toLowerCase().includes(value.toLowerCase());
                }

                // If we can't parse, include the item
                return true;
            });
        });
    }

    private applySort(items: any[], sort: string): any[] {
        const fields = sort.split(',').map(s => s.trim());
        
        return [...items].sort((a, b) => {
            for (const field of fields) {
                const desc = field.startsWith('-');
                const key = desc ? field.slice(1) : field;
                const aVal = a[key];
                const bVal = b[key];
                
                if (aVal === bVal) continue;
                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
                const comparison = String(aVal).localeCompare(String(bVal));
                return desc ? -comparison : comparison;
            }
            return 0;
        });
    }

    private expandRelations(item: any, expand: string): any {
        const result = { ...item, expand: {} as any };
        const fields = expand.split(',').map(f => f.trim());
        
        for (const field of fields) {
            const ids = item[field];
            if (!ids) continue;

            // Determine the collection to look up based on field name
            let targetCollection: string;
            switch (field) {
                case 'Tags': targetCollection = 'Tags'; break;
                case 'Tasks': targetCollection = 'Todo'; break;
                case 'user': targetCollection = 'users'; break;
                default: targetCollection = field; break;
            }

            const targetItems = loadCollection<any>(targetCollection);

            if (Array.isArray(ids)) {
                result.expand[field] = ids
                    .map((id: string) => targetItems.find((t: any) => t.id === id))
                    .filter(Boolean);
            } else {
                result.expand[field] = targetItems.find((t: any) => t.id === ids);
            }
        }
        
        return result;
    }
}

class LocalAuthStore implements AuthStore {
    private _user: User<"read">;
    private _callbacks: Array<(token: string, record: User<"read">) => void> = [];

    constructor() {
        this._user = ensureLocalUser();
    }

    onChange(callback: (token: string, record: User<"read">) => void): () => void {
        this._callbacks.push(callback);
        return () => {
            this._callbacks = this._callbacks.filter(cb => cb !== callback);
        };
    }

    clear(): void {
        // No-op for local - we don't clear local auth
    }

    get record(): User<"read"> {
        return this._user;
    }

    get isValid(): boolean {
        return true; // Always valid for local storage
    }

    updateUser(user: User<"read">): void {
        this._user = user;
        const users = loadCollection<any>('users');
        const idx = users.findIndex((u: any) => u.id === user.id);
        if (idx >= 0) {
            users[idx] = { ...users[idx], ...user, updated: new Date().toISOString() };
        }
        saveCollection('users', users);
        this._callbacks.forEach(cb => cb('local_token', this._user));
    }
}

export class LocalDriver implements BackendDriver {
    public authStore: LocalAuthStore;

    constructor() {
        this.authStore = new LocalAuthStore();
    }

    public collection<T extends collectionName>(name: T): BackendCollection<T> {
        return new LocalCollection(name, this.authStore.record);
    }
}

// Export/Import functions for PocketBase sync
export function exportAllData(): string {
    const collections = ['Todo', 'Calendar', 'Tags', 'users', 'FutureNotes'];
    const data: Record<string, any[]> = {};
    for (const col of collections) {
        data[col] = loadCollection(col);
    }
    return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): void {
    const data = JSON.parse(jsonString);
    for (const [collection, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
            saveCollection(collection, items);
        }
    }
}
