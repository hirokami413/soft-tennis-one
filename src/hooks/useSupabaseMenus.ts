import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type MenuData } from '../types/menu';

export function useSupabaseMenus() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // メニュー一覧を取得する関数（silent=trueの場合、isLoadingを変更しない）
  const fetchMenus = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured. Returning empty menus.');
        setMenus([]);
        return;
      }

      // menu_detailsビューから取得（お気に入り数や投稿者情報を含む）
      const { data, error: supabaseError } = await supabase
        .from('menu_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      if (data) {
        // レポート統計を取得
        const { data: reportStats } = await supabase
          .from('reports')
          .select('menu_id, rating');

        // メニューIDごとにcount/avg集計
        const statsMap = new Map<string, { count: number; totalRating: number }>();
        if (reportStats) {
          for (const r of reportStats) {
            const existing = statsMap.get(r.menu_id) || { count: 0, totalRating: 0 };
            existing.count++;
            existing.totalRating += r.rating;
            statsMap.set(r.menu_id, existing);
          }
        }

        // DBから取得したデータをMenuData型に変換
        const formattedMenus: MenuData[] = data.map((row: any) => {
          const stats = statsMap.get(row.id);
          return {
            id: row.id,
            title: row.title,
            category: row.category,
            level: row.level,
            description: row.description,
            tags: row.tags || [],
            youtubeUrl: row.youtube_url,
            instagramUrl: row.instagram_url,
            imageUrl: row.image_url || undefined,
            isFeatured: row.is_featured || false,
            duration: row.duration || undefined,
            minPlayers: row.min_players || undefined,
            maxPlayers: row.max_players || undefined,
            author: row.author_nickname,
            authorAvatar: row.author_avatar,
            authorId: row.author_id,
            createdAt: new Date(row.created_at).toISOString().split('T')[0],
            favoritesCount: row.favorites_count || 0,
            rating: stats ? Math.round((stats.totalRating / stats.count) * 10) / 10 : undefined,
            reviewCount: stats?.count || 0,
          };
        });
        setMenus(formattedMenus);
      }
    } catch (err: any) {
      console.error('Error fetching menus:', err);
      setError(err);
      // エラー時は空配列を設定
      setMenus([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // 初回マウント時に取得
  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // ページ復帰時に再取得（タブ切替やアプリ復帰時に最新データを表示）
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMenus(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchMenus]);

  // 新規メニューを投稿する関数
  const submitMenu = async (menuData: Omit<MenuData, 'id' | 'createdAt' | 'author' | 'favoritesCount'>) => {
    if (!user || !user.id || !isSupabaseConfigured()) {
      throw new Error('ログインが必要です');
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .insert({
          title: menuData.title,
          category: menuData.category,
          level: menuData.level,
          description: menuData.description,
          tags: menuData.tags || [],
          youtube_url: menuData.youtubeUrl || '',
          instagram_url: menuData.instagramUrl || '',
          image_url: menuData.imageUrl || '',
          duration: menuData.duration || null,
          min_players: menuData.minPlayers || null,
          max_players: menuData.maxPlayers || null,
          author_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // 投稿後、バックグラウンドで一覧を再取得（silentモード：isLoadingを変更しない）
      fetchMenus(true).catch(console.error);
      
      return data;
    } catch (err) {
      console.error('Error submitting menu:', err);
      throw err;
    }
  };

  // メニューを更新する関数
  const updateMenu = async (id: string, menuData: Partial<MenuData>) => {
    if (!user || !user.id || !isSupabaseConfigured()) {
      throw new Error('ログインが必要です');
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .update({
          title: menuData.title,
          category: menuData.category,
          level: menuData.level,
          description: menuData.description,
          tags: menuData.tags,
          youtube_url: menuData.youtubeUrl,
          instagram_url: menuData.instagramUrl,
          image_url: menuData.imageUrl || '',
          duration: menuData.duration || null,
          min_players: menuData.minPlayers || null,
          max_players: menuData.maxPlayers || null,
        })
        .eq('id', id)
        .eq('author_id', user.id) // セキュリティのため念押し
        .select()
        .single();

      if (error) throw error;
      await fetchMenus();
      return data;
    } catch (err) {
      console.error('Error updating menu:', err);
      throw err;
    }
  };

  // メニューを削除する関数
  const deleteMenu = async (id: string) => {
    if (!user || !user.id || !isSupabaseConfigured()) {
      throw new Error('ログインが必要です');
    }

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id)
        .eq('author_id', user.id); // セキュリティのため念押し

      if (error) throw error;
      await fetchMenus();
    } catch (err) {
      console.error('Error deleting menu:', err);
      throw err;
    }
  };

  // 一押しメニューの切り替え
  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      const { error } = await supabase
        .from('menus')
        .update({ is_featured: isFeatured })
        .eq('id', id);
      if (error) throw error;
      await fetchMenus();
    } catch (err) {
      console.error('Error toggling featured:', err);
      throw err;
    }
  };

  return {
    menus,
    isLoading,
    error,
    fetchMenus,
    submitMenu,
    updateMenu,
    deleteMenu,
    toggleFeatured,
  };
}
