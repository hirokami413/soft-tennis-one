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
        .select('*, profiles!reports_author_id_fkey(nickname, avatar_emoji)')
        .eq('menu_id', menuId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setReports(data.map((r: any) => ({
          id: r.id,
          menuId: r.menu_id,
          authorId: r.author_id,
          authorNickname: r.profiles?.nickname || '匿名',
          authorAvatar: r.profiles?.avatar_emoji || '🎾',
          rating: r.rating,
          comment: r.comment,
          createdAt: new Date(r.created_at).toLocaleDateString('ja-JP'),
        })));
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
