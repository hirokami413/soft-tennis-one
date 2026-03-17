import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'coach' | 'team' | 'note' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  notificationsEnabled: boolean;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  toggleNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const LOCAL_KEY = 'app_notifications';
const LOCAL_ENABLED_KEY = 'app_notifications_enabled';

function isSupabaseUser(userId?: string): boolean {
  return !!userId && !userId.startsWith('user_');
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const useDB = isSupabaseUser(user?.id);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_ENABLED_KEY);
      return stored ? JSON.parse(stored) : true;
    } catch { return true; }
  });

  // localStorage同期
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem(LOCAL_ENABLED_KEY, JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  // Supabaseからロード
  useEffect(() => {
    if (!useDB || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setNotifications(data.map(r => ({
          id: r.id, type: r.type as Notification['type'],
          title: r.title, message: r.message,
          createdAt: r.created_at, read: r.read,
        })));
      }
    };
    load();
  }, [useDB, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    if (!notificationsEnabled) return;
    const newNotif: Notification = {
      ...n,
      id: 'notif_' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));

    // Supabase DB にも保存
    if (useDB && user) {
      supabase.from('notifications').insert({
        user_id: user.id, type: n.type, title: n.title, message: n.message,
      }).then();
    }
  }, [notificationsEnabled, useDB, user]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (useDB) { supabase.from('notifications').update({ read: true }).eq('id', id).then(); }
  }, [useDB]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (useDB && user) {
      supabase.from('notifications').update({ read: true }).eq('user_id', user.id).then();
    }
  }, [useDB, user]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (useDB && user) {
      supabase.from('notifications').delete().eq('user_id', user.id).then();
    }
  }, [useDB, user]);

  const toggleNotifications = () => setNotificationsEnabled(prev => !prev);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, notificationsEnabled,
      addNotification, markRead, markAllRead, clearAll, toggleNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
