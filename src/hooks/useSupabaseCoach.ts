import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

// Consultant structure used in CoachSupportView
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

    // We store the generic consultation JSON in the `coach_chat_history` table
    // using coach_id = 'consultation_board' and text = JSON string.
    const { data, error } = await supabase
      .from('coach_chat_history')
      .select('*')
      .eq('coach_id', 'consultation_board')
      .order('created_at', { ascending: false });

    if (data && !error) {
      try {
        const parsed = data.map(row => {
          const obj = JSON.parse(row.text);
          // If viewing our own consultation, or a public board (RLS allows seeing our own)
          // Actually, our RLS policy says: CREATE POLICY "coach_chats select" ON coach_chat_history FOR SELECT USING (user_id = auth.uid());
          // So we only get our OWN consultations.
          return {
            ...obj,
            isMine: row.user_id === user.id
          };
        });
        setConsultations(parsed);
      } catch (e) {
        console.error('JSON Parse error in consultations', e);
      }
    }
    setLoading(false);
  }, [useDB, user]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  // Save the entire list or individual consultation
  // To keep it simple and match the local storage behavior, passing updated array:
  const saveConsultation = async (consultation: CoachConsultation) => {
    if (!useDB || !user) return;
    
    // First, check if it already exists
    const { data } = await supabase
      .from('coach_chat_history')
      .select('id')
      .eq('coach_id', 'consultation_board')
      .like('text', `%"id":"${consultation.id}"%`);
      
    if (data && data.length > 0) {
      // Update by deleting and re-inserting, or just generic update
      await supabase
        .from('coach_chat_history')
        .update({ text: JSON.stringify(consultation) })
        .eq('id', data[0].id);
    } else {
      // Insert new
      await supabase.from('coach_chat_history').insert({
        user_id: user.id,
        coach_id: 'consultation_board',
        sender_type: 'user',
        text: JSON.stringify(consultation)
      });
    }
    
    // Optimistic update
    setConsultations(prev => {
      const exists = prev.find(c => c.id === consultation.id);
      if (exists) return prev.map(c => c.id === consultation.id ? consultation : c);
      return [consultation, ...prev];
    });
  };

  return {
    consultations,
    loading,
    saveConsultation,
    reload: loadConsultations,
    setConsultationsOptimistic: setConsultations
  };
}
