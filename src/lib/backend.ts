import PocketBase from 'pocketbase';
import {createSignal} from 'solid-js';
import {iocContainer} from "./needle.ts";
import {PocketbaseDriver} from "./pocketbase_driver.ts";
import {User} from "./models/User.ts";
import {dependencies, BackendDriver} from "./backend_types.ts";
import {LocalDriver, exportAllData, importAllData} from "./local_driver.ts";

// Storage mode: 'local' (default) or 'pocketbase'
const STORAGE_MODE_KEY = 'remmbrme_storage_mode';
const PB_URL_KEY = 'remmbrme_pb_url';

export function getStorageMode(): 'local' | 'pocketbase' {
    return (localStorage.getItem(STORAGE_MODE_KEY) as 'local' | 'pocketbase') || 'local';
}

export function setStorageMode(mode: 'local' | 'pocketbase') {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
}

export function getPocketBaseUrl(): string {
    return localStorage.getItem(PB_URL_KEY) || 'http://127.0.0.1:8090';
}

export function setPocketBaseUrl(url: string) {
    localStorage.setItem(PB_URL_KEY, url);
}

// Initialize backend based on storage mode
function initBackend(): BackendDriver {
    const mode = getStorageMode();
    if (mode === 'pocketbase') {
        try {
            const container = new iocContainer<dependencies>();
            container.bind("pocketbase", () => new PocketBase(getPocketBaseUrl()));
            container.load(PocketbaseDriver);
            return container.$import("backend");
        } catch (e) {
            console.warn('PocketBase connection failed, falling back to local storage:', e);
            setStorageMode('local');
            return new LocalDriver();
        }
    }
    return new LocalDriver();
}

export let bk: BackendDriver = initBackend();

// Re-initialize backend (used when switching modes)
export function reinitBackend() {
    bk = initBackend();
    setIsAuthenticated(bk.authStore.isValid);
    setCurrentUser(bk.authStore.record);
}

// Auth state signals - always authenticated in local mode
export const [isAuthenticated, setIsAuthenticated] = createSignal(true);
export const [currentUser, setCurrentUser] = createSignal<User<"read">>(bk.authStore.record);

// Listen to auth state changes
bk.authStore.onChange((token, record) => {
    setIsAuthenticated(!!token || getStorageMode() === 'local');
    setCurrentUser(record);
});

// Auth helper functions (kept for PocketBase mode compatibility)
export const login = async (email: string, password: string) => {
    try {
        const authData = await bk.collection('users').authWithPassword(email, password);
        setIsAuthenticated(true);
        setCurrentUser(authData.record);
        return { success: true, data: authData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const signup = async (email: string, password: string, passwordConfirm: string, name: string) => {
    try {
        const data = {
            email,
            emailVisibility: true,
            name,
            proUser: false,
            password,
            passwordConfirm
        };
        
        const record = await bk.collection('users').create(data);
        const authData = await bk.collection('users').authWithPassword(email, password);
        setIsAuthenticated(true);
        setCurrentUser(authData.record);
        
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const logout = () => {
    bk.authStore.clear();
};

export const updateProfile = async (userId: string, data: any) => {
    try {
        const record = await bk.collection('users').update(userId, data);
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// PocketBase backup/sync utilities
export { exportAllData, importAllData };
