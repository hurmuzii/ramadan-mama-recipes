import { supabase } from './supabase';

export const recipesApi = {
    // Fetch all recipes
    getAll: async () => {
        // Select *
        let { data, error } = await supabase
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching recipes:', error);
            return [];
        }
        return data;
    },

    add: async (recipe) => {
        const { data, error } = await supabase
            .from('recipes')
            .insert([recipe])
            .select();

        if (error) throw error;
        return data;
    },

    delete: async (id) => {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('recipes')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data;
    },

    // Search helper (Supabase text search or client side filtering)
    // For simplicity and small dataset, we can filter client side or use .ilike
    search: async (query) => {
        let { data, error } = await supabase
            .from('recipes')
            .select('*')
            .or(`name.ilike.%${query}%,ingredients.ilike.%${query}%`)
            .order('created_at', { ascending: false });

        if (error) return [];
        return data;
    }
};
