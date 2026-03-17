import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MenuData } from '../types/menu';

export interface PlaylistItem extends MenuData {
  customDuration: number;
  customSets: number;
}

export interface SavedSet {
  name: string;
  items: PlaylistItem[];
  savedAt: string;
}

interface PlaylistContextType {
  playlist: PlaylistItem[];
  addToPlaylist: (menu: MenuData) => void;
  addCustomItem: (item: PlaylistItem) => void;
  removeFromPlaylist: (id: string) => void;
  updatePlaylistItem: (id: string, updates: Partial<PlaylistItem>) => void;
  reorderPlaylist: (startIndex: number, endIndex: number) => void;
  isInPlaylist: (id: string) => boolean;
  clearPlaylist: () => void;
  undo: () => void;
  canUndo: boolean;
  totalDuration: number;
  savedSetsVersion: number;
  saveAsSet: (name: string) => void;
  loadSet: (name: string) => void;
  deleteSet: (name: string) => void;
  getSavedSets: () => SavedSet[];
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const STORAGE_KEY = 'nexus_one_menu_playlist';
const SAVED_SETS_KEY = 'nexus_one_saved_sets';

export const PlaylistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
    // 初期化時に LocalStorage から読み込む
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<PlaylistItem[][]>([]);
  const [savedSetsVersion, setSavedSetsVersion] = useState(0);

  // 内部で履歴を追加しつつsetPlaylistを呼ぶヘルパー関数
  const setPlaylistWithHistory = (action: PlaylistItem[] | ((prev: PlaylistItem[]) => PlaylistItem[])) => {
    const nextList = typeof action === 'function' ? action(playlist) : action;
    
    // 実際に変更がある場合のみ履歴に追加する
    if (JSON.stringify(nextList) !== JSON.stringify(playlist)) {
      setHistory(prevHistory => [...prevHistory, playlist].slice(-20));
      setPlaylist(nextList);
    }
  };

  // playlist が変更されるたびに LocalStorage に保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
  }, [playlist]);

  const addToPlaylist = (menu: MenuData) => {
    setPlaylistWithHistory(prev => {
      if (prev.some(m => m.id === menu.id)) return prev;
      return [...prev, { ...menu, customDuration: menu.duration || 10, customSets: 1 }];
    });
  };

  const addCustomItem = (item: PlaylistItem) => {
    setPlaylistWithHistory(prev => [...prev, item]);
  };

  const removeFromPlaylist = (id: string) => {
    setPlaylistWithHistory(prev => prev.filter(m => m.id !== id));
  };

  const updatePlaylistItem = (id: string, updates: Partial<PlaylistItem>) => {
    setPlaylistWithHistory(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const reorderPlaylist = (startIndex: number, endIndex: number) => {
    setPlaylistWithHistory(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const isInPlaylist = (id: string) => {
    return playlist.some(m => m.id === id);
  };

  const clearPlaylist = () => {
    setPlaylistWithHistory([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    
    const newHistory = [...history];
    const previousState = newHistory.pop();
    
    if (previousState) {
      setPlaylist(previousState);
      setHistory(newHistory);
    }
  };

  const totalDuration = playlist.reduce((total, item) => total + (item.customDuration * item.customSets), 0);

  const saveAsSet = (name: string) => {
    const saved = localStorage.getItem(SAVED_SETS_KEY);
    const sets: SavedSet[] = saved ? JSON.parse(saved) : [];
    // 同名のセットがあれば上書き
    const filtered = sets.filter(s => s.name !== name);
    filtered.push({ name, items: playlist, savedAt: new Date().toISOString() });
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(filtered));
    setSavedSetsVersion(v => v + 1);
  };

  const loadSet = (name: string) => {
    const saved = localStorage.getItem(SAVED_SETS_KEY);
    if (!saved) return;
    const sets: SavedSet[] = JSON.parse(saved);
    const target = sets.find(s => s.name === name);
    if (target) {
      setPlaylistWithHistory(target.items);
    }
  };

  const deleteSet = (name: string) => {
    const saved = localStorage.getItem(SAVED_SETS_KEY);
    if (!saved) return;
    const sets: SavedSet[] = JSON.parse(saved);
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(sets.filter(s => s.name !== name)));
    setSavedSetsVersion(v => v + 1);
  };

  const getSavedSets = (): SavedSet[] => {
    const saved = localStorage.getItem(SAVED_SETS_KEY);
    return saved ? JSON.parse(saved) : [];
  };

  return (
    <PlaylistContext.Provider value={{
      playlist,
      addToPlaylist,
      addCustomItem,
      removeFromPlaylist,
      updatePlaylistItem,
      reorderPlaylist,
      isInPlaylist,
      clearPlaylist,
      undo,
      canUndo: history.length > 0,
      totalDuration,
      savedSetsVersion,
      saveAsSet,
      loadSet,
      deleteSet,
      getSavedSets,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};
