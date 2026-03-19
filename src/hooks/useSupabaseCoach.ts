import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CoachAnswer {
  id: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  coachRank: string;
  answer: string;
  createdAt: string;
  isBestAnswer: boolean;
  media?: any[];
  coachAvatarUrl?: string;
}

export interface CoachConsultation {
  id: string;
  question: string;
  status: 'waiting' | 'answered' | 'resolved';
  createdAt: string;
  answers: CoachAnswer[];
  userRating?: number;
  isMine?: boolean;
  userNickname?: string;
  userAvatar?: string;
  questionType?: 'text' | 'video';
  category?: string;
  report_reason?: string | null;
  media?: any[];
  // 後方互換: 旧answerフィールド（単一回答）
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  coach?: any;
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

    // 質問データ取得
    const { data, error } = await supabase
      .from('coach_questions')
      .select(`
        *,
        profiles:user_id(nickname, avatar_emoji)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('相談データ取得エラー:', error.message, error);
    }

    // 回答データ取得（coach_answersテーブルから）
    const { data: answersData, error: answersError } = await supabase
      .from('coach_answers')
      .select(`
        *,
        coach:coach_id(nickname, avatar_emoji, avatar_url, coach_rank)
      `)
      .order('created_at', { ascending: true });

    if (answersError) {
      console.error('回答データ取得エラー:', answersError.message);
    }

    // 回答をquestion_idでグルーピング
    const answersByQuestion: Record<string, CoachAnswer[]> = {};
    if (answersData) {
      for (const row of answersData) {
        const qid = row.question_id;
        if (!answersByQuestion[qid]) answersByQuestion[qid] = [];
        answersByQuestion[qid].push({
          id: row.id,
          coachId: row.coach_id,
          coachName: row.coach?.nickname || '不明',
          coachAvatar: row.coach?.avatar_emoji || '🏐',
          coachRank: row.coach?.coach_rank || 'bronze',
          answer: row.answer,
          createdAt: row.created_at,
          isBestAnswer: row.is_best_answer,
          media: row.media || undefined,
          coachAvatarUrl: row.coach?.avatar_url || undefined,
        });
      }
    }

    if (data && !error) {
      const parsed: CoachConsultation[] = data.map(row => ({
        id: row.id,
        question: row.question,
        status: row.status === 'reask' ? 'waiting' : row.status, // reask→waiting に変換
        createdAt: row.created_at,
        answers: answersByQuestion[row.id] || [],
        userRating: row.user_rating,
        questionType: row.question_type,
        category: row.category,
        report_reason: row.report_reason,
        media: row.media || undefined,
        // 後方互換: 旧データ（coach_questions.answerに直接入っているもの）
        answer: row.answer,
        answeredBy: row.answered_by,
        answeredAt: row.answered_at,
        isMine: row.user_id === user.id,
        userNickname: row.profiles?.nickname,
        userAvatar: row.profiles?.avatar_emoji,
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

  // 24時間経過した質問の最初の回答者を自動ベストアンサーにする
  useEffect(() => {
    if (!useDB || !user || consultations.length === 0) return;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    for (const c of consultations) {
      // answeredステータスで、回答が1つ以上あり、ベストアンサーがまだ選ばれていない場合
      if (c.status === 'answered' && c.answers.length > 0 && !c.answers.some(a => a.isBestAnswer)) {
        // 最初の回答の投稿日時から24時間経過しているか
        const firstAnswer = c.answers[0]; // answers are sorted by created_at ascending
        const elapsed = now - new Date(firstAnswer.createdAt).getTime();
        if (elapsed >= TWENTY_FOUR_HOURS) {
          console.log(`24時間経過: 質問 ${c.id} の最初の回答者 ${firstAnswer.coachId} を自動ベストアンサーに選定`);
          selectBestAnswer(firstAnswer.id, c.id);
          break; // 1回のロードで1つだけ処理（連鎖を防ぐ）
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations]);

  const applyCoachApplication = async (fullName: string, nickname: string, extra?: { yearsExperience?: string; certification?: string; selfIntro?: string; tournamentResults?: string; idDocumentUrl?: string; resumeUrl?: string }) => {
     if (!useDB || !user) return { error: 'Not configured' };

     // 既存の応募を確認
     const { data: existing } = await supabase
       .from('coach_applications')
       .select('id, status')
       .eq('user_id', user.id)
       .limit(1)
       .single();

     const payload = {
       full_name: fullName,
       nickname: nickname,
       years_experience: extra?.yearsExperience || '',
       certification: extra?.certification || '',
       self_intro: extra?.selfIntro || '',
       tournament_results: extra?.tournamentResults || '',
       id_document_url: extra?.idDocumentUrl || '',
       resume_url: extra?.resumeUrl || '',
       status: 'pending',
       created_at: new Date().toISOString(),
     };

     let error;
     if (existing) {
       // 既存行を更新（rejected → pending に戻す）
       ({ error } = await supabase
         .from('coach_applications')
         .update(payload)
         .eq('id', existing.id));
     } else {
       // 新規追加
       ({ error } = await supabase
         .from('coach_applications')
         .insert({ user_id: user.id, ...payload }));
     }

     return { error };
  };

  const askQuestion = async (content: Partial<CoachConsultation> & { media?: any[] }) => {
    if (!useDB || !user) return;
    const { data, error } = await supabase.from('coach_questions').insert({
      user_id: user.id,
      question: content.question,
      category: content.category || '',
      question_type: content.questionType || 'text',
      status: 'waiting',
      media: content.media && content.media.length > 0 ? content.media : null,
    }).select().single();

    if (data && !error) {
       await loadConsultations();
    }
  };

  // コーチが回答を送信（coach_answersテーブルにINSERT）
  const answerQuestion = async (questionId: string, answer: string, media?: any[]) => {
    if (!useDB || !user) return false;

    // 3回答上限チェック
    const { count } = await supabase
      .from('coach_answers')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', questionId);
    if (count !== null && count >= 3) {
      alert('この質問には既に3件の回答があります。');
      return false;
    }

    // coach_answersにINSERT
    const { error } = await supabase.from('coach_answers').insert({
      question_id: questionId,
      coach_id: user.id,
      answer: answer,
      media: media && media.length > 0 ? media : null,
    });

    if (error) {
      console.error('回答の保存に失敗しました:', error.message, error);
      alert('回答の保存に失敗しました: ' + error.message);
      return false;
    }

    // 回答送信の即時報酬: +50コイン
    await supabase.rpc('add_coins', { p_user_id: user.id, p_amount: 50 });

    // 質問のステータスをansweredに更新（まだwaitingの場合のみ）
    await supabase.from('coach_questions').update({
      status: 'answered',
    }).eq('id', questionId).eq('status', 'waiting');

    // 質問者に通知を送信
    const { data: questionData } = await supabase
      .from('coach_questions')
      .select('user_id')
      .eq('id', questionId)
      .single();

    if (questionData?.user_id) {
      await supabase.from('notifications').insert({
        user_id: questionData.user_id,
        type: 'coach',
        title: '🎓 コーチが質問に回答しました',
        message: `${user.nickname || 'コーチ'}があなたの質問に回答しました。コーチ相談を確認してください。`,
      });
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
  const BASE_REWARD = 600;

  // ベストアンサーを選択 → 選ばれたコーチにコイン付与
  const selectBestAnswer = async (answerId: string, questionId: string, rating?: number) => {
    if (!useDB || !user) return;

    // 既に解決済みかチェック（二重実行防止）
    const { data: questionCheck } = await supabase.from('coach_questions')
      .select('status')
      .eq('id', questionId)
      .single();
    if (questionCheck?.status === 'resolved') {
      console.log('既にベストアンサーが設定済みです');
      await loadConsultations();
      return;
    }

    // ベストアンサーをセット
    const { error } = await supabase.from('coach_answers')
      .update({ is_best_answer: true })
      .eq('id', answerId);

    if (error) {
      console.error('ベストアンサー設定失敗:', error);
      alert('ベストアンサーの設定に失敗しました: ' + error.message);
      return;
    }

    // 質問をresolvedに + 評価を保存
    const questionUpdate: any = { status: 'resolved' };
    if (rating !== undefined) questionUpdate.user_rating = rating;
    await supabase.from('coach_questions')
      .update(questionUpdate)
      .eq('id', questionId);

    // ベストアンサーのコーチIDを取得
    const { data: bestAnswer } = await supabase.from('coach_answers')
      .select('coach_id')
      .eq('id', answerId)
      .single();

    if (!bestAnswer?.coach_id) {
      await loadConsultations();
      return;
    }

    // コーチにコイン報酬を付与
    try {
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('coach_rank, coach_answer_count, coach_avg_rating')
        .eq('id', bestAnswer.coach_id)
        .single();

      const rank = coachProfile?.coach_rank || 'bronze';
      const config = RANK_CONFIG[rank] || RANK_CONFIG.bronze;
      const reward = Math.floor(BASE_REWARD * config.multiplier);

      // コイン付与
      const { error: coinErr } = await supabase.rpc('add_coins', { p_user_id: bestAnswer.coach_id, p_amount: reward });
      if (coinErr) {
        console.error('コイン付与失敗:', coinErr);
      } else {
        console.log(`コーチ ${bestAnswer.coach_id} に ${reward}コイン付与成功`);
      }

      // 回答数+1
      await supabase.rpc('increment_coach_answer_count', { p_coach_id: bestAnswer.coach_id });

      // ランクアップ判定
      if (coachProfile) {
        const newCount = (coachProfile.coach_answer_count || 0) + 1;
        const avgRating = coachProfile.coach_avg_rating || 0;
        const condition = RANK_UP_CONDITIONS[rank];

        if (condition?.next && newCount >= condition.answers && avgRating >= condition.rating) {
          await supabase.rpc('update_coach_rank', { p_coach_id: bestAnswer.coach_id, p_new_rank: condition.next });
          const bonus = RANK_CONFIG[condition.next]?.rankUpBonus || 0;
          if (bonus > 0) {
            await supabase.rpc('add_coins', { p_user_id: bestAnswer.coach_id, p_amount: bonus });
          }
        }
      }
    } catch (e) {
      console.error('コイン付与処理でエラー:', e);
    }

    // ベストアンサーに選ばれたコーチに通知
    await supabase.from('notifications').insert({
      user_id: bestAnswer.coach_id,
      type: 'coach',
      title: '🏆 ベストアンサーに選ばれました！',
      message: 'あなたの回答がベストアンサーに選ばれました。おめでとうございます！',
    });

    await loadConsultations();
  };

  const updateQuestionStatus = async (id: string, status: string, rating?: number) => {
     if (!useDB || !user) return;
     const updates: any = status === 'rated' ? {} : { status };
     if (rating !== undefined) updates.user_rating = rating;
     
     const { error } = await supabase.from('coach_questions').update(updates).eq('id', id);
     if (error) {
       console.error('ステータス更新失敗:', error);
       return;
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

  const reportAnswer = async (answerId: string, reason: string) => {
    if (!useDB || !user) return;
    const { error } = await supabase.from('coach_answers').update({
      reported: true,
      report_reason: reason,
      reported_at: new Date().toISOString(),
      reported_by: user.id
    }).eq('id', answerId);
    if (error) {
      console.error('回答の報告に失敗:', error);
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
    selectBestAnswer,
    updateQuestionStatus,
    reportQuestion,
    reportAnswer
  };
}
