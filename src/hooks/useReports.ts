import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Report {
  id: string;
  menuId: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function useReports(menuId: string) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('menu_id', menuId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        // 投稿者のプロフィールを取得
        const authorIds = [...new Set(data.map((r: any) => r.author_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_emoji')
          .in('id', authorIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        setReports(data.map((r: any) => {
          const profile = profileMap.get(r.author_id);
          return {
            id: r.id,
            menuId: r.menu_id,
            authorId: r.author_id,
            authorNickname: profile?.nickname || '匿名',
            authorAvatar: profile?.avatar_emoji || '🎾',
            rating: r.rating,
            comment: r.comment,
            createdAt: new Date(r.created_at).toLocaleDateString('ja-JP'),
          };
        }));
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const submitReport = async (rating: number, comment: string) => {
    if (!user || !isSupabaseConfigured()) throw new Error('ログインが必要です');

    const { error } = await supabase
      .from('reports')
      .insert({
        menu_id: menuId,
        author_id: user.id,
        rating,
        comment,
      });

    if (error) throw error;
    await fetchReports();
  };

  const deleteReport = async (reportId: string) => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
    await fetchReports();
  };

  return { reports, loading, submitReport, deleteReport };
}
