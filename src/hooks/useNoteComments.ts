import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface NoteComment {
  id: string;
  noteId: string;
  userId: string;
  username: string;
  avatarEmoji: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

export interface ReportedUser {
  userId: string;
  username: string;
  reportCount: number;
  latestReport: string;
  comments: { id: string; content: string; reportCount: number; reasons: string[] }[];
}

export function useNoteComments() {
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, NoteComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  // コメント読み込み
  const loadComments = useCallback(async (noteId: string) => {
    setLoadingComments(prev => ({ ...prev, [noteId]: true }));
    const { data, error } = await supabase
      .from('note_comments')
      .select('*, profiles!note_comments_user_id_fkey(nickname, avatar_emoji, avatar_url)')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        noteId: row.note_id,
        userId: row.user_id,
        username: row.profiles?.nickname || '匿名',
        avatarEmoji: row.profiles?.avatar_emoji || '🎾',
        avatarUrl: row.profiles?.avatar_url || undefined,
        content: row.content,
        createdAt: row.created_at,
      }));
      setComments(prev => ({ ...prev, [noteId]: mapped }));
    }
    setLoadingComments(prev => ({ ...prev, [noteId]: false }));
  }, []);

  // コメント追加
  const addComment = useCallback(async (noteId: string, content: string) => {
    if (!user || !content.trim()) return;
    const { data, error } = await supabase
      .from('note_comments')
      .insert({ note_id: noteId, user_id: user.id, content: content.trim() })
      .select('*, profiles!note_comments_user_id_fkey(nickname, avatar_emoji, avatar_url)')
      .single();

    if (!error && data) {
      const row = data as any;
      const newComment: NoteComment = {
        id: row.id,
        noteId: row.note_id,
        userId: row.user_id,
        username: row.profiles?.nickname || user.nickname,
        avatarEmoji: row.profiles?.avatar_emoji || user.avatarEmoji,
        avatarUrl: row.profiles?.avatar_url || user.avatarUrl,
        content: row.content,
        createdAt: row.created_at,
      };
      setComments(prev => ({
        ...prev,
        [noteId]: [...(prev[noteId] || []), newComment],
      }));
    }
  }, [user]);

  // コメント削除
  const deleteComment = useCallback(async (noteId: string, commentId: string) => {
    await supabase.from('note_comments').delete().eq('id', commentId);
    setComments(prev => ({
      ...prev,
      [noteId]: (prev[noteId] || []).filter(c => c.id !== commentId),
    }));
  }, []);

  // コメント報告
  const reportComment = useCallback(async (commentId: string, reason: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('comment_reports')
      .insert({ comment_id: commentId, reporter_id: user.id, reason });
    if (error) {
      if (error.code === '23505') {
        alert('既にこのコメントを報告済みです');
      }
      return false;
    }
    return true;
  }, [user]);

  // 管理者用: 報告されたユーザー一覧
  const loadReportedUsers = useCallback(async (): Promise<ReportedUser[]> => {
    const { data, error } = await supabase
      .from('comment_reports')
      .select(`
        id,
        reason,
        created_at,
        note_comments!comment_reports_comment_id_fkey (
          id,
          content,
          user_id,
          profiles!note_comments_user_id_fkey (nickname)
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    // ユーザーごとに集約
    const userMap = new Map<string, ReportedUser>();
    for (const report of data as any[]) {
      const comment = report.note_comments;
      if (!comment) continue;
      const userId = comment.user_id;
      const username = comment.profiles?.nickname || '匿名';

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          username,
          reportCount: 0,
          latestReport: report.created_at,
          comments: [],
        });
      }
      const entry = userMap.get(userId)!;
      entry.reportCount++;
      if (report.created_at > entry.latestReport) entry.latestReport = report.created_at;

      const existing = entry.comments.find(c => c.id === comment.id);
      if (existing) {
        existing.reportCount++;
        if (report.reason) existing.reasons.push(report.reason);
      } else {
        entry.comments.push({
          id: comment.id,
          content: comment.content,
          reportCount: 1,
          reasons: report.reason ? [report.reason] : [],
        });
      }
    }

    return [...userMap.values()].sort((a, b) => b.reportCount - a.reportCount);
  }, []);

  return {
    comments,
    loadingComments,
    loadComments,
    addComment,
    deleteComment,
    reportComment,
    loadReportedUsers,
  };
}
