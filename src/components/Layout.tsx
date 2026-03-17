import React, { useState, type ReactNode } from 'react';
import { Sun, Moon, Bell, Check, Home, BookOpen, LogOut, Coins, Edit3, BellOff, Trash2, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications, type Notification } from '../contexts/NotificationContext';
import { ProfileEditModal } from './ProfileEditModal';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const notifTypeConfig: Record<Notification['type'] | 'team', { emoji: string; color: string }> = {
  coach: { emoji: '🎓', color: 'bg-indigo-100 dark:bg-indigo-900/40' },
  team: { emoji: '👥', color: 'bg-blue-100 dark:bg-blue-900/40' },
  note: { emoji: '📝', color: 'bg-emerald-100 dark:bg-emerald-900/40' },
  system: { emoji: '⚙️', color: 'bg-slate-100 dark:bg-slate-700' },
};

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const isProCoach = user?.systemRole === 'coach' || user?.systemRole === 'admin';
  const { isDark, toggleDark } = useTheme();
  const { notifications, unreadCount, notificationsEnabled, markRead, markAllRead, clearAll, toggleNotifications } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const tabs = [
    { id: 'menu', label: '練習メニュー', icon: Home },
    { id: 'note', label: 'テニスノート', icon: BookOpen },
    { id: 'coach', label: 'コーチ相談', icon: ShieldCheck },
    ...(isProCoach ? [{ id: 'pro-dashboard', label: 'プロ管理', icon: ShieldCheck }] : []),
    { id: 'about', label: 'Nexus One', icon: Info },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    return `${Math.floor(diff / 86400000)}日前`;
  };

  return (
    <div className={`flex flex-col min-h-screen pb-20 md:pb-0 md:pt-16 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-brand-surface text-slate-800'}`}>
      {/* Desktop Header */}
      <header className={`hidden md:flex fixed top-0 w-full h-16 border-b z-50 items-center justify-between px-6 print:hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ソフトテニス One" className="w-8 h-8 rounded-full object-cover shadow-sm bg-white" />
          <h1 className={`text-xl font-bold flex flex-col ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <span className={`text-[10px] font-medium leading-none mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ソフトテニス総合プラットフォーム</span>
            <span>ソフトテニス One</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full mr-1 ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <Coins size={16} />
              <span className="text-sm font-bold tracking-tight">{user.coins || 0}</span>
            </div>
          )}
          {/* Dark Mode Toggle */}
          <button onClick={toggleDark} className={`p-2 rounded-full transition-all ${isDark ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifPanel(!showNotifPanel); setShowUserMenu(false); }}
              className={`p-2 rounded-full transition-all relative ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {/* Notification Panel */}
            {showNotifPanel && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl border py-0 z-50 max-h-[70vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>🔔 通知</span>
                    <div className="flex items-center gap-2">
                      <button onClick={toggleNotifications} className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${notificationsEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                        {notificationsEnabled ? <Bell size={10} /> : <BellOff size={10} />}
                        {notificationsEnabled ? 'ON' : 'OFF'}
                      </button>
                      {notifications.length > 0 && (
                        <>
                          <button onClick={markAllRead} className="text-[10px] text-brand-blue font-bold hover:underline flex items-center gap-0.5"><Check size={10} />既読</button>
                          <button onClick={clearAll} className="text-[10px] text-slate-400 hover:text-red-500 font-bold"><Trash2 size={10} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[55vh]">
                    {notifications.length === 0 ? (
                      <p className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>通知はありません</p>
                    ) : (
                      notifications.map(n => {
                        const cfg = notifTypeConfig[n.type];
                        return (
                          <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b last:border-b-0 ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-50 hover:bg-slate-50'} ${!n.read ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50/50') : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${cfg.color}`}>{cfg.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{n.title}</p>
                              <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatTime(n.createdAt)}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-brand-blue shrink-0 mt-2" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile */}
          {user && (
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifPanel(false); }}
                className={`flex items-center gap-2 border rounded-full pl-2 pr-3 py-1.5 transition-all ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
              >
                <span className="text-lg">{user.avatarEmoji}</span>
                <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{user.nickname}</span>
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowUserMenu(false)} />
                  <div className={`fixed right-4 top-16 md:absolute md:right-0 md:top-full md:mt-2 w-48 rounded-xl shadow-lg border py-2 z-[70] animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{user.avatarEmoji} {user.nickname}</p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {user.provider === 'google' ? 'Google' : user.provider === 'line' ? 'LINE' : 'Apple'} でログイン中
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowProfileEdit(true); setShowUserMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Edit3 size={14} />
                      プロフィール編集
                    </button>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={14} />
                      ログアウト
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 print:hidden">
          <h1 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <img src="/logo.png" alt="ソフトテニス One" className="w-6 h-6 rounded-full object-cover shadow-sm bg-white" />
            <div className="flex flex-col">
              <span className={`text-[9px] font-medium leading-none mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ソフトテニス総合プラットフォーム</span>
              <span className="leading-none">ソフトテニス One</span>
            </div>
          </h1>
          <div className="flex items-center gap-1">
            {user && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full mr-1 ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <Coins size={14} />
                <span className="text-xs font-bold tracking-tight">{user.coins || 0}</span>
              </div>
            )}
            {/* Dark Mode (Mobile) */}
            <button onClick={toggleDark} className={`p-2 rounded-full ${isDark ? 'text-yellow-400' : 'text-slate-500'}`}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Notification (Mobile) */}
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full relative ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {/* User (Mobile) */}
            {user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-1.5 border rounded-full pl-1.5 pr-3 py-1 shadow-sm ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
              >
                <span className="text-base">{user.avatarEmoji}</span>
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>{user.nickname}</span>
              </button>
            ) : null}
          </div>
          {/* Mobile menus reuse the same panels rendered in Desktop code above */}
        </div>

        {/* Mobile Notification Panel (overlay) */}
        {showNotifPanel && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowNotifPanel(false)} />
            <div className={`absolute top-0 right-0 w-full max-w-sm h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <div className={`px-4 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>🔔 通知</span>
                <div className="flex items-center gap-2">
                  <button onClick={toggleNotifications} className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${notificationsEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {notificationsEnabled ? <Bell size={10} /> : <BellOff size={10} />}
                    {notificationsEnabled ? 'ON' : 'OFF'}
                  </button>
                  {notifications.length > 0 && <button onClick={markAllRead} className="text-[10px] text-brand-blue font-bold">既読</button>}
                  <button onClick={() => setShowNotifPanel(false)} className={`text-slate-400 ${isDark ? 'hover:text-slate-200' : 'hover:text-slate-600'}`}>✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>通知はありません</p>
                ) : (
                  notifications.map(n => {
                    const cfg = notifTypeConfig[n.type];
                    return (
                      <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left px-4 py-3 flex gap-3 border-b ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-50 hover:bg-slate-50'} ${!n.read ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50/50') : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${cfg.color}`}>{cfg.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{n.title}</p>
                          <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatTime(n.createdAt)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-brand-blue shrink-0 mt-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile User Menu (overlay) */}
        {showUserMenu && user && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowUserMenu(false)} />
            <div className={`absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-xl p-5 space-y-3 animate-in slide-in-from-bottom duration-200 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-2xl">{user.avatarEmoji}</div>
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{user.nickname}</p>
                  <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {user.provider === 'google' ? 'Google' : user.provider === 'line' ? 'LINE' : 'Apple'} でログイン中
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowProfileEdit(true); setShowUserMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
                <Edit3 size={16} /> プロフィール編集
              </button>
              <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors">
                <LogOut size={16} /> ログアウト
              </button>
            </div>
          </div>
        )}

        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 w-full h-20 backdrop-blur-lg border-t z-50 flex items-center justify-around px-2 pb-safe print:hidden ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? 'text-brand-blue' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Footer Navigation */}
      <nav className={`hidden md:flex fixed bottom-0 w-full h-16 border-t z-50 justify-center print:hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="w-full max-w-2xl flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="text-sm font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile Edit Modal */}
      {showProfileEdit && <ProfileEditModal onClose={() => setShowProfileEdit(false)} />}
    </div>
  );
};
