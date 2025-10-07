// ------------------------------------------------------------
// Hand-rolled Supabase types (replace with codegen later)
// ------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Domain enums
export type Tone = 'friendly' | 'professional' | 'funny' | 'supportive';
export type Expertise = 'generalist' | 'coach' | 'researcher' | 'therapist';
export type ChatRole = 'user' | 'assistant';

// ------------------------------------------------------------
// Row models (convenience mirrors of DB rows)
// ------------------------------------------------------------

export type ProfileRow = {
  id: string; // auth.users.id
  nickname: string | null;
  tone: Tone | null;
  expertise: Expertise | null;
  goal: string | null;
  onboarding_complete: boolean | null;
  is_premium: boolean | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;            // uuid
  user_id: string;       // auth.users.id
  companion_id: string | null; // optional relationship
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;                 // uuid (if your DB uses bigint, change to number)
  user_id: string;
  conversation_id: string | null;
  role: ChatRole;             // 'user' | 'assistant'
  content: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  companion_id: string | null;
  content: string;
  importance: number;
  created_at: string;
};

export type UsageRow = {
  user_id: string;
  day: string;   // 'YYYY-MM-DD'
  count: number;
};

export type PreferencesRow = {
  user_id: string;                // PK
  daily_checkin: boolean;
  weekly_summary: boolean;
  milestone_celebrations: boolean;
  marketing_emails: boolean;
};

export type CompanionRow = {
  user_id: string;         // owner
  name: string;
  tone: Tone;
  expertise: Expertise;
  goal: string | null;
  system_prompt: string;
  created_at: string;
  updated_at: string;
};

// ------------------------------------------------------------
// Supabase Database types
// ------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          nickname?: string | null;
          tone?: Tone | null;
          expertise?: Expertise | null;
          goal?: string | null;
          onboarding_complete?: boolean | null;
          is_premium?: boolean | null;
          stripe_customer_id?: string | null;
        };
        Update: Partial<Omit<ProfileRow, 'id'>>;
      };

      conversations: {
        Row: ConversationRow;
        Insert: {
          user_id: string;                 // required (keep explicit)
          companion_id?: string | null;
          title?: string | null;
          archived?: boolean;
        };
        Update: Partial<Omit<ConversationRow, 'id' | 'user_id' | 'created_at'>>;
      };

      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, 'id' | 'created_at'> & {
          id?: string;          // let DB default if you have uuid default
          created_at?: string;  // let DB default now()
        };
        Update: Partial<Omit<MessageRow, 'id'>>;
      };

      memories: {
        Row: MemoryRow;
        Insert: Omit<MemoryRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<MemoryRow, 'id'>>;
      };

      daily_usage: {
        Row: UsageRow;
        Insert: UsageRow;
        Update: Partial<UsageRow>;
      };

      preferences: {
        Row: PreferencesRow;
        Insert: {
          user_id: string;
          daily_checkin?: boolean;
          weekly_summary?: boolean;
          milestone_celebrations?: boolean;
          marketing_emails?: boolean;
        };
        Update: Partial<Omit<PreferencesRow, 'user_id'>>;
      };

      companions: {
        Row: CompanionRow;
        Insert: {
          user_id: string;
          name: string;
          tone: Tone;
          expertise: Expertise;
          goal?: string | null;
          system_prompt: string;
        };
        Update: Partial<Omit<CompanionRow, 'user_id'>>;
      };
    };

    Views: Record<string, never>;

    Functions: {
      ensure_profile: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      set_onboarding: {
        Args: {
          p_nickname: string | null;
          p_tone: Tone | null;
          p_expertise: Expertise | null;
          p_goal: string | null;
        };
        Returns: undefined;
      };
    };

    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ------------------------------------------------------------
// Helper generic aliases (DX)
// ------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'] [T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Shortcuts
export type ProfilesRow = Tables<'profiles'>;
export type ConversationsRow = Tables<'conversations'>;
export type MessagesRow = Tables<'messages'>;
export type MemoriesRow = Tables<'memories'>;
export type DailyUsageRow = Tables<'daily_usage'>;
export type PreferencesRow2 = Tables<'preferences'>; // alternate alias if you like
export type CompanionsRow = Tables<'companions'>;

// Also handy:
export type PreferencesInsert = TablesInsert<'preferences'>;
export type ConversationsInsert = TablesInsert<'conversations'>;
export type MessagesInsert = TablesInsert<'messages'>;

