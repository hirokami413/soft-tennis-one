import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'nexus_one_favorites';

function isSupabaseUser(userId?: string): boolean {
  return !!userId && !userId.startsWith('user_');
}

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const useDB = isSupabaseUser(user?.id);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // localStorage同期
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Supabaseからロード
  useEffect(() => {
    if (!useDB || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from('favorites')
        .select('menu_id')
        .eq('user_id', user.id);
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
          (supabase.from('favorites') as any).delete()
            .eq('user_id', user.id).eq('menu_id', id).then();
        } else {
          (supabase.from('favorites') as any).insert({
            user_id: user.id, menu_id: id,
          }).then();
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
