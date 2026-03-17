import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ──
export interface TeamInfo {
  id: string;
  name: string;
  code: string;
  createdBy: string;
}

export interface TeamMemberInfo {
  userId: string;
  nickname: string;
  avatarEmoji: string;
  role: 'admin' | 'coach' | 'member';
}

// ── ヘルパー ──
function isSupabaseUser(userId?: string): boolean {
  return !!userId && !userId.startsWith('user_');
}

// =============================================
// useSupabaseTeams — チーム管理
// =============================================
export function useSupabaseTeams() {
  const { user, isLoading } = useAuth();
  const useDB = isSupabaseUser(user?.id);

  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [currentTeamMembers, setCurrentTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // ── チーム一覧取得 ──
  useEffect(() => {
    if (isLoading || !useDB || !user) return;
    loadTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDB, user?.id, isLoading]);

  const loadTeams = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to load team_members:', error);
    }

    if (data && data.length > 0) {
      const teamIds = data.map(d => d.team_id);
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamData) {
        setTeams(teamData.map(t => ({
          id: t.id,
          name: t.name,
          code: t.code,
          createdBy: t.created_by,
        })));
      }
    }
    setLoading(false);
  };

  // ── チーム作成 ──
  const createTeam = useCallback(async (name: string, code: string) => {
    if (!useDB || !user) return null;

    const { data, error } = await (supabase
      .from('teams') as any)
      .insert({ name, code, created_by: user.id })
      .select()
      .single();

    if (error || !data) return null;

    // 作成者をadminとして追加
    await (supabase.from('team_members') as any).insert({
      team_id: data.id,
      user_id: user.id,
      role: 'admin',
    });

    const newTeam: TeamInfo = { id: data.id, name: data.name, code: data.code, createdBy: data.created_by };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  }, [useDB, user]);

  // ── チーム参加 ──
  const joinTeam = useCallback(async (inviteCode: string) => {
    if (!useDB || !user) return null;

    const { data, error } = await supabase.rpc('join_team_by_code', {
      p_code: inviteCode
    });

    if (error || !data) {
      console.error('Failed to join team:', error);
      return null;
    }

    const result = data as any;
    const newTeam: TeamInfo = {
      id: result.id,
      name: result.name,
      code: result.code,
      createdBy: result.createdBy
    };

    setTeams(prev => prev.some(t => t.id === newTeam.id) ? prev : [...prev, newTeam]);
    return newTeam;
  }, [useDB, user]);

  // ── チームメンバー取得 ──
  const loadTeamMembers = useCallback(async (teamId: string) => {
    if (!useDB) return;

    const { data } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        profiles:user_id (nickname, avatar_emoji)
      `)
      .eq('team_id', teamId);

    if (data) {
      setCurrentTeamMembers(data.map((m: Record<string, unknown>) => {
        const profile = m.profiles as Record<string, unknown> | null;
        return {
          userId: m.user_id as string,
          nickname: (profile?.nickname as string) || 'ユーザー',
          avatarEmoji: (profile?.avatar_emoji as string) || '🎾',
          role: m.role as 'admin' | 'coach' | 'member',
        };
      }));
    }
  }, [useDB]);

  // ── チーム削除 ──
  const deleteTeam = useCallback(async (teamId: string) => {
    if (!useDB) return;
    await supabase.from('teams').delete().eq('id', teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
  }, [useDB]);

  return {
    teams,
    currentTeamMembers,
    loading,
    createTeam,
    joinTeam,
    loadTeamMembers,
    deleteTeam,
    isSupabase: useDB,
  };
}
