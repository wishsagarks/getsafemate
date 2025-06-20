import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          emergency_contact_1_name: string | null;
          emergency_contact_1_phone: string | null;
          emergency_contact_2_name: string | null;
          emergency_contact_2_phone: string | null;
          safety_preferences: any | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          emergency_contact_1_name?: string | null;
          emergency_contact_1_phone?: string | null;
          emergency_contact_2_name?: string | null;
          emergency_contact_2_phone?: string | null;
          safety_preferences?: any | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          emergency_contact_1_name?: string | null;
          emergency_contact_1_phone?: string | null;
          emergency_contact_2_name?: string | null;
          emergency_contact_2_phone?: string | null;
          safety_preferences?: any | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};