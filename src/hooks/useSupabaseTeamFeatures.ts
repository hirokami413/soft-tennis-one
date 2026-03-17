import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export interface ChatMsg {
  id: string;
  sender: string;
  senderId: string;
  targetId: string;
  text: string;
  time: string;
  attachments?: any[];
}

export interface PracticeEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  needsAttendance: boolean;
  attendance: Record<string, string>; // userId -> status
  comments: any[];
}

export interface BoardPost {
  id: string;
  author: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  attachments?: any[];
}

export function useSupabaseTeamFeatures(teamId: string | undefined) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [events, setEvents] = useState<PracticeEvent[]>([]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to format time (HH:mm)
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Helper to format date (YYYY-MM-DD HH:mm)
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${formatTime(isoString)}`;
  };

  const loadFeatures = useCallback(async () => {
    if (!teamId || !user || !isSupabaseConfigured()) {
      setChats([]);
      setEvents([]);
      setBoardPosts([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch Chats
      const { data: chatData, error: chatError } = await supabase
        .from('team_chats')
        .select(`*, profiles:sender_id(nickname)`)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (chatData && !chatError) {
        setChats(chatData.map(c => ({
          id: c.id,
          sender: c.profiles?.nickname || 'Unknown',
          senderId: c.sender_id,
          targetId: c.target_id,
          text: c.text,
          time: formatTime(c.created_at),
          attachments: c.attachments || []
        })));
      }

      // Fetch Events
      const { data: eventData, error: eventError } = await supabase
        .from('team_events')
        .select(`*`)
        .eq('team_id', teamId)
        .order('event_date', { ascending: true });

      if (eventData && !eventError) {
        // Fetch attendances for these events
        const eventIds = eventData.map(e => e.id);
        const { data: attData } = await supabase
          .from('event_attendances')
          .select('*')
          .in('event_id', eventIds);

        setEvents(eventData.map(e => {
          const attendanceMap: Record<string, string> = {};
          if (attData) {
            attData.filter(a => a.event_id === e.id).forEach(a => {
              attendanceMap[a.user_id] = a.status;
            });
          }
          return {
            id: e.id,
            title: e.title,
            date: e.event_date,
            time: e.event_time || '',
            location: e.location || '',
            needsAttendance: e.needs_attendance,
            attendance: attendanceMap,
            comments: [] // Simplification: skip comments for now or fetch separately
          };
        }));
      }

      // Fetch Board Posts
      const { data: boardData, error: boardError } = await supabase
        .from('team_board_posts')
        .select(`*, profiles:author_id(nickname)`)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (boardData && !boardError) {
        setBoardPosts(boardData.map(b => ({
          id: b.id,
          author: b.profiles?.nickname || 'Unknown',
          authorId: b.author_id,
          title: b.title,
          content: b.content,
          createdAt: formatDateTime(b.created_at),
          attachments: b.attachments || []
        })));
      }

    } catch (err) {
      console.error('Failed to load team features:', err);
    }
    setLoading(false);
  }, [teamId, user]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Actions
  const sendChat = async (text: string, targetId: string = 'all') => {
    if (!teamId || !user) return;
    const { error } = await supabase.from('team_chats').insert({
      team_id: teamId,
      sender_id: user.id,
      target_id: targetId,
      text
    });
    if (!error) loadFeatures();
  };

  const addEvent = async (title: string, date: string, time: string, location: string, needsAttendance: boolean) => {
    if (!teamId || !user) return;
    const { error } = await supabase.from('team_events').insert({
      team_id: teamId,
      title,
      event_date: date,
      event_time: time,
      location,
      needs_attendance: needsAttendance,
      author_id: user.id
    });
    if (!error) loadFeatures();
  };

  const updateAttendance = async (eventId: string, status: string) => {
    if (!user) return;
    const { error } = await supabase.from('event_attendances').upsert({
      event_id: eventId,
      user_id: user.id,
      status
    }, { onConflict: 'event_id,user_id' });
    if (!error) loadFeatures();
  };

  const addBoardPost = async (title: string, content: string) => {
    if (!teamId || !user) return;
    const { error } = await supabase.from('team_board_posts').insert({
      team_id: teamId,
      author_id: user.id,
      title,
      content
    });
    if (!error) loadFeatures();
  };

  return {
    chats,
    events,
    boardPosts,
    loading,
    sendChat,
    addEvent,
    updateAttendance,
    addBoardPost,
    reload: loadFeatures
  };
}
