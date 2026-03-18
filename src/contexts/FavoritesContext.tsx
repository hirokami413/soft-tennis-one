import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const useDB = isSupabaseConfigured() && !!user?.id;

  const [favorites, setFavorites] = useState<string[]>([]);

  // Supabaseからロード
  useEffect(() => {
    if (!useDB || !user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('menu_id')
        .eq('user_id', user.id);
      if (error) {
        console.error('お気に入り取得エラー:', error);
        return;
      }
      if (data) {
        setFavorites(data.map(r => r.menu_id));
      }
    };
    load();
  }, [useDB, user]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const updated = isFav ? prev.filter(fid => fid !== id) : [...prev, id];

      // Supabase DB にも反映
      if (useDB && user) {
        if (isFav) {
          supabase.from('favorites').delete()
            .eq('user_id', user.id).eq('menu_id', id)
            .then(({ error }) => { if (error) console.error('お気に入り削除失敗:', error); });
        } else {
          supabase.from('favorites').insert({
            user_id: user.id, menu_id: id,
          }).then(({ error }) => { if (error) console.error('お気に入り追加失敗:', error); });
        }
      }

      return updated;
    });
  }, [useDB, user]);

  const isFavorite = (id: string) => favorites.includes(id);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      toggleFavorite,
      isFavorite,
      favoriteCount: favorites.length,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
