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
}

export function useSupabaseCoach() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<CoachConsultation[]>([]);
  const [loading, setLoading] = useState(false);
  const useDB = isSupabaseConfigured();

  const loadConsultations = useCallback(async () => {
    if (!useDB || !user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('coach_questions')
      .select(`
        *,
        profiles:user_id(nickname, avatar_emoji),
        coach:answered_by(nickname, avatar_emoji, coach_rank, coach_answer_count, coach_avg_rating)
      `)
      .order('created_at', { ascending: false });

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
  }, [useDB, user]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const applyCoachApplication = async (fullName: string, nickname: string) => {
     if (!useDB || !user) return { error: 'Not configured' };
     const { error } = await supabase.from('coach_applications').upsert({
       user_id: user.id,
       full_name: fullName,
       nickname: nickname,
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
    if (!useDB || !user) return;
    const { error } = await supabase.from('coach_questions').update({
      answer: answer,
      status: 'answered',
      answered_by: user.id,
      answered_at: new Date().toISOString()
    }).eq('id', id);

    if (!error) {
      await loadConsultations();
    }
  };
  
  const updateQuestionStatus = async (id: string, status: string, rating?: number) => {
     if (!useDB || !user) return;
     const updates: any = { status };
     if (rating !== undefined) updates.user_rating = rating;
     
     const { error } = await supabase.from('coach_questions').update(updates).eq('id', id);
     if (!error) {
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
    updateQuestionStatus
  };
}
