import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CoachConsultation {
  id: string;
  question: string;
  status: 'waiting' | 'answered' | 'resolved' | 'reask';
  createdAt: string;
  coach?: any;
  answer?: string;
  answeredAt?: string;
  userRating?: number;
  isMine?: boolean;
  userNickname?: string;
  userAvatar?: string;
  questionType?: 'text' | 'video';
  category?: string;
  report_reason?: string | null;
  answeredBy?: string;
}

export function useSupabaseCoach() {
  const { user, isLoading: authLoading } = useAuth();
  const [consultations, setConsultations] = useState<CoachConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const useDB = isSupabaseConfigured();

  const loadConsultations = useCallback(async () => {
    if (!useDB || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('coach_questions')
      .select(`
        *,
        profiles:user_id(nickname, avatar_emoji),
        coach:answered_by(nickname, avatar_emoji, coach_rank, coach_answer_count, coach_avg_rating)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('相談データ取得エラー:', error.message, error);
    }
    if (data && !error) {
      const parsed: CoachConsultation[] = data.map(row => ({
        id: row.id,
        question: row.question,
        status: row.status,
        createdAt: row.created_at,
        answer: row.answer,
        answeredAt: row.answered_at,
        userRating: row.user_rating,
        questionType: row.question_type,
        category: row.category,
        report_reason: row.report_reason,
        answeredBy: row.answered_by,
        isMine: row.user_id === user.id,
        userNickname: row.profiles?.nickname,
        userAvatar: row.profiles?.avatar_emoji,
        coach: row.coach ? {
          name: row.coach.nickname,
          avatar: row.coach.avatar_emoji,
          rank: row.coach.coach_rank,
          answerCount: row.coach.coach_answer_count,
          rating: row.coach.coach_avg_rating,
          specialty: ['全般'] // Currently not stored in DB, fallback
        } : undefined
      }));
      setConsultations(parsed);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDB, user?.id]);

  // セッション初期化完了後にデータを取得（authLoading=falseを待つ）
  useEffect(() => {
    if (!authLoading && user?.id) {
      loadConsultations();
    }
  }, [loadConsultations, user?.id, authLoading]);




  const applyCoachApplication = async (fullName: string, nickname: string, extra?: { yearsExperience?: string; certification?: string; selfIntro?: string }) => {
     if (!useDB || !user) return { error: 'Not configured' };
     const { error } = await supabase.from('coach_applications').upsert({
       user_id: user.id,
       full_name: fullName,
       nickname: nickname,
       years_experience: extra?.yearsExperience || '',
       certification: extra?.certification || '',
       self_intro: extra?.selfIntro || '',
       status: 'pending'
     }, { onConflict: 'user_id' });
     return { error };
  };

  const askQuestion = async (content: Partial<CoachConsultation>) => {
    if (!useDB || !user) return;
    const { data, error } = await supabase.from('coach_questions').insert({
      user_id: user.id,
      question: content.question,
      category: content.category || '',
      question_type: content.questionType || 'text',
      status: 'waiting'
    }).select().single();

    if (data && !error) {
       await loadConsultations();
    }
  };

  const answerQuestion = async (id: string, answer: string) => {
    if (!useDB || !user) return false;
    const { error } = await supabase.from('coach_questions').update({
      answer: answer,
      status: 'answered',
      answered_by: user.id,
      answered_at: new Date().toISOString()
    }).eq('id', id);

    if (error) {
      console.error('回答の保存に失敗しました:', error.message, error);
      alert('回答の保存に失敗しました: ' + error.message);
      return false;
    }
    await loadConsultations();
    return true;
  };
  
  // ランク報酬設定
  const RANK_CONFIG: Record<string, { multiplier: number; rankUpBonus: number }> = {
    bronze:   { multiplier: 1.0, rankUpBonus: 0 },
    silver:   { multiplier: 1.2, rankUpBonus: 5000 },
    gold:     { multiplier: 1.3, rankUpBonus: 15000 },
    platinum: { multiplier: 1.5, rankUpBonus: 50000 },
  };
  const RANK_UP_CONDITIONS: Record<string, { answers: number; rating: number; next: string | null }> = {
    bronze:   { answers: 30, rating: 4.0, next: 'silver' },
    silver:   { answers: 100, rating: 4.3, next: 'gold' },
    gold:     { answers: 250, rating: 4.6, next: 'platinum' },
    platinum: { answers: Infinity, rating: 5.0, next: null },
  };
  const BASE_REWARD = 700;

  const updateQuestionStatus = async (id: string, status: string, rating?: number) => {
     if (!useDB || !user) return;
     // 'rated' = 評価のみ保存（ステータスは変更しない、コイン付与もしない）
     const updates: any = status === 'rated' ? {} : { status };
     if (rating !== undefined) updates.user_rating = rating;
     
     const { error } = await supabase.from('coach_questions').update(updates).eq('id', id);
     if (error) {
       console.error('ステータス更新失敗:', error);
       return;
     }
     
     // resolved時: コーチにコイン報酬を付与 + ランクアップ判定
     if (status === 'resolved') {
       try {
         const { data: question, error: qErr } = await supabase
           .from('coach_questions')
           .select('answered_by')
           .eq('id', id)
           .single();
         
         if (qErr || !question?.answered_by) {
           console.error('回答者情報取得失敗:', qErr, question);
           await loadConsultations();
           return;
         }

         // コーチのプロフィールを取得
         const { data: coachProfile, error: pErr } = await supabase
           .from('profiles')
           .select('coach_rank, coach_answer_count, coach_avg_rating')
           .eq('id', question.answered_by)
           .single();
         
         if (pErr) {
           console.error('コーチプロフィール取得失敗:', pErr);
         }
         
         const rank = coachProfile?.coach_rank || 'bronze';
         const config = RANK_CONFIG[rank] || RANK_CONFIG.bronze;
         const reward = Math.floor(BASE_REWARD * config.multiplier);
         
         // コーチにランクベースのコイン付与
         const { error: coinErr } = await supabase.rpc('add_coins', { p_user_id: question.answered_by, p_amount: reward });
         if (coinErr) {
           console.error('コイン付与失敗:', coinErr);
           alert('コイン付与に失敗しました: ' + coinErr.message);
         } else {
           console.log(`コーチ ${question.answered_by} に ${reward}コイン付与成功`);
         }
         
         // コーチの回答数を+1
         const { error: countErr } = await supabase.rpc('increment_coach_answer_count', { p_coach_id: question.answered_by });
         if (countErr) {
           console.error('回答数更新失敗:', countErr);
         }
         
         // ランクアップ判定
         if (coachProfile) {
           const newCount = (coachProfile.coach_answer_count || 0) + 1;
           const avgRating = coachProfile.coach_avg_rating || 0;
           const condition = RANK_UP_CONDITIONS[rank];
           
           if (condition?.next && newCount >= condition.answers && avgRating >= condition.rating) {
             const { error: rankErr } = await supabase.rpc('update_coach_rank', { p_coach_id: question.answered_by, p_new_rank: condition.next });
             if (rankErr) console.error('ランクアップ失敗:', rankErr);
             
             const bonus = RANK_CONFIG[condition.next]?.rankUpBonus || 0;
             if (bonus > 0) {
               await supabase.rpc('add_coins', { p_user_id: question.answered_by, p_amount: bonus });
             }
           }
         }
       } catch (e) {
         console.error('コイン付与処理でエラー:', e);
       }
     }
     await loadConsultations();
  };

  const reportQuestion = async (id: string, reason: string) => {
    if (!useDB || !user) return;
    const { error } = await supabase.from('coach_questions').update({
      reported: true,
      report_reason: reason,
      reported_at: new Date().toISOString(),
      reported_by: user.id
    }).eq('id', id);
    if (error) {
      console.error('報告の保存に失敗:', error);
      alert('報告の保存に失敗しました: ' + error.message);
    } else {
      await loadConsultations();
    }
  };

  return {
    consultations,
    loading,
    reload: loadConsultations,
    applyCoachApplication,
    askQuestion,
    answerQuestion,
    updateQuestionStatus,
    reportQuestion
  };
}
