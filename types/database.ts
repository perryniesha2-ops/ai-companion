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
  id: string;                 // uuid
  user_id: string;            // auth.users.id
  companion_id: string | null;
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;                 // uuid (if DB uses bigint, change to number)
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
  created_at: string;

  // vector + metadata
  embedding: number[] | null;         // pgvector; send as number[] via REST
  kind: 'semantic' | 'episodic';
  category: string | null;            // e.g., 'personal', 'work', ...
  importance: number;                 // 1..5
  tags: string[];                     // text[] in PG
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

  // scheduling & channels
  daily_checkin_time: string;   // "HH:mm"
  daily_checkin_days: string;   // "mon,tue,wed,thu,fri"
  weekly_summary_time: string;  // "HH:mm"
  weekly_summary_day: string;   // "sun"
  timezone: string;             // IANA tz, e.g. "America/New_York"
  channel_email: boolean;
  channel_inapp: boolean;

  updatedat: string;            // trigger-maintained timestamp
};

export type CompanionRow = {
  user_id: string;         // owner (PK or unique)
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
          user_id: string;                 // keep explicit
          companion_id?: string | null;
          title?: string | null;
          archived?: boolean;
        };
        Update: Partial<Omit<ConversationRow, 'id' | 'user_id' | 'created_at'>>;
      };

      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, 'id' | 'created_at'> & {
          id?: string;          // allow DB default if set to gen_random_uuid()
          created_at?: string;  // allow DB default now()
        };
        Update: Partial<Omit<MessageRow, 'id'>>;
      };

      memories: {
        Row: MemoryRow;
        Insert: Omit<MemoryRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
          // embedding: number[] is allowed via REST payload
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

          daily_checkin_time?: string;
          daily_checkin_days?: string;
          weekly_summary_time?: string;
          weekly_summary_day?: string;
          timezone?: string;
          channel_email?: boolean;
          channel_inapp?: boolean;
        };
        Update: Partial<Omit<PreferencesRow, 'user_id' | 'updatedat'>>;
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
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Shortcuts
export type ProfilesRow = Tables<'profiles'>;
export type ConversationsRow = Tables<'conversations'>;
export type MessagesRow = Tables<'messages'>;
export type MemoriesRow = Tables<'memories'>;
export type DailyUsageRow = Tables<'daily_usage'>;
export type PreferencesRowAlias = Tables<'preferences'>;
export type CompanionsRow = Tables<'companions'>;

// Insert helpers
export type PreferencesInsert = TablesInsert<'preferences'>;
export type ConversationsInsert = TablesInsert<'conversations'>;
export type MessagesInsert = TablesInsert<'messages'>;
