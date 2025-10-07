export type {
  Database,
  MessageRow,
  MemoryRow,
  ProfileRow,
  UsageRow,
  Tone,
  Expertise,
} from './database';

// Handy helpers
export type Tables<T extends keyof import('./database').Database['public']['Tables']> =
  import('./database').Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof import('./database').Database['public']['Tables']> =
  import('./database').Database['public']['Tables'][T]['Insert'];
