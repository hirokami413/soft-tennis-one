import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ──
export interface NoteEntry {
  id: string;
  date: string;
  keep: string;
  problem: string;
  tryItem: string;
  coachQuestion: string;
  other: string;
  skills: number[]; // [フォア, バック, ボレー, サーブ, フットワーク, 戦術] 1-5
  media?: { type: 'image' | 'video' | 'url'; name: string; url?: string }[];
  published?: boolean;
  coinGranted?: boolean;
  userId?: string;
  username?: string;
  avatarEmoji?: string;
  avatarUrl?: string;
}

export interface Goal {
  id: string;
  text: string;
  type: 'short' | 'mid';
  done: boolean;
  progress: number;
}

// ── ヘルパー: SupabaseのDB行 → フロントエンドのNoteEntry型に変換 ──
function dbRowToNote(row: Record<string, unknown>): NoteEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    keep: (row.keep as string) || '',
    problem: (row.problem as string) || '',
    tryItem: (row.try_item as string) || '',
    coachQuestion: (row.coach_question as string) || '',
    other: (row.other as string) || '',
    skills: (row.skills as number[]) || [3, 3, 3, 3, 3, 3],
    media: (row.media as any[]) || undefined,
    published: (row.published as boolean) || false,
    coinGranted: (row.coin_granted as boolean) || false,
    userId: row.user_id as string,
    username: (row as any).profiles?.nickname || (row as any).username || undefined,
    avatarEmoji: (row as any).profiles?.avatar_emoji || undefined,
    avatarUrl: (row as any).profiles?.avatar_url || undefined,
  };
}

// ── Supabase接続チェック ──
function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return !!url && url !== 'https://placeholder.supabase.co';
}

// ── ローカルストレージフォールバック ──
function getLocalNotes(): NoteEntry[] {
  try {
    const stored = localStorage.getItem('tennis_notes_data');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalNotes(notes: NoteEntry[]) {
  localStorage.setItem('tennis_notes_data', JSON.stringify(notes));
}

function getLocalGoals(): Goal[] {
  try {
    const stored = localStorage.getItem('tennis_notes_goals');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalGoals(goals: Goal[]) {
  localStorage.setItem('tennis_notes_goals', JSON.stringify(goals));
}

// =============================================
// useSupabaseNotes — テニスノートのCRUD
// =============================================
export function useSupabaseNotes() {
  const { user } = useAuth();
  const useSupabase = isSupabaseConfigured() && user?.id && !user.id.startsWith('user_');

  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [communityNotes, setCommunityNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 初回ロード ──
  useEffect(() => {
    if (useSupabase) {
      loadFromSupabase();
      loadCommunityNotes();
      subscribeToPublishedNotes();
    } else {
      setNotes(getLocalNotes());
      // ローカルモードでもcommunityNotesはローカルの公開ノートを表示
      setNotes(prev => {
        setCommunityNotes(prev.filter(n => n.published));
        return prev;
      });
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Supabaseからノートをロード ──
  const loadFromSupabase = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tennis_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (!error && data) {
      setNotes(data.map(dbRowToNote));
    }
    setLoading(false);
  };

  // ── コミュニティノート（公開済み）をロード ──
  const loadCommunityNotes = async () => {
    const { data, error } = await supabase
      .from('tennis_notes')
      .select('*, profiles!tennis_notes_user_id_fkey(nickname, avatar_emoji, avatar_url)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setCommunityNotes(data.map(dbRowToNote));
    }
  };

  // ── 公開ノートのリアルタイム購読 ──
  const subscribeToPublishedNotes = () => {
    const channel = supabase
      .channel('public-notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tennis_notes', filter: 'published=eq.true' },
        () => {
          // 変更があったらリロード
          loadCommunityNotes();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  // ── ノート追加 ──
  const addNote = useCallback(async (note: Omit<NoteEntry, 'id'>) => {
    const newNote: NoteEntry = {
      ...note,
      id: `n-${Date.now()}`,
      published: false,
    };

    if (useSupabase && user) {
      const { data, error } = await supabase
        .from('tennis_notes')
        .insert({
          user_id: user.id,
          date: note.date,
          keep: note.keep,
          problem: note.problem,
          try_item: note.tryItem,
          coach_question: note.coachQuestion,
          other: note.other,
          skills: note.skills,
          media: note.media || null,
          published: false,
        })
        .select()
        .single();

      if (!error && data) {
        const dbNote = dbRowToNote(data as Record<string, unknown>);
        setNotes(prev => [dbNote, ...prev]);
        return dbNote;
      }
    }

    // フォールバック: localStorage
    setNotes(prev => {
      const updated = [newNote, ...prev];
      setLocalNotes(updated);
      return updated;
    });
    return newNote;
  }, [useSupabase, user]);

  // ── ノート公開 ──
  const publishNote = useCallback(async (noteId: string) => {
    if (useSupabase) {
      await (supabase
        .from('tennis_notes') as any)
        .update({ published: true, coin_granted: true })
        .eq('id', noteId);
    }

    setNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, published: true, coinGranted: true } : n);
      if (!useSupabase) setLocalNotes(updated);
      setCommunityNotes(prevC => {
        const published = updated.find(n => n.id === noteId);
        return published ? [published, ...prevC] : prevC;
      });
      return updated;
    });
  }, [useSupabase]);

  // ── ノート更新（ローカルステートのみ）──
  const updateNotes = useCallback((updater: (prev: NoteEntry[]) => NoteEntry[]) => {
    setNotes(prev => {
      const updated = updater(prev);
      if (!useSupabase) setLocalNotes(updated);
      setCommunityNotes(updated.filter(n => n.published));
      return updated;
    });
  }, [useSupabase]);

  // ── ノート削除 ──
  const deleteNote = useCallback(async (noteId: string) => {
    if (useSupabase) {
      await supabase.from('tennis_notes').delete().eq('id', noteId);
    }
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== noteId);
      if (!useSupabase) setLocalNotes(updated);
      setCommunityNotes(prevC => prevC.filter(n => n.id !== noteId));
      return updated;
    });
  }, [useSupabase]);

  // ── ノート編集 ──
  const updateNote = useCallback(async (noteId: string, updates: Partial<Omit<NoteEntry, 'id'>>) => {
    if (useSupabase) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.keep !== undefined) dbUpdates.keep = updates.keep;
      if (updates.problem !== undefined) dbUpdates.problem = updates.problem;
      if (updates.tryItem !== undefined) dbUpdates.try_item = updates.tryItem;
      if (updates.coachQuestion !== undefined) dbUpdates.coach_question = updates.coachQuestion;
      if (updates.other !== undefined) dbUpdates.other = updates.other;
      if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
      if (updates.media !== undefined) dbUpdates.media = updates.media || null;
      if (updates.date !== undefined) dbUpdates.date = updates.date;

      await supabase.from('tennis_notes').update(dbUpdates).eq('id', noteId);
    }
    setNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, ...updates } : n);
      if (!useSupabase) setLocalNotes(updated);
      return updated;
    });
  }, [useSupabase]);

  return {
    notes,
    setNotes: updateNotes,
    communityNotes,
    loading,
    addNote,
    updateNote,
    publishNote,
    deleteNote,
    reloadCommunityNotes: loadCommunityNotes,
  };
}

// =============================================
// useSupabaseGoals — 目標管理のCRUD
// =============================================
export function useSupabaseGoals() {
  const { user } = useAuth();
  const useDB = isSupabaseConfigured() && user?.id && !user.id.startsWith('user_');

  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (useDB) {
      loadGoals();
    } else {
      setGoals(getLocalGoals());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadGoals = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setGoals(data.map(row => ({
        id: row.id,
        text: row.text,
        type: row.type as 'short' | 'mid',
        done: row.done,
        progress: row.progress,
      })));
    }
  };

  const addGoal = useCallback(async (text: string, type: 'short' | 'mid') => {
    const newGoal: Goal = { id: `g-${Date.now()}`, text, type, done: false, progress: 0 };

    if (useDB && user) {
      const { data, error } = await (supabase
        .from('goals') as any)
        .insert({ user_id: user.id, text, type })
        .select()
        .single();

      if (!error && data) {
        setGoals(prev => [...prev, { id: data.id, text: data.text, type: data.type as 'short' | 'mid', done: data.done, progress: data.progress }]);
        return;
      }
    }

    setGoals(prev => {
      const updated = [...prev, newGoal];
      if (!useDB) setLocalGoals(updated);
      return updated;
    });
  }, [useDB, user]);

  const updateGoals = useCallback((updater: (prev: Goal[]) => Goal[]) => {
    setGoals(prev => {
      const updated = updater(prev);
      if (!useDB) setLocalGoals(updated);
      return updated;
    });
  }, [useDB]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (useDB) {
      await supabase.from('goals').delete().eq('id', goalId);
    }
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== goalId);
      if (!useDB) setLocalGoals(updated);
      return updated;
    });
  }, [useDB]);

  return { goals, setGoals: updateGoals, addGoal, deleteGoal };
}
