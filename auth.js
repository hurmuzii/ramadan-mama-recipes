import { supabase } from './supabase';

export const auth = {
    // Check active session
    getSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Listen for auth changes
    onAuthStateChange: (callback) => {
        supabase.auth.onAuthStateChange((_event, session) => {
            callback(session);
        });
    },

    signIn: async () => {
        // For simplicity, we just prompt username/password or use a dedicated method
        // Since there is no UI logic here, we'll return the promise
        // In a real app we might redirect or show a login modal
        // We will let Main.js handle the UI part, this just exposes the function

        // Prompt user (very basic) or use provided credentials from a form
        // Assuming email/password login

        // Hardcoded dummy for demo or we need a real login form in UI
        // Since user didn't ask for a signup page, we assume Admin (Mama) already has an account
        // We will build a simple login prompt in UI
    },

    signOut: async () => {
        await supabase.auth.signOut();
    }
};
