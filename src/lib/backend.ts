import PocketBase from 'pocketbase';
import {createSignal} from 'solid-js';
import {iocContainer} from "./needle.ts";
import {PocketbaseDriver} from "./pocketbase_driver.ts";
import {User} from "./models/User.ts";
import {dependencies} from "./backend_types.ts";

export const container = new iocContainer<dependencies>()

container.bind(
    "pocketbase",
    () => new PocketBase('http://127.0.0.1:8090')
)

container.load(PocketbaseDriver)

export const bk = container.$import("backend")

// Auth state signals
export const [isAuthenticated, setIsAuthenticated] = createSignal(bk.authStore.isValid);
export const [currentUser, setCurrentUser] = createSignal<User<"read">>(bk.authStore.record);

// Listen to auth state changes
bk.authStore.onChange((token, record) => {
    setIsAuthenticated(!!token);
    setCurrentUser(record);
});

// Auth helper functions
export const login = async (email: string, password: string) => {
    try {
        const authData = await bk.collection('users').authWithPassword(email, password);
        // Explicitly update the signals to ensure immediate reactivity
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
        
        // Auto-login after signup
        const authData = await bk.collection('users').authWithPassword(email, password);
        // Explicitly update the signals to ensure immediate reactivity
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
