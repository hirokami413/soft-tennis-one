// Supabase Database型定義
// supabase gen types typescript で自動生成可能だが、初期段階では手動定義

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          avatar_emoji: string;
          coins: number;
          subscription_plan: 'free' | 'light' | 'standard' | 'pro';
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_emoji?: string;
          coins?: number;
          subscription_plan?: 'free' | 'light' | 'standard' | 'pro';
          created_at?: string;
        };
        Update: {
          nickname?: string;
          avatar_emoji?: string;
          coins?: number;
          subscription_plan?: 'free' | 'light' | 'standard' | 'pro';
        };
      };
      tennis_notes: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          keep: string;
          problem: string;
          try_item: string;
          coach_question: string;
          other: string;
          skills: number[];
          published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          keep?: string;
          problem?: string;
          try_item?: string;
          coach_question?: string;
          other?: string;
          skills?: number[];
          published?: boolean;
          created_at?: string;
        };
        Update: {
          keep?: string;
          problem?: string;
          try_item?: string;
          coach_question?: string;
          other?: string;
          skills?: number[];
          published?: boolean;
        };
      };
      note_media: {
        Row: {
          id: string;
          note_id: string;
          type: 'image' | 'video' | 'url';
          url: string;
          name: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          type: 'image' | 'video' | 'url';
          url: string;
          name: string;
        };
        Update: {
          url?: string;
          name?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          type: 'short' | 'mid';
          done: boolean;
          progress: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          type?: 'short' | 'mid';
          done?: boolean;
          progress?: number;
        };
        Update: {
          text?: string;
          type?: 'short' | 'mid';
          done?: boolean;
          progress?: number;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: 'admin' | 'coach' | 'member';
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: 'admin' | 'coach' | 'member';
          joined_at?: string;
        };
        Update: {
          role?: 'admin' | 'coach' | 'member';
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'coach' | 'team' | 'note' | 'system';
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'coach' | 'team' | 'note' | 'system';
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };
      favorites: {
        Row: {
          user_id: string;
          menu_id: string;
        };
        Insert: {
          user_id: string;
          menu_id: string;
        };
        Update: never;
      };
      coach_questions: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          question: string;
          answer: string | null;
          answered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          question: string;
          answer?: string;
          answered_by?: string;
          created_at?: string;
        };
        Update: {
          answer?: string;
          answered_by?: string;
        };
      };
    };
    Functions: {
      add_coins: {
        Args: { user_id: string; amount: number };
        Returns: number;
      };
    };
  };
}
