import PocketBase from 'pocketbase';
import { createSignal } from 'solid-js';

// Create singleton PocketBase instance
export const pb = new PocketBase('http://127.0.0.1:8090');

// Auth state signals
export const [isAuthenticated, setIsAuthenticated] = createSignal(pb.authStore.isValid);
export const [currentUser, setCurrentUser] = createSignal(pb.authStore.record);

// Listen to auth state changes
pb.authStore.onChange((token, record) => {
    setIsAuthenticated(!!token);
    setCurrentUser(record);
});

// Auth helper functions
export const login = async (email: string, password: string) => {
    try {
        const authData = await pb.collection('users').authWithPassword(email, password);
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
        
        const record = await pb.collection('users').create(data);
        
        // Auto-login after signup
        const authData = await pb.collection('users').authWithPassword(email, password);
        // Explicitly update the signals to ensure immediate reactivity
        setIsAuthenticated(true);
        setCurrentUser(authData.record);
        
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const logout = () => {
    pb.authStore.clear();
};

export const updateProfile = async (userId: string, data: any) => {
    try {
        const record = await pb.collection('users').update(userId, data);
        return { success: true, data: record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
