import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type MenuData, dummyMenus } from '../data/dummyData';

export function useSupabaseMenus() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // メニュー一覧を取得する関数
  const fetchMenus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured. Falling back to dummy menus.');
        setMenus(dummyMenus);
        return;
      }

      // menu_detailsビューから取得（お気に入り数や投稿者情報を含む）
      const { data, error: supabaseError } = await supabase
        .from('menu_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      if (data) {
        // DBから取得したデータをMenuData型に変換
        const formattedMenus: MenuData[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          level: row.level,
          description: row.description,
          tags: row.tags || [],
          youtubeUrl: row.youtube_url,
          instagramUrl: row.instagram_url,
          author: row.author_nickname,
          authorAvatar: row.author_avatar,
          createdAt: new Date(row.created_at).toISOString().split('T')[0],
          favoritesCount: row.favorites_count || 0,
        }));
        setMenus(formattedMenus);
      }
    } catch (err: any) {
      console.error('Error fetching menus:', err);
      setError(err);
      // エラー時はフォールバックとしてダミーを表示
      setMenus(dummyMenus);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回マウント時に取得
  useEffect(() => {
    fetchMenus();
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
          author_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // 投稿後、ローカルの一覧を再取得して更新する
      await fetchMenus();
      
      return data;
    } catch (err) {
      console.error('Error submitting menu:', err);
      throw err;
    }
  };

  return {
    menus,
    isLoading,
    error,
    fetchMenus,
    submitMenu,
  };
}
