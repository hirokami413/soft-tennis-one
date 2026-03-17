import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ── Types ──
export interface UserProfile {
  id: string;
  nickname: string;
  avatarEmoji: string;
  provider: 'google' | 'line' | 'apple' | 'email';
  createdAt: string;
  coins: number;
  systemRole: 'user' | 'coach' | 'admin';
  coachRank: 'bronze' | 'silver' | 'gold' | 'platinum';
  coachAnswerCount: number;
  coachAvgRating: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (profile: Omit<UserProfile, 'id' | 'createdAt'>) => void;
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'nickname' | 'avatarEmoji'>>) => void;
  addCoins: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'app_user_profile';

function generateId(): string {
  return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// Supabase Session → UserProfile変換
async function sessionToProfile(session: Session): Promise<UserProfile> {
  const authUser = session.user;
  const provider = (authUser.app_metadata?.provider || 'email') as UserProfile['provider'];

  // profilesテーブルから取得（トリガーで自動作成されているはず）
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profile) {
    const p = profile as Record<string, any>;
    return {
      id: p.id,
      nickname: p.nickname,
      avatarEmoji: p.avatar_emoji,
      provider,
      createdAt: p.created_at,
      coins: p.coins,
      systemRole: p.system_role || 'user',
      coachRank: p.coach_rank || 'bronze',
      coachAnswerCount: p.coach_answer_count || 0,
      coachAvgRating: p.coach_avg_rating || 0,
    };
  }

  // フォールバック: profilesレコードがまだなければ作成
  const nickname = authUser.user_metadata?.name || authUser.email || 'ユーザー';
  const { data: newProfile } = await (supabase
    .from('profiles') as any)
    .upsert({
      id: authUser.id,
      nickname,
      avatar_emoji: '🎾',
      coins: 20,
    })
    .select()
    .single();

  const np = newProfile as Record<string, any> | null;
  return {
    id: authUser.id,
    nickname: np?.nickname || nickname,
    avatarEmoji: np?.avatar_emoji || '🎾',
    provider,
    createdAt: np?.created_at || new Date().toISOString(),
    coins: np?.coins || 20,
    systemRole: np?.system_role || 'user',
    coachRank: np?.coach_rank || 'bronze',
    coachAnswerCount: np?.coach_answer_count || 0,
    coachAvgRating: np?.coach_avg_rating || 0,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // localStorageとの同期（リアクティブ更新＋フォールバック）
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Supabase Authセッション監視
  useEffect(() => {
    // 初回ロード: 既存セッションを確認
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await sessionToProfile(session);
          setUser(profile);
        } else {
          setUser(prev => {
            if (prev && !prev.id.startsWith('user_')) {
              // Supabase user but no valid session -> logout
              return null;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Supabase session check failed, using localStorage fallback:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();

    // セッション変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const profile = await sessionToProfile(session);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── OAuth ログイン（Supabase Auth経由）──
  const loginWithOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('OAuth login error:', error);
    }
  };

  // ── ダミーログイン（Supabase Authなし、フォールバック用）──
  const login = (profile: Omit<UserProfile, 'id' | 'createdAt'>) => {
    const newUser: UserProfile = {
      ...profile,
      id: generateId(),
      createdAt: new Date().toISOString(),
      coins: 20,
    };
    setUser(newUser);
  };

  // ── ログアウト ──
  const logout = async () => {
    // 1. アプリの状態をクリア
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);

    // 2. Supabase signOut を試行
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // 失敗しても続行
    }

    // 3. Supabaseが独自にlocalStorageに保存するセッショントークンも強制クリア
    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 4. 完全にクリーンな状態でリロード
    window.location.href = window.location.origin;
  };

  // ── プロフィール更新 ──
  const updateProfile = async (updates: Partial<Pick<UserProfile, 'nickname' | 'avatarEmoji'>>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);

    // Supabase DBにも反映（非同期）
    if (user) {
      const dbUpdates: Record<string, string> = {};
      if (updates.nickname) dbUpdates.nickname = updates.nickname;
      if (updates.avatarEmoji) dbUpdates.avatar_emoji = updates.avatarEmoji;
      if (Object.keys(dbUpdates).length > 0) {
        (supabase.from('profiles') as any).update(dbUpdates).eq('id', user.id).then();
      }
    }
  };

  // ── コイン加算 ──
  const addCoins = async (amount: number) => {
    setUser(prev => prev ? { ...prev, coins: (prev.coins || 0) + amount } : null);

    // Supabase DBにも反映（RPC経由で安全に加算）
    if (user) {
      (supabase.rpc('add_coins', { p_user_id: user.id, p_amount: amount }) as any).then();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, loginWithOAuth, logout, updateProfile, addCoins }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
