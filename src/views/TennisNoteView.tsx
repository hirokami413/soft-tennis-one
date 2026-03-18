import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNotifications } from '../contexts/NotificationContext';
import { useSupabaseNotes, useSupabaseGoals } from '../hooks/useSupabaseNotes';
import type { Goal } from '../hooks/useSupabaseNotes';
import { uploadFile, generateFilePath } from '../lib/storage';
import { 
  BookOpen, Plus, Target, TrendingUp, Star, Lock,
  ChevronDown, ChevronUp, Edit3, Check, Crown, Shield, MessageCircle,
  Video, CheckCircle2, ChevronLeft, ChevronRight, CalendarDays, Send,
  Image as ImageIcon, X, Film, Link, Trash2, Globe, Coins, Users
} from 'lucide-react';

// ── Radar Chart (SVG) ──
const RadarChart: React.FC<{ skills: number[] }> = ({ skills }) => {
  const labels = ['フォア', 'バック', 'ボレー', 'サーブ', 'フットワーク', '戦術'];
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 75;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / 10) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, level));
        return (
          <polygon key={level} points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#e2e8f0" strokeWidth={level === 10 ? 1.5 : 0.5} />
        );
      })}
      {/* Axes */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} />;
      })}
      {/* Data */}
      <polygon
        points={skills.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth={2}
      />
      {skills.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />;
      })}
      {/* Labels */}
      {labels.map((label, i) => {
        const p = getPoint(i, 12);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] font-bold fill-slate-500">{label}</text>
        );
      })}
    </svg>
  );
};


// ── Component ──
export const TennisNoteView: React.FC = () => {
  const { canUseTennisNoteBase, canAskCoachInNote } = useSubscription();
  const { addCoins, user } = useAuth();
  const { addNotification } = useNotifications();
  const { notes, addNote, publishNote } = useSupabaseNotes();
  const { goals, setGoals, addGoal: addGoalToDb, deleteGoal: deleteGoalFromDb } = useSupabaseGoals();
  const [expandedNote, setExpandedNote] = useState<string | null>('n-1');
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [noteTab, setNoteTab] = useState<'write' | 'history' | 'community' | 'goals'>('write');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  // Calendar State
  const todayDate = new Date();
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(fmtDate(todayDate));

  // New note form
  const [newKeep, setNewKeep] = useLocalStorage('tennis_notes_new_keep', '');
  const [newProblem, setNewProblem] = useLocalStorage('tennis_notes_new_problem', '');
  const [newTry, setNewTry] = useLocalStorage('tennis_notes_new_try', '');
  const [newCoachQuestion, setNewCoachQuestion] = useLocalStorage('tennis_notes_new_q', '');
  const [newOther, setNewOther] = useLocalStorage('tennis_notes_new_other', '');
  const [newSkills, setNewSkills] = useLocalStorage('tennis_notes_new_skills', [3, 3, 3, 3, 3, 3]);
  const [newGoalText, setNewGoalText] = useLocalStorage('tennis_notes_new_goal_text', '');
  const [newGoalType, setNewGoalType] = useLocalStorage<'short' | 'mid'>('tennis_notes_new_goal_type', 'short');
  const [newMedia, setNewMedia] = useState<{ type: 'image' | 'video' | 'url'; name: string; url?: string }[]>([]);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  const handleMediaUpload = async (type: 'image' | 'video', file: File) => {
    if (!user) return;
    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      alert(`ファイルサイズが大きすぎます。${type === 'image' ? '画像は5MB' : '動画は50MB'}以下のファイルを選択してください。\n現在のサイズ: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }
    setMediaUploading(true);
    const folder = type === 'image' ? 'images' : 'videos';
    const path = generateFilePath(user.id, folder, file.name);
    const { url, error } = await uploadFile('note-media', path, file);
    if (error) {
      alert('アップロードに失敗しました: ' + error);
    } else if (url) {
      setNewMedia(prev => [...prev, { type, name: file.name, url }]);
    }
    setMediaUploading(false);
  };

  const skillLabels = ['フォア', 'バック', 'ボレー', 'サーブ', 'フットワーク', '戦術'];

  // Advice Plan State
  const [advicePlan, setAdvicePlan] = useLocalStorage<'none' | 'light' | 'standard' | 'premium'>('tennis_note_advice_plan', 'none');
  const [monthlyUsed, setMonthlyUsed] = useLocalStorage('tennis_note_monthly_used', 0);
  const [monthlyVideoUsed, setMonthlyVideoUsed] = useLocalStorage('tennis_note_monthly_video_used', 0);
  const [sentNotes, setSentNotes] = useLocalStorage<string[]>('tennis_note_sent_notes', []);

  const planLimits: Record<string, { limit: number; videoLimit: number; label: string }> = {
    none: { limit: 0, videoLimit: 0, label: '未加入' },
    light: { limit: 3, videoLimit: 0, label: 'ライト' },
    standard: { limit: 8, videoLimit: 1, label: 'スタンダード' },
    premium: { limit: 999, videoLimit: 3, label: 'プレミアム' },
  };

  const canSendToCoach = advicePlan !== 'none' && monthlyUsed < planLimits[advicePlan].limit;
  const remainingSends = advicePlan !== 'none' ? Math.max(0, planLimits[advicePlan].limit - monthlyUsed) : 0;
  const remainingVideoSends = advicePlan !== 'none' ? Math.max(0, planLimits[advicePlan].videoLimit - monthlyVideoUsed) : 0;

  const handleSendToCoach = (noteId: string, hasVideo: boolean) => {
    if (!canSendToCoach || sentNotes.includes(noteId)) return;
    if (hasVideo && remainingVideoSends <= 0) return;
    setSentNotes(prev => [...prev, noteId]);
    setMonthlyUsed(prev => prev + 1);
    if (hasVideo) setMonthlyVideoUsed(prev => prev + 1);
  };

  const handleAddNote = async () => {
    if (!newKeep && !newProblem && !newTry) return;
    await addNote({
      date: selectedDate,
      keep: newKeep, problem: newProblem, tryItem: newTry,
      coachQuestion: newCoachQuestion, other: newOther,
      skills: [...newSkills],
      media: newMedia.length > 0 ? [...newMedia] : undefined,
      published: false,
    });
    setNewKeep(''); setNewProblem(''); setNewTry('');
    setNewCoachQuestion(''); setNewOther('');
    setNewSkills([3,3,3,3,3,3]);
    setNewMedia([]);
    setShowForm(false);
  };

  const todayStr = fmtDate(todayDate);
  const alreadyPublishedToday = notes.some(n => n.published && n.date === todayStr);

  const handlePublishNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.date !== todayStr || alreadyPublishedToday) return;
    await publishNote(noteId);
    addCoins(20);
    addNotification({ type: 'system', title: '公開完了', message: 'ノートを公開して 20コイン 獲得しました！' });
  };

  const handleAddGoal = async () => {
    if (!newGoalText.trim()) return;
    await addGoalToDb(newGoalText, newGoalType);
    setNewGoalText('');
    setShowGoalForm(false);
  };

  const latestSkills = notes.length > 0 ? notes[0].skills : [3,3,3,3,3,3];

  const activeGoals = goals.filter(g => !g.done);
  const completedGoals = goals.filter(g => g.done);

  const GoalItem: React.FC<{ g: Goal }> = ({ g }) => (
    <div className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors space-y-1.5">
      <div className="flex items-center gap-3">
        <button onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, done: !x.done } : x))}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            g.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
          }`}>
          {g.done && <Check size={12}/>}
        </button>
        <span className={`flex-1 text-sm ${g.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{g.text}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          g.type === 'short' ? 'bg-blue-50 text-brand-blue' : 'bg-purple-50 text-purple-600'
        }`}>{g.type === 'short' ? '短期' : '中期'}</span>
        <button
          onClick={() => deleteGoalFromDb(g.id)}
          className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
          title="削除"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 ml-9">
        <span className="text-[10px] text-slate-400 w-10 shrink-0">達成度</span>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(v => (
            <button key={v}
              onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, progress: v } : x))}
              className={`w-5 h-5 rounded text-[9px] font-bold transition-colors ${
                (g.progress || 0) >= v ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-300'
              }`}
            >{v}</button>
          ))}
        </div>
        <span className="text-[9px] text-slate-400 ml-1">{g.progress || 0}/5</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <BookOpen size={20} /> テニスノート
          </h2>
          <p className="text-sm text-emerald-100">日々の練習を振り返り、技術の成長を可視化しよう</p>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1">
        {[
          { id: 'write' as const, label: 'ノート', icon: BookOpen },
          { id: 'history' as const, label: 'ノート一覧', icon: Star },
          { id: 'community' as const, label: 'みんなのノート', icon: Users },
          { id: 'goals' as const, label: '目標管理', icon: Target },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setNoteTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                noteTab === tab.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Note History Tab */}
      {noteTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={noteSearchQuery}
              onChange={e => setNoteSearchQuery(e.target.value)}
              placeholder="ノートを検索（Good/Problem/Try）..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:border-brand-blue shadow-sm"
            />
          </div>
          {/* Note List */}
          {notes
            .filter(n => {
              if (!noteSearchQuery.trim()) return true;
              const q = noteSearchQuery.toLowerCase();
              return n.keep.toLowerCase().includes(q) || n.problem.toLowerCase().includes(q) || n.tryItem.toLowerCase().includes(q) || n.other?.toLowerCase().includes(q);
            })
            .map(n => (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedNote(expandedNote === n.id ? null : n.id)} className="w-full p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-blue">{n.date}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedNote === n.id ? 'rotate-180' : ''}`} />
                  </div>
                  <p className={`text-sm text-slate-700 ${expandedNote === n.id ? '' : 'line-clamp-1'}`}>
                    {n.keep || n.problem || n.tryItem}
                  </p>
                </button>
                {expandedNote === n.id && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
                    {n.keep && (
                      <div className="bg-green-50 p-3 rounded-xl border-l-3 border-green-400">
                        <p className="text-[10px] font-bold text-green-600 mb-0.5">✅ Good</p>
                        <p className="text-xs text-slate-700">{n.keep}</p>
                      </div>
                    )}
                    {n.problem && (
                      <div className="bg-red-50 p-3 rounded-xl border-l-3 border-red-400">
                        <p className="text-[10px] font-bold text-red-600 mb-0.5">⚠️ Problem</p>
                        <p className="text-xs text-slate-700">{n.problem}</p>
                      </div>
                    )}
                    {n.tryItem && (
                      <div className="bg-blue-50 p-3 rounded-xl border-l-3 border-blue-400">
                        <p className="text-[10px] font-bold text-blue-600 mb-0.5">🚀 Try</p>
                        <p className="text-xs text-slate-700">{n.tryItem}</p>
                      </div>
                    )}
                    {n.other && (
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 mb-0.5">📝 その他</p>
                        <p className="text-xs text-slate-700">{n.other}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <RadarChart skills={n.skills} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          {notes.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">ノートがまだありません</p>
            </div>
          )}
        </div>
      )}

      {noteTab === 'write' && (<>

      {/* Radar Chart */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-blue" /> 技術レーダーチャート
        </h3>
        <RadarChart skills={latestSkills} />
        <p className="text-[11px] text-slate-400 text-center mt-2">最新ノートの自己評価に基づく</p>
      </div>

      {/* Calendar View */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <CalendarDays size={16} className="text-brand-blue" /> ノートカレンダー
          </h3>
          <div className="flex items-center gap-3 bg-slate-50 rounded-full px-2 py-1">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-500 transition-all"><ChevronLeft size={14}/></button>
            <span className="font-bold text-slate-700 text-xs w-16 text-center">{calYear}年 {calMonth+1}月</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-500 transition-all"><ChevronRight size={14}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
          {['日','月','火','水','木','金','土'].map(d => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => <span key={`e-${i}`} />)}
          {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
            const day = i + 1;
            const dStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const hasNote = notes.some(n => n.date === dStr);
            const isToday = dStr === fmtDate(todayDate);
            const isSelected = dStr === selectedDate;
            
            return (
              <button key={day} 
                onClick={() => setSelectedDate(dStr)}
                className={`w-9 h-9 mx-auto flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative ${
                  isSelected ? 'bg-brand-blue text-white shadow-sm ring-2 ring-blue-200 ring-offset-1' :
                  isToday ? 'bg-blue-50 text-brand-blue' :
                  'text-slate-600 hover:bg-slate-50'
                }`}>
                {day}
                {hasNote && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-blue'}`} />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3 bg-slate-50 py-1.5 rounded-lg">👆 日付をタップしてその日のノートを表示</p>
      </div>

      {/* Add Note Button / Upsell */}
      {canUseTennisNoteBase ? (
        <>
          <button onClick={() => setShowForm(!showForm)}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              showForm ? 'bg-slate-200 text-slate-600' : 'bg-brand-blue text-white hover:bg-brand-blue-hover'
            }`}>
            {showForm ? <><ChevronUp size={16}/> 閉じる</> : <><Edit3 size={16}/> ノートを書く</>}
          </button>

          {/* New Note Form */}
          {showForm && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {selectedDate} の振り返り
            {selectedDate === fmtDate(todayDate) && <span className="text-[9px] bg-brand-blue text-white px-2 py-0.5 rounded-full font-black">TODAY</span>}
          </h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-green-600">✅ 良かったこと・続けたいこと</label>
            <textarea value={newKeep} onChange={e => setNewKeep(e.target.value)}
              className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              placeholder="今日できたこと、よかったプレーは？" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-red-500">⚠️ 課題・改善点</label>
            <textarea value={newProblem} onChange={e => setNewProblem(e.target.value)}
              className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
              placeholder="うまくいかなかったこと、気になった点は？" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-blue">🚀 次の練習でやること</label>
            <textarea value={newTry} onChange={e => setNewTry(e.target.value)}
              className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              placeholder="次の練習で意識すること、試したいことは？" />
          </div>

          {/* Coach Question */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
              <MessageCircle size={12}/> 監督・指導者への相談
            </label>
            {canAskCoachInNote ? (
              <textarea value={newCoachQuestion} onChange={e => setNewCoachQuestion(e.target.value)}
                className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                placeholder="指導者に聞きたいこと、見てほしいプレーなどを書こう" />
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-20 flex flex-col items-center justify-center text-slate-400 cursor-not-allowed">
                <Lock size={14} className="mb-1" />
                <span className="text-[10px]">相談機能はライトプラン以上で利用できます</span>
              </div>
            )}
          </div>

          {/* Other */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">📝 その他（メモ・気づき）</label>
            <textarea value={newOther} onChange={e => setNewOther(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              placeholder="体調、天気、道具の変更など自由にメモ" />
          </div>

          {/* Skills Rating */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600">📊 技術自己評価（1-10）</label>
            {skillLabels.map((label, idx) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20">{label}</span>
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <button key={v} onClick={() => setNewSkills(prev => { const n = [...prev]; n[idx] = v; return n; })}
                      className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-colors ${
                        newSkills[idx] >= v ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Media Upload (Images always free, Video/URL require plan) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <ImageIcon size={12}/> 画像・動画・URLの添付
            </label>
            <div className="space-y-2">
              {mediaUploading && (
                <div className="text-xs text-indigo-600 font-bold animate-pulse text-center py-1">アップロード中...</div>
              )}
              {newMedia.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newMedia.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs">
                      {m.type === 'image' ? <ImageIcon size={12} className="text-blue-500" /> : m.type === 'video' ? <Film size={12} className="text-purple-500" /> : <Link size={12} className="text-indigo-500" />}
                      <span className="text-slate-600 max-w-[120px] truncate">{m.type === 'url' ? (() => { try { return new URL(m.name).hostname; } catch { return m.name; } })() : m.name}</span>
                      <button onClick={() => setNewMedia(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {/* 画像は常に無料で添付可能 */}
                <label
                  className="flex-1 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-center gap-1.5 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload('image', f); }} />
                  <ImageIcon size={14} /> 画像
                  <span className="text-[8px] text-green-500 font-bold">FREE</span>
                </label>
                {/* 動画はプラン限定 */}
                {advicePlan !== 'none' ? (
                  <label
                    className="flex-1 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-center gap-1.5 hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload('video', f); }} />
                    <Film size={14} /> 動画
                  </label>
                ) : (
                  <button disabled className="flex-1 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Film size={14} /> 動画
                    <Lock size={10} />
                  </button>
                )}
              </div>
              {/* URL入力はプラン限定 */}
              {advicePlan !== 'none' ? (
                <div className="flex gap-2">
                  <input
                    value={newUrlInput}
                    onChange={e => setNewUrlInput(e.target.value)}
                    placeholder="YouTubeやInstagramのURLを貼り付け"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => {
                      if (!newUrlInput.trim()) return;
                      setNewMedia(prev => [...prev, { type: 'url', name: newUrlInput.trim() }]);
                      setNewUrlInput('');
                    }}
                    className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <Link size={12} /> 追加
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-1">動画・URL添付はアドバイスプラン加入で利用可能</p>
              )}
            </div>
          </div>

          <button onClick={handleAddNote} disabled={mediaUploading} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40">
            {mediaUploading ? 'アップロード中...' : 'ノートを保存する'}
          </button>
        </div>
      )}
      </>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-brand-blue mb-2">
            <Lock size={20} />
          </div>
          <h3 className="font-bold text-slate-800">ノート機能はロックされています</h3>
          <p className="text-xs text-slate-600 leading-relaxed px-4">
            日々の振り返りを記録するには、サブスクリプションプラン（ライトプラン以上）への登録が必要です。過去の履歴は下部から引き続き閲覧できます。
          </p>
          <button className="mt-2 bg-brand-blue text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-sm hover:bg-brand-blue-hover transition-colors">
            プランを見る
          </button>
        </div>
      )}

      {/* Note History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">振り返りノート ({selectedDate})</h3>
          {selectedDate === fmtDate(todayDate) && <span className="text-[9px] font-black bg-brand-blue text-white px-2 py-0.5 rounded-full">TODAY</span>}
        </div>
        
        {notes.filter(n => n.date === selectedDate).length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
            <BookOpen size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm font-bold">この日のノートはありません</p>
            {selectedDate === fmtDate(todayDate) && canUseTennisNoteBase && (
               <p className="text-xs text-slate-400 mt-1">上の「ノートを書く」から今日の振り返りを記録しましょう</p>
            )}
          </div>
        ) : (
          notes.filter(n => n.date === selectedDate).map(note => {
          const isExpanded = expandedNote === note.id;
          return (
            <div key={note.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                className="w-full p-4 flex items-center justify-between text-left">
                <div>
                  <span className="text-sm font-bold text-slate-800">{note.date}</span>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">良: {note.keep || '—'}</p>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-3 animate-in fade-in">
                  <div className="bg-green-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-green-600 mb-1">✅ 良かったこと</p>
                    <p className="text-sm text-slate-700">{note.keep || '—'}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-red-500 mb-1">⚠️ 課題・改善点</p>
                    <p className="text-sm text-slate-700">{note.problem || '—'}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-brand-blue mb-1">🚀 次やること</p>
                    <p className="text-sm text-slate-700">{note.tryItem || '—'}</p>
                  </div>

                  {/* Coach Question display */}
                  {note.coachQuestion && (
                    <div className="bg-indigo-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-indigo-600 mb-1 flex items-center gap-1">
                        <MessageCircle size={10}/> 監督・指導者への相談
                      </p>
                      <p className="text-sm text-slate-700">{note.coachQuestion}</p>
                    </div>
                  )}

                  {/* Other display */}
                  {note.other && (
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">📝 その他</p>
                      <p className="text-sm text-slate-700">{note.other}</p>
                    </div>
                  )}

                  {/* Media display */}
                  {note.media && note.media.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-500">📎 添付メディア</p>
                      <div className="space-y-2">
                        {note.media.map((m: any, i: number) => (
                          <div key={i}>
                            {m.type === 'image' && m.url ? (
                              <img src={m.url} alt={m.name} className="w-full rounded-xl border border-slate-200 shadow-sm" />
                            ) : m.type === 'video' && m.url ? (
                              <video src={m.url} controls className="w-full rounded-xl border border-slate-200 shadow-sm" />
                            ) : m.type === 'url' ? (
                              <a href={m.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 underline hover:opacity-70">
                                <Link size={12} /> {m.name}
                              </a>
                            ) : (
                              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${
                                m.type === 'image' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                              }`}>
                                {m.type === 'image' ? <ImageIcon size={12} /> : <Film size={12} />}
                                {m.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coach Comment Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={12} className="text-brand-blue" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coach's Advice</span>
                    </div>
                    <div className="bg-white border border-blue-50 p-3 rounded-2xl relative">
                      <div className="absolute top-0 left-4 w-2 h-2 bg-white border-t border-l border-blue-50 -translate-y-1/2 rotate-45" />
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        {note.id === 'n-1' ? "動画でも確認しましたが、テイクバックがコンパクトになっていて非常に良いです！次はインパクト後のフォロースルーを意識しましょう。" : "最近フットワークが安定してきましたね。特に戻りの一歩目が速くなっています。"}
                      </p>
                      <div className="flex items-center justify-end mt-2 gap-1.5">
                        <div className="w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center text-[8px] text-white">N</div>
                        <span className="text-[9px] font-bold text-slate-400">上見 宏彰 指導員</span>
                      </div>
                    </div>
                  </div>
                  <RadarChart skills={note.skills} />

                  {/* Send to Coach Button */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {(() => {
                      const noteHasVideo = !!(note.media && note.media.some(m => m.type === 'video'));
                      if (sentNotes.includes(note.id)) {
                        return (
                          <div className="flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-600 text-xs font-bold">
                            <CheckCircle2 size={14} />
                            プロコーチに送信済み
                          </div>
                        );
                      }
                      if (advicePlan === 'none') {
                        return (
                          <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed">
                            <Lock size={14} />
                            ノートをプロコーチに送信（アドバイスプラン加入者限定）
                          </button>
                        );
                      }
                      if (!canSendToCoach) {
                        return (
                          <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-xl text-xs font-bold cursor-not-allowed">
                            <Lock size={14} />
                            今月の送信回数上限に達しました
                          </button>
                        );
                      }
                      if (noteHasVideo && remainingVideoSends <= 0) {
                        return (
                          <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl text-xs font-bold cursor-not-allowed">
                            <Lock size={14} />
                            動画付き送信の月間上限に達しました
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => handleSendToCoach(note.id, noteHasVideo)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs font-bold transition-colors active:scale-95"
                        >
                          <Send size={14} />
                          ノートをプロコーチに送信
                          <span className="text-[10px] opacity-80">
                            (残り{remainingSends}回{noteHasVideo ? ` / 動画残り${remainingVideoSends}回` : ''})
                          </span>
                        </button>
                      );
                    })()}

                    {/* Publish to Online Button */}
                    {note.published ? (
                      <div className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 text-xs font-bold">
                        <Globe size={14} />
                        オンライン公開済み（20コイン獲得済み）
                      </div>
                    ) : note.date !== todayStr ? (
                      <div className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs font-bold">
                        <Globe size={14} />
                        当日のノートのみ公開できます
                      </div>
                    ) : alreadyPublishedToday ? (
                      <div className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 text-xs font-bold">
                        <Globe size={14} />
                        本日はすでに1本公開済みです
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePublishNote(note.id)}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-colors active:scale-95 shadow-sm"
                      >
                        <Globe size={14} />
                        オンラインに公開する
                        <span className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full ml-1">
                          <Coins size={10} /> +20コイン
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {/* Privacy Note */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex gap-3 items-start">
        <Lock size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-600">プライバシー</p>
          <p>ノートは所属チームの「指導者」のみ閲覧・コメント可能です。他の生徒や保護者には公開されません。</p>
        </div>
      </div>

      {/* Pro Coaching Upsell */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-5 rounded-3xl relative overflow-hidden space-y-5">
        <div className="absolute top-3 right-3">
          <Crown size={20} className="text-yellow-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 mb-2 text-sm flex items-center gap-2">
            <Star size={16} className="text-yellow-500 fill-current" />
            Nexusプロコーチの個別アドバイス
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            あなたのテニスノートを、<strong>Nexus専属のプロコーチが必ず直接</strong>読んでアドバイス。一般の認証コーチとは異なり、実績あるプロが一人ひとりに向き合います。
          </p>
        </div>

        {/* Pro Coach Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white shrink-0">
            <Crown size={18}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider">Nexus Pro Coach</p>
            <p className="text-[11px] text-slate-600 leading-snug">プロコーチが必ず回答 ─ コーチ相談（認証コーチ回答）よりさらに上質な指導</p>
          </div>
        </div>

        {/* What you get */}
        <div className="bg-white/80 rounded-2xl p-4 space-y-2.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">個別アドバイスで受けられる内容</p>
          {[
            { icon: <CheckCircle2 size={14} className="text-green-500 shrink-0"/>, text: 'テニスノートの振り返りに対する具体的なフィードバックとアドバイス' },
            { icon: <CheckCircle2 size={14} className="text-green-500 shrink-0"/>, text: '技術評価のレーダーチャートに対する客観的な補正コメント' },
            { icon: <CheckCircle2 size={14} className="text-green-500 shrink-0"/>, text: '練習メニューの提案と次の目標設定サポート' },
            { icon: <CheckCircle2 size={14} className="text-green-500 shrink-0"/>, text: 'フォームや打ち方の改善ポイントを文章で具体的に指導' },
            { icon: <Video size={14} className="text-indigo-500 shrink-0"/>, text: '動画を共有して、フォーム・打ち方をプロコーチが直接アドバイス（上位プラン）' },
            { icon: <Link size={14} className="text-indigo-500 shrink-0"/>, text: 'YouTubeやInstagramの動画URLを添付してプロコーチに確認してもらえる' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {item.icon}
              <span className="text-xs text-slate-700 leading-snug">{item.text}</span>
            </div>
          ))}
        </div>


        {/* Plans */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">プラン ─ プロコーチ専任</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'light' as const, name: 'ライト', price: '¥1,480', desc: '月3回のアドバイス', sub: 'テキストのみ', video: '' },
              { key: 'standard' as const, name: 'スタンダード', price: '¥2,980', desc: '月8回のアドバイス', sub: '', video: '+動画 月1件', popular: true },
              { key: 'premium' as const, name: 'プレミアム', price: '¥4,980', desc: '無制限アドバイス', sub: '', video: '+動画 月3件 🎬' },
            ]).map(p => {
              const isActive = advicePlan === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setAdvicePlan(isActive ? 'none' : p.key)}
                  className={`p-3 rounded-xl text-center space-y-1 relative transition-all ${
                    isActive
                      ? 'border-2 border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : p.popular
                        ? 'border-2 border-yellow-400 bg-white hover:bg-yellow-50'
                        : 'border border-yellow-200 bg-white hover:bg-yellow-50'
                  }`}
                >
                  {p.popular && !isActive && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold text-white bg-yellow-500 px-2 py-0.5 rounded-full whitespace-nowrap">おすすめ</span>
                  )}
                  {isActive && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5">
                      <CheckCircle2 size={8} /> 加入中
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 block">{p.name}</span>
                  <p className="text-base font-black text-slate-900">{p.price}<span className="text-[9px] font-bold text-slate-400">/月</span></p>
                  <span className="text-[9px] text-slate-400 block">{p.desc}</span>
                  {p.video ? (
                    <p className="text-[8px] text-yellow-600 font-bold mt-1">{p.video}</p>
                  ) : p.sub ? (
                    <p className="text-[8px] text-slate-400 mt-1">{p.sub}</p>
                  ) : null}
                </button>
              );
            })}
          </div>

        </div>
        <div className="space-y-2">
          {advicePlan !== 'none' ? (
            <div className="w-full py-3 bg-green-100 text-green-700 border border-green-200 rounded-xl font-bold text-sm text-center">
              ✅ {planLimits[advicePlan].label}プラン加入中（残り{remainingSends}回/月）
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 text-center">上のプランをタップして選択してください</p>
          )}
          {advicePlan !== 'none' && (
            <button
              onClick={() => setAdvicePlan('none')}
              className="w-full text-xs text-slate-400 hover:text-red-500 underline py-1"
            >
              プランを解約する
            </button>
          )}
        </div>
      </div>
      </>)}

      {/* Community Tab - みんなのノート */}
      {noteTab === 'community' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-3xl text-center">
            <Globe size={28} className="mx-auto text-blue-500 mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">みんなのノート</h3>
            <p className="text-xs text-slate-500 mt-1">全国のプレイヤーが公開した練習ノートを見て、一緒に強くなろう！</p>
          </div>

          {notes.filter(n => n.published).length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Users size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">まだ公開ノートがありません</p>
              <p className="text-xs mt-1">ノートを書いて「オンラインに公開する」を押してみよう</p>
            </div>
          ) : (
            notes.filter(n => n.published).map(n => {
              const avatars = ['🎾', '🏸', '💪', '⭐', '🔥', '🌟', '🎯', '🏆'];
              const names = ['テニス太郎', 'ラケット少年', 'ボレー職人', 'サーブマスター', 'ストローカー', 'ネットプレイヤー', '粘りの後衛', '攻めの前衛'];
              const hash = n.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              const avatar = avatars[hash % avatars.length];
              const name = names[hash % names.length];

              return (
                <div key={n.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedNote(expandedNote === n.id ? null : n.id)} className="w-full p-4 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{avatar}</span>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-700">{name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{n.date}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedNote === n.id ? 'rotate-180' : ''}`} />
                    </div>
                    <p className={`text-sm text-slate-600 ${expandedNote === n.id ? '' : 'line-clamp-2'}`}>
                      {n.keep || n.problem || n.tryItem}
                    </p>
                  </button>
                  {expandedNote === n.id && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
                      {n.keep && (
                        <div className="bg-green-50 p-3 rounded-xl border-l-3 border-green-400">
                          <p className="text-[10px] font-bold text-green-600 mb-0.5">✅ Good</p>
                          <p className="text-xs text-slate-700">{n.keep}</p>
                        </div>
                      )}
                      {n.problem && (
                        <div className="bg-red-50 p-3 rounded-xl border-l-3 border-red-400">
                          <p className="text-[10px] font-bold text-red-600 mb-0.5">⚠️ Problem</p>
                          <p className="text-xs text-slate-700">{n.problem}</p>
                        </div>
                      )}
                      {n.tryItem && (
                        <div className="bg-blue-50 p-3 rounded-xl border-l-3 border-blue-400">
                          <p className="text-[10px] font-bold text-blue-600 mb-0.5">🚀 Try</p>
                          <p className="text-xs text-slate-700">{n.tryItem}</p>
                        </div>
                      )}
                      <div className="pt-2">
                        <RadarChart skills={n.skills} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Goals Tab */}
      {noteTab === 'goals' && (<>

      {/* Goal Management */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Target size={16} className="text-brand-blue" /> 目標管理
          </h3>
          <button onClick={() => setShowGoalForm(!showGoalForm)}
            className="text-xs font-bold text-brand-blue flex items-center gap-1">
            <Plus size={14}/> 追加
          </button>
        </div>

        {showGoalForm && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2 animate-in fade-in">
            <input type="text" value={newGoalText} onChange={e => setNewGoalText(e.target.value)}
              placeholder="目標を入力..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" />
            <div className="flex gap-2">
              {(['short', 'mid'] as const).map(t => (
                <button key={t} onClick={() => setNewGoalType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${newGoalType === t ? 'bg-brand-blue text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                  {t === 'short' ? '短期目標' : '中期目標'}
                </button>
              ))}
            </div>
            <button onClick={handleAddGoal} disabled={!newGoalText.trim()}
              className="w-full py-2 bg-brand-blue text-white rounded-lg text-xs font-bold disabled:opacity-50">追加</button>
          </div>
        )}

        {activeGoals.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">未達成</p>
            {activeGoals.map(g => <GoalItem key={g.id} g={g} />)}
          </div>
        )}
        {completedGoals.length > 0 && (
          <div className="space-y-1 mt-3">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest px-1 mb-1">✅ 達成済み</p>
            {completedGoals.map(g => <GoalItem key={g.id} g={g} />)}
          </div>
        )}
        {goals.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">まだ目標が設定されていません</p>
        )}
      </div>

      {/* Weekly Practice Summary */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" /> 今週の練習サマリー
        </h3>
        {(() => {
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekStartStr = fmtDate(weekStart);
          const weekNotes = notes.filter(n => n.date >= weekStartStr);
          const weekDays = weekNotes.length;
          const allKeeps = weekNotes.map(n => n.keep).filter(Boolean);
          const allProblems = weekNotes.map(n => n.problem).filter(Boolean);
          const allTries = weekNotes.map(n => n.tryItem).filter(Boolean);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{weekDays}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">練習日数</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-600">{allKeeps.length}</p>
                  <p className="text-[10px] text-green-500 font-bold">Good Points</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">{allProblems.length}</p>
                  <p className="text-[10px] text-amber-500 font-bold">課題</p>
                </div>
              </div>
              {allTries.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-600">🚀 今週のTry項目</p>
                  {allTries.map((t, i) => (
                    <p key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span> {t}
                    </p>
                  ))}
                </div>
              )}
              {weekDays === 0 && (
                <p className="text-xs text-slate-400 text-center">今週のノートがまだありません</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Skill Growth Tracker */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <Star size={16} className="text-amber-500" /> 技術成長トラッカー
        </h3>
        <RadarChart skills={latestSkills} />
        <div className="mt-4 space-y-2">
          {skillLabels.map((label, i) => {
            const val = latestSkills[i];
            const prevVal = notes.length > 1 ? notes[1].skills[i] : val;
            const diff = val - prevVal;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-24 shrink-0 font-bold">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${(val / 10) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-500 w-10 shrink-0 text-right">{val}/10</span>
                <span className={`text-[10px] font-bold w-6 shrink-0 text-right ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-transparent'}`}>
                  {diff > 0 ? `↑${diff}` : diff < 0 ? `↓${Math.abs(diff)}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3">前回のノートとのスキル比較</p>
      </div>

      </>)}

      <div className="h-6" />
    </div>
  );
};
