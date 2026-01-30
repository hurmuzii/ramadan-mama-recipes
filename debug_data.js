
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://epzlgnvdquiifulgprox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwemxnbnZkcXVpaWZ1bGdwcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTUxNjksImV4cCI6MjA4MzI5MTE2OX0.P8MnSSVb8agPffKJ_mlK3I5czTs7Rg0BbYWQIgJhE-Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log('Fetching recipes...');
    const { data, error } = await supabase.from('recipes').select('id, name, category');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Found', data.length, 'recipes.');
    console.log('Categories found:');
    data.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Category: "${r.category}" (Type: ${typeof r.category})`);
    });
}

check();
