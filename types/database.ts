// types/index.ts
// ------------------------------------------------------------
// Hand-rolled Supabase types (you can replace later with codegen)
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

// --------------------- Row models (for convenience) ---------------------

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
  id: string;       // uuid
  user_id: string;  // auth.users.id
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;                 // uuid (or text). OK if your DB uses bigint; change to number.
  user_id: string;
  conversation_id: string | null; // <— new for resuming threads
  companion_id: string | null;    // keep if you also attach to a specific companion
  role: ChatRole;                 // 'user' | 'assistant'
  content: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  conversation_id: string | null; // optional, attach memory to a thread if you want
  companion_id: string | null;
  content: string;
  importance: number;
  created_at: string;
};

export type UsageRow = {
  user_id: string;
  day: string;   // 'YYYY-MM-DD'
  count: number; // messages used that day
};

// --------------------- Supabase Database types ---------------------

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
          user_id?: string;      // defaults to auth.uid() if you set it in DB
          title?: string | null;
          archived?: boolean;
        };
        Update: Partial<Omit<ConversationRow, 'id' | 'user_id' | 'created_at'>>;
      };

      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, 'id' | 'created_at'> & {
          id?: string;          // allow DB default if you switched to uuid default
          created_at?: string;  // allow DB default now()
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
    };

    Views: Record<string, never>;

    Functions: {
      // keep these if you use them; otherwise remove
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

// --------------------- Helper generic aliases (nice DX) ---------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Common shortcuts
export type ProfilesRow = Tables<'profiles'>;
export type ConversationsRow = Tables<'conversations'>;
export type MessagesRow = Tables<'messages'>;
export type MemoriesRow = Tables<'memories'>;
export type DailyUsageRow = Tables<'daily_usage'>;
