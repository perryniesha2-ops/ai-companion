// Solid manual types (replace with "supabase gen types" later if you want)
export type Tone = 'friendly' | 'professional' | 'funny' | 'supportive';
export type Expertise = 'generalist' | 'coach' | 'researcher' | 'therapist';

export type MessageRow = {
  id: string;
  user_id: string;
  companion_id: string | null;
  content: string;
  sender: 'user' | 'ai';
  created_at: string;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  companion_id: string | null;
  content: string;
  importance: number;
  created_at: string;
};

export type ProfileRow = {
  id: string; // references auth.users.id
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

export type UsageRow = {
  user_id: string;
  day: string;   // 'YYYY-MM-DD'
  count: number; // messages used that day
};

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, 'id' | 'created_at'>;
        Update: Partial<Omit<MessageRow, 'id'>>;
      };
      memories: {
        Row: MemoryRow;
        Insert: Omit<MemoryRow, 'id' | 'created_at'>;
        Update: Partial<Omit<MemoryRow, 'id'>>;
      };
      profiles: {
        Row: ProfileRow;
        // ⬇️ Insert must have id; others optional (match Supabase defaults)
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
      daily_usage: {
        Row: UsageRow;
        Insert: UsageRow;
        Update: Partial<UsageRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
