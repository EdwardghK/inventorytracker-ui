import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
    console.warn('Supabase environment variables are missing; using mock data.');
    return null;
  }

  client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  return client;
}
