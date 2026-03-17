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
  refreshProfile: () => Promise<void>;
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

  // フォールバック: profilesレコードがまだなければ作成（既存レコードは上書きしない）
  const nickname = authUser.user_metadata?.name || authUser.email || 'ユーザー';
  
  // INSERT (新規のみ、既存は無視)
  await (supabase
    .from('profiles') as any)
    .upsert({
      id: authUser.id,
      nickname,
      avatar_emoji: '🎾',
      coins: 20,
    }, { onConflict: 'id', ignoreDuplicates: true });
  
  // 改めてSELECTで取得（既存ユーザーのcoinsは変更されない）
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  const np = existingProfile as Record<string, any> | null;
  return {
    id: authUser.id,
    nickname: np?.nickname || nickname,
    avatarEmoji: np?.avatar_emoji || '🎾',
    provider,
    createdAt: np?.created_at || new Date().toISOString(),
    coins: np?.coins ?? 20,
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

  // 古い独立localStorageキーをクリーンアップ（DB同期に移行済み）
  useEffect(() => {
    ['student_coins', 'coach_support_coins', 'coach_rank', 'coach_answer_count', 'coach_avg_rating'].forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

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
        // セッション取得に失敗してもlocalStorageユーザーが存在する場合は
        // DBから最新ロールを取得してマージする
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const cached = JSON.parse(stored);
            if (cached?.id && !cached.id.startsWith('user_')) {
              const { data } = await supabase
                .from('profiles')
                .select('system_role, coach_rank, nickname, avatar_emoji, coins')
                .eq('id', cached.id)
                .single();
              if (data) {
                const d = data as Record<string, any>;
                setUser({
                  ...cached,
                  systemRole: d.system_role || 'user',
                  coachRank: d.coach_rank || 'bronze',
                  nickname: d.nickname || cached.nickname,
                  avatarEmoji: d.avatar_emoji || cached.avatarEmoji,
                  coins: d.coins ?? cached.coins,
                });
              }
            }
          }
        } catch { /* ignore DB fallback errors too */ }
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

  // ページ読み込み時にDBからsystem_roleを再取得（キャッシュとDBの差分をマージ）
  useEffect(() => {
    if (!user || user.id.startsWith('user_')) return;
    const refreshRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('system_role, coach_rank')
          .eq('id', user.id)
          .single();
        if (data && !error) {
          const d = data as Record<string, any>;
          const newRole = d.system_role || 'user';
          const newRank = d.coach_rank || 'bronze';
          if (newRole !== user.systemRole || newRank !== user.coachRank) {
            setUser(prev => prev ? { ...prev, systemRole: newRole, coachRank: newRank } : null);
          }
        }
      } catch (e) {
        console.warn('refreshRole failed:', e);
      }
    };
    // 少し遅延させてセッション初期化の競合を避ける
    const timer = setTimeout(refreshRole, 1000);
    return () => clearTimeout(timer);
  }, [user?.id]);

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
    // 楽観的にローカル更新
    setUser(prev => prev ? { ...prev, coins: (prev.coins || 0) + amount } : null);

    // Supabase DBに反映し、戻り値（新しいコイン数）で上書き
    if (user) {
      const { data: newCoins, error } = await supabase.rpc('add_coins', { p_user_id: user.id, p_amount: amount });
      if (!error && typeof newCoins === 'number') {
        setUser(prev => prev ? { ...prev, coins: newCoins } : null);
      } else if (error) {
        console.error('コイン加算エラー:', error);
      }
    }
  };

  // ── プロフィール再取得（DBから最新情報を取得）──
  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        const p = profile as Record<string, any>;
        setUser(prev => prev ? {
          ...prev,
          coins: p.coins,
          systemRole: p.system_role || prev.systemRole,
          coachRank: p.coach_rank || prev.coachRank,
          coachAnswerCount: p.coach_answer_count || 0,
          coachAvgRating: p.coach_avg_rating || 0,
        } : null);
      }
    } catch (e) {
      console.error('プロフィール再取得失敗:', e);
    }
  };

  // ── タブ復帰時にDBからプロフィールを再取得（デバイス間同期）──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, loginWithOAuth, logout, updateProfile, addCoins, refreshProfile }}>
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
