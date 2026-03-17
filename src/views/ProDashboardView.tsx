import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, 
  ChevronRight, ArrowLeft, Send, Video, Clock, 
  TrendingUp, MessageCircle, Crown, UserPlus, XCircle,
  Flag, AlertTriangle, Trash2, Ban, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';

// --- Types ---
interface SubmittedNote {
  id: string;
  studentName: string;
  studentGrade: string;
  teamName: string;
  submittedAt: string;
  status: 'pending' | 'reviewed';
  content: {
    keep: string;
    problem: string;
    try: string;
    skills: number[]; // [fore, back, volley, serve, foot, tactics]
    videoUrl?: string;
    coachQuestion?: string;
  };
  coachAdvice?: string;
}

// Data will be fetched from Supabase tennis_notes (published=true)

// --- Radar Chart ---
const SmallRadarChart: React.FC<{ skills: number[] }> = ({ skills }) => {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 40;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[120px] mx-auto opacity-80">
      <polygon
        points={skills.map((_, i) => `${getPoint(i, 5).x},${getPoint(i, 5).y}`).join(' ')}
        fill="none" stroke="#e2e8f0" strokeWidth={1}
      />
      <polygon
        points={skills.map((_, i) => `${getPoint(i, 3).x},${getPoint(i, 3).y}`).join(' ')}
        fill="none" stroke="#e2e8f0" strokeWidth={1}
      />
      <polygon
        points={skills.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1.5}
      />
    </svg>
  );
};

// --- Main Component ---
export const ProDashboardView: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  // States
  const [inbox, setInbox] = React.useState<SubmittedNote[]>([]);
  const [reviewedIds, setReviewedIds] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('pro_dashboard_reviewed') || '[]'); } catch { return []; }
  });
  
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'applications' | 'reports' | 'questions'>('pending');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [adviceText, setAdviceText] = useState('');
  
  const [applications, setApplications] = useState<any[]>([]);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'waiting' | 'answered' | 'resolved'>('all');
  const isAdmin = user?.systemRole === 'admin';

  // Fetch Public Notes
  React.useEffect(() => {
    if (!isSupabaseConfigured() || !user || authLoading) return;
    
    const fetchPublicNotes = async () => {
      const { data, error } = await supabase
        .from('tennis_notes')
        .select(`
          id, date, keep, problem, try_item, coach_question, skills, created_at,
          profiles ( nickname )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        const mapped: SubmittedNote[] = data.map((n: any) => ({
          id: n.id,
          studentName: n.profiles?.nickname || '匿名プレイヤー',
          studentGrade: '一般',
          teamName: 'チーム未登録',
          submittedAt: n.created_at,
          status: reviewedIds.includes(n.id) ? 'reviewed' : 'pending',
          content: {
            keep: n.keep || 'なし',
            problem: n.problem || 'なし',
            try: n.try_item || 'なし',
            skills: n.skills || [3,3,3,3,3,3],
            coachQuestion: n.coach_question
          }
        }));
        setInbox(mapped);
      }
    };

    fetchPublicNotes();
  }, [user, reviewedIds]);

  // Fetch Coach Applications (admin only, separate effect to react to isAdmin changes)
  React.useEffect(() => {
    if (!isSupabaseConfigured() || !isAdmin) return;
    const fetchApps = async () => {
      const { data, error } = await supabase.from('coach_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (data && !error) setApplications(data);
    };
    fetchApps();
  }, [isAdmin]);

  // Fetch Reports (admin only)
  React.useEffect(() => {
    if (!isSupabaseConfigured() || !isAdmin || authLoading) return;
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('coach_questions')
        .select(`
          *,
          reporter:reported_by(nickname),
          answerer:answered_by(nickname)
        `)
        .eq('reported', true)
        .order('reported_at', { ascending: false });
      if (data && !error) setReports(data);
    };
    fetchReports();
  }, [isAdmin, authLoading]);

  // Fetch All Questions (admin only)
  React.useEffect(() => {
    if (!isSupabaseConfigured() || !isAdmin || authLoading) return;
    const fetchAllQuestions = async () => {
      const { data, error } = await supabase
        .from('coach_questions')
        .select(`
          *,
          questioner:user_id(nickname, avatar_emoji),
          answerer:answered_by(nickname)
        `)
        .order('created_at', { ascending: false });
      if (data && !error) setAllQuestions(data);
    };
    fetchAllQuestions();
  }, [isAdmin, authLoading]);

  // Derived
  const filteredNotes = inbox.filter(n => n.status === activeTab);
  const selectedNote = inbox.find(n => n.id === selectedNoteId);

  // Handlers
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    const note = inbox.find(n => n.id === id);
    if (note && note.coachAdvice) setAdviceText(note.coachAdvice);
    else setAdviceText('');
  };

  const handleSubmitAdvice = () => {
    if (!selectedNoteId || !adviceText.trim()) return;

    setInbox(prev => prev.map(note => 
      note.id === selectedNoteId 
        ? { ...note, status: 'reviewed', coachAdvice: adviceText }
        : note
    ));
    
    const nextReviewedIds = [...reviewedIds, selectedNoteId];
    setReviewedIds(nextReviewedIds);
    localStorage.setItem('pro_dashboard_reviewed', JSON.stringify(nextReviewedIds));
    
    alert('アドバイスを送信しました！(ダミー)');
    
    setTimeout(() => {
      setSelectedNoteId(null);
      setAdviceText('');
      setActiveTab('pending');
    }, 500);
  };

  const handleApproveApp = async (id: string, userId: string) => {
    await supabase.from('coach_applications').update({ status: 'approved' }).eq('id', id);
    await supabase.from('profiles').update({ system_role: 'coach', coach_rank: 'bronze' }).eq('id', userId);
    setApplications(prev => prev.filter(a => a.id !== id));
    alert('コーチとして承認しました！対象ユーザーはコーチ機能が利用可能になります。');
  };

  const handleRejectApp = async (id: string) => {
    if (!window.confirm('この応募を本当に却下しますか？')) return;
    await supabase.from('coach_applications').update({ status: 'rejected' }).eq('id', id);
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  // Report action handlers
  const handleDismissReport = async (id: string) => {
    if (!window.confirm('この報告を却下しますか？')) return;
    const { error } = await supabase.from('coach_questions').update({ reported: false, report_reason: null, reported_at: null, reported_by: null }).eq('id', id);
    if (!error) setReports(prev => prev.filter(r => r.id !== id));
    else alert('エラー: ' + error.message);
  };

  const handleDeleteAnswer = async (id: string) => {
    if (!window.confirm('この回答を削除し、質問を再振分しますか？')) return;
    const { error } = await supabase.from('coach_questions').update({ answer: null, answered_by: null, answered_at: null, status: 'waiting', reported: false, report_reason: null, reported_at: null, reported_by: null }).eq('id', id);
    if (!error) {
      setReports(prev => prev.filter(r => r.id !== id));
      alert('回答を削除し、質問を再振分しました。');
    } else alert('エラー: ' + error.message);
  };

  const handleWarnUser = async (userId: string) => {
    if (!window.confirm('このユーザーに警告を与えますか？')) return;
    const { error } = await supabase.rpc('admin_warn_user', { p_user_id: userId });
    if (!error) alert('ユーザーに警告を与えました。');
    else alert('エラー: ' + error.message);
  };

  const handleBanUser = async (userId: string) => {
    if (!window.confirm('⚠️ このユーザーをBANしますか？この操作は重大です。')) return;
    const { error } = await supabase.rpc('admin_ban_user', { p_user_id: userId });
    if (!error) alert('ユーザーをBANしました。');
    else alert('エラー: ' + error.message);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('この相談を削除しますか？')) return;
    // まずRPCを試行
    const { error: rpcError } = await supabase.rpc('admin_delete_question', { p_question_id: id });
    if (!rpcError) {
      setAllQuestions(prev => prev.filter(q => q.id !== id));
      setReports(prev => prev.filter(r => r.id !== id));
      alert('相談を削除しました。');
      return;
    }
    console.error('RPC削除エラー:', rpcError);
    // RPCが未作成の場合はUPDATEでソフトデリート
    const { error } = await supabase.from('coach_questions').update({ status: 'deleted', question: '[削除済み]', answer: null }).eq('id', id);
    if (!error) {
      setAllQuestions(prev => prev.filter(q => q.id !== id));
      setReports(prev => prev.filter(r => r.id !== id));
      alert('相談を削除しました。');
    } else {
      console.error('UPDATE削除エラー:', error);
      alert(`削除に失敗しました\nRPC: ${rpcError.message}\nUPDATE: ${error.message}`);
    }
  };

  const filteredQuestions = allQuestions.filter(q => q.status !== 'deleted' && (questionFilter === 'all' || q.status === questionFilter));

  // --- Render Detail View ---
  if (selectedNote) {
    return (
      <div className="flex flex-col gap-4 py-2 animate-in slide-in-from-right-4 duration-300">
        {/* Header Navigation */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <button onClick={() => setSelectedNoteId(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="font-bold text-slate-800">{selectedNote.studentName} <span className="text-xs font-normal text-slate-500">({selectedNote.studentGrade})</span></h2>
            <p className="text-[10px] text-slate-500">{selectedNote.teamName}</p>
          </div>
          <div className="ml-auto">
            {selectedNote.status === 'reviewed' ? 
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={12}/> 対応済</span> :
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full">未対応</span>
            }
          </div>
        </div>

        {/* Note Content */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-blue" />
              テニスノートの振り返り
            </h3>
            <span className="text-xs text-slate-400">{new Date(selectedNote.submittedAt).toLocaleDateString('ja-JP')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-2xl">
                <p className="text-xs font-bold text-green-700 mb-1">✅ 良かったこと</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedNote.content.keep}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-2xl">
                <p className="text-xs font-bold text-red-600 mb-1">⚠️ 課題・改善点</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedNote.content.problem}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl">
                <p className="text-xs font-bold text-blue-700 mb-1">🚀 次やること</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedNote.content.try}</p>
              </div>
              
              {selectedNote.content.coachQuestion && (
                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1.5"><MessageCircle size={14}/> コーチへの質問</p>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{selectedNote.content.coachQuestion}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {/* Radar Chart Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center h-48">
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Skill Self-Assessment</p>
                <SmallRadarChart skills={selectedNote.content.skills} />
              </div>

              {/* Video Attachment Placeholder */}
              {selectedNote.content.coachQuestion?.includes('動画') && (
                <div className="bg-slate-900 rounded-2xl aspect-video flex flex-col items-center justify-center text-slate-500 shadow-inner">
                  <Video size={32} className="mb-2 opacity-50"/>
                  <span className="text-xs font-bold">添付された動画 (0:45)</span>
                  <button className="mt-3 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full text-xs text-white transition-colors">再生する</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coach Advice Input Editor */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue opacity-20 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="font-bold text-white mb-3 flex items-center gap-2 relative z-10">
            <ShieldCheck size={18} className="text-yellow-400" />
            個別アドバイスを作成
          </h3>

          <div className="relative z-10 space-y-4">
            <textarea 
              value={adviceText}
              onChange={e => setAdviceText(e.target.value)}
              disabled={selectedNote.status === 'reviewed'}
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:bg-white/10 transition-colors resize-none disabled:opacity-50"
              placeholder="改善点や次のアクションについて、具体的なアドバイスを入力してください..."
            />
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button className="p-2.5 bg-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/20 transition-colors" title="動画を添付して解説">
                  <Video size={16} />
                </button>
              </div>
              
              {selectedNote.status !== 'reviewed' && (
                <button 
                  onClick={handleSubmitAdvice}
                  disabled={!adviceText.trim()}
                  className="bg-brand-blue hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Send size={16} /> 返答を送信する
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Inbox List ---
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header Stat */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex flex-col items-center justify-center text-white shadow-md">
          <Crown size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">プロダッシュボード</h2>
          <p className="text-sm text-slate-500">担当生徒のノートを確認し、個別アドバイスを送りましょう。</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">未対応</p>
          <p className="text-3xl font-black text-brand-blue">{inbox.filter(n => n.status === 'pending').length}<span className="text-sm text-slate-400 ml-1">件</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
            activeTab === 'pending' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          未対応 <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(n => n.status === 'pending').length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('reviewed')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
            activeTab === 'reviewed' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          対応済 <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(n => n.status === 'reviewed').length}</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('applications')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'applications' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <UserPlus size={16} />
            審査 <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{applications.length}</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'reports' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
            }`}
          >
            <Flag size={16} />
            報告 {reports.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{reports.length}</span>}
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'questions' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={16} />
            相談 <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{allQuestions.length}</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {activeTab === 'questions' ? (
          <>
            {/* Status Filter */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {([['all', '全て'], ['waiting', '回答待ち'], ['answered', '回答済'], ['resolved', '解決済']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setQuestionFilter(value)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    questionFilter === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredQuestions.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={40} className="text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">該当する相談はありません</p>
              </div>
            ) : (
              filteredQuestions.map(q => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  waiting: { label: '回答待ち', cls: 'bg-amber-100 text-amber-700' },
                  answered: { label: '回答済', cls: 'bg-blue-100 text-blue-700' },
                  resolved: { label: '解決済', cls: 'bg-green-100 text-green-700' },
                  reask: { label: '再質問', cls: 'bg-purple-100 text-purple-700' },
                };
                const st = statusMap[q.status] || { label: q.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{q.questioner?.avatar_emoji || '🏐'}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{q.questioner?.nickname || '匿名'}</p>
                          <p className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        {q.reported && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">⚠報告あり</span>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{q.question}</p>
                    {q.answer && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                        <p className="text-[10px] text-blue-500 font-bold mb-1">💬 回答（{q.answerer?.nickname || '不明'}）</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3">{q.answer}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteQuestion(q.id); }}
                      className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer relative z-10"
                    >
                      <Trash2 size={14} /> この相談を削除
                    </button>
                  </div>
                );
              })
            )}
          </>
        ) : activeTab === 'applications' ? (
          applications.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={40} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-600">新しい応募はありません</p>
            </div>
          ) : (
            applications.map(app => {
              const isExpanded = expandedAppId === app.id;
              return (
                <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Header - tappable */}
                  <button
                    onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {app.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          {app.full_name}
                          <span className="text-xs font-normal text-slate-400">({app.nickname})</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10}/>{new Date(app.created_at).toLocaleDateString('ja-JP')} 応募
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">ニックネーム</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.nickname}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">指導経験</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.years_experience || '未記入'}</p>
                        </div>
                        <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">資格・実績</p>
                          <p className="text-sm text-slate-700 mt-0.5">{app.certification || '未記入'}</p>
                        </div>
                        {app.self_intro && (
                          <div className="col-span-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                            <p className="text-[10px] text-indigo-500 font-medium">自己PR</p>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">{app.self_intro}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveApp(app.id, app.user_id)} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]">
                          <CheckCircle2 size={16} /> 承認する
                        </button>
                        <button onClick={() => handleRejectApp(app.id)} className="flex-1 py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-colors">
                          <XCircle size={16} /> 却下
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : activeTab === 'reports' ? (
          reports.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={40} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-600">未対応の報告はありません</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 space-y-4">
                {/* Report Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                      <Flag size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        報告者: <span className="font-bold text-slate-700">{report.reporter?.nickname || '不明'}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {report.reported_at ? new Date(report.reported_at).toLocaleString('ja-JP') : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Reason */}
                <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                  <p className="text-[10px] text-red-500 font-bold mb-1">📋 報告理由</p>
                  <p className="text-sm text-slate-700">{report.report_reason}</p>
                </div>

                {/* Question & Answer */}
                <div className="space-y-2">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">❓ 質問</p>
                    <p className="text-sm text-slate-700">{report.question}</p>
                  </div>
                  {report.answer && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                      <p className="text-[10px] text-blue-500 font-bold mb-1">
                        💬 回答（{report.answerer?.nickname || '不明'}）
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.answer}</p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleDismissReport(report.id)}
                    className="py-2 px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle size={14} /> 報告を却下
                  </button>
                  <button
                    onClick={() => handleDeleteAnswer(report.id)}
                    className="py-2 px-3 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> 回答を削除
                  </button>
                  {report.answered_by && (
                    <>
                      <button
                        onClick={() => handleWarnUser(report.answered_by)}
                        className="py-2 px-3 bg-orange-100 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertTriangle size={14} /> コーチに警告
                      </button>
                      <button
                        onClick={() => handleBanUser(report.answered_by)}
                        className="py-2 px-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Ban size={14} /> コーチをBAN
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          filteredNotes.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={40} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-600">すべてのノートに対応しました</p>
              <p className="text-xs text-slate-400 mt-1">現在、新しい提出はありません。</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <button 
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className="w-full text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-blue hover:shadow-md transition-all group flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center font-bold text-sm">
                      {note.studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{note.studentName} <span className="text-[10px] font-normal text-slate-400">({note.studentGrade})</span></h4>
                      <p className="text-[10px] text-slate-500">{note.teamName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10}/>{new Date(note.submittedAt).toLocaleDateString()}</span>
                    {note.content.videoUrl || note.content.coachQuestion?.includes('動画') ? <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-bold">要動画チェック</span> : null}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue" />
                  <p className="text-xs text-slate-700 line-clamp-2">
                    <span className="font-bold text-red-500 mr-1">課題:</span>
                    {note.content.problem}
                  </p>
                </div>

                <div className="flex items-center justify-end text-[10px] font-bold text-brand-blue opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  詳細を確認する <ChevronRight size={14}/>
                </div>
              </button>
            ))
          )
        )}
      </div>
    </div>
  );
};
