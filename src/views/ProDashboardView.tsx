import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, 
  ChevronRight, ArrowLeft, Send, Video, Clock, 
  TrendingUp, MessageCircle, Crown, UserPlus, XCircle,
  Flag, AlertTriangle, Trash2, Ban, MessageSquare,
  Image as ImageIcon, Link, Loader2, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { useNoteComments, type ReportedUser } from '../hooks/useNoteComments';
import { uploadFile, generateFilePath } from '../lib/storage';
import { compressImage } from '../lib/imageCompress';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';

// publicUrlからStorageパスを抽出するヘルパー
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  // URL形式: https://xxx.supabase.co/storage/v1/object/public/coach-docs/userId/folder/file
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return decodeURIComponent(publicUrl.substring(idx + marker.length));
  // フォールバック: バケット名以降のパスを取得
  const parts = publicUrl.split(`/${bucket}/`);
  if (parts.length > 1) return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  return null;
}

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
    media?: { type: string; name: string; url?: string }[];
  };
  coachAdvice?: string;
  userId?: string;
}

// Data will be fetched from Supabase tennis_notes (published=true)

// --- Radar Chart ---
const SKILL_LABELS = ['フォア', 'バック', 'ボレー', 'サーブ', 'フットワーク', '戦術'];

const SmallRadarChart: React.FC<{ skills: number[] }> = ({ skills }) => {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / 10) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const getLabelPos = (index: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = maxR + 18;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px] mx-auto">
      {/* Grid lines: 2, 4, 6, 8, 10 */}
      {[2, 4, 6, 8, 10].map(level => (
        <polygon
          key={level}
          points={skills.map((_, i) => `${getPoint(i, level).x},${getPoint(i, level).y}`).join(' ')}
          fill="none" stroke={level === 10 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={level === 10 ? 1.5 : 0.5}
        />
      ))}
      {/* Axes */}
      {skills.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={getPoint(i, 10).x} y2={getPoint(i, 10).y} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
      {/* Data polygon */}
      <polygon
        points={skills.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={2}
      />
      {/* Data points */}
      {skills.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3b82f6" />;
      })}
      {/* Labels */}
      {SKILL_LABELS.map((label, i) => {
        const pos = getLabelPos(i);
        return (
          <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="bold" fill="#475569">
            {label}({skills[i] || 0})
          </text>
        );
      })}
    </svg>
  );
};

// --- Main Component ---
export const ProDashboardView: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  const isAdmin = user?.systemRole === 'admin';

  // States
  const [inbox, setInbox] = React.useState<SubmittedNote[]>([]);
  const [reviewedIds, setReviewedIds] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('pro_dashboard_reviewed') || '[]'); } catch { return []; }
  });
  
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'applications' | 'reports' | 'questions' | 'featured'>(isAdmin ? 'pending' : 'questions');
  const { loadReportedUsers } = useNoteComments();
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [adviceText, setAdviceText] = useState('');
  const [adviceMedia, setAdviceMedia] = useState<{ type: 'image' | 'video' | 'url'; name: string; url?: string }[]>([]);
  const [adviceMediaUploading, setAdviceMediaUploading] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  
  const [applications, setApplications] = useState<any[]>([]);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'waiting' | 'answered' | 'resolved'>('all');
  const { menus: allMenus, toggleFeatured } = useSupabaseMenus();

  // 管理者以外はアクセス不可（hooksの後に配置）
  if (!authLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-center">⛔ このページは管理者のみアクセスできます</p>
      </div>
    );
  }

  // Fetch Public Notes
  React.useEffect(() => {
    if (!isSupabaseConfigured() || !user || authLoading) return;
    
    const fetchPublicNotes = async () => {
      const { data, error } = await supabase
        .from('tennis_notes')
        .select(`
          id, date, keep, problem, try_item, coach_question, skills, created_at, user_id, coach_reviewed, media,
          profiles ( nickname )
        `)
        .eq('sent_to_coach', true)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        const mapped: SubmittedNote[] = data.map((n: any) => ({
          id: n.id,
          studentName: n.profiles?.nickname || '匿名プレイヤー',
          studentGrade: '一般',
          teamName: 'チーム未登録',
          submittedAt: n.created_at,
          status: (n.coach_reviewed || reviewedIds.includes(n.id)) ? 'reviewed' : 'pending',
          userId: n.user_id,
          content: {
            keep: n.keep || 'なし',
            problem: n.problem || 'なし',
            try: n.try_item || 'なし',
            skills: n.skills || [3,3,3,3,3,3],
            coachQuestion: n.coach_question,
            media: n.media || []
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
      if (data && !error) {
        // coach-docsは非公開バケットのためSigned URLに変換
        const appsWithSignedUrls = await Promise.all(
          data.map(async (app: any) => {
            const updated = { ...app };
            if (app.id_document_url) {
              const path = extractStoragePath(app.id_document_url, 'coach-docs');
              if (path) {
                const { data: signed } = await supabase.storage.from('coach-docs').createSignedUrl(path, 3600);
                if (signed) updated.id_document_url = signed.signedUrl;
              }
            }
            if (app.resume_url) {
              const path = extractStoragePath(app.resume_url, 'coach-docs');
              if (path) {
                const { data: signed } = await supabase.storage.from('coach-docs').createSignedUrl(path, 3600);
                if (signed) updated.resume_url = signed.signedUrl;
              }
            }
            return updated;
          })
        );
        setApplications(appsWithSignedUrls);
      }
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
    setAdviceMedia([]);
    setVideoUrlInput('');
  };

  const handleAdviceMediaUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
      return;
    }
    setAdviceMediaUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = generateFilePath(user.id, 'coach-advice', compressed.name);
      const { url, error } = await uploadFile('note-media', path, compressed);
      if (!error && url) {
        setAdviceMedia(prev => [...prev, { type: 'image', name: file.name, url }]);
      }
    } catch { /* ignore */ }
    setAdviceMediaUploading(false);
  };

  const handleSubmitAdvice = async () => {
    if (!selectedNoteId || !adviceText.trim() || !user) return;
    const note = inbox.find(n => n.id === selectedNoteId);
    if (!note) return;

    // DBにアドバイスを保存
    const studentUserId = (note as any).userId;
    await supabase.from('coach_advices').insert({
      note_id: selectedNoteId,
      coach_id: user.id,
      student_id: studentUserId,
      content: adviceText.trim(),
      media: adviceMedia.length > 0 ? adviceMedia : [],
    });

    // ノートをreviewedに
    await supabase.from('tennis_notes').update({ coach_reviewed: true }).eq('id', selectedNoteId);

    // 生徒に通知を送信
    if (studentUserId) {
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        type: 'coach',
        title: '🎓 コーチからアドバイスが届きました',
        message: `${user.nickname}コーチがあなたのノートにアドバイスを送信しました。テニスノートの「アドバイス」タブを確認してください。`,
      });
    }

    setInbox(prev => prev.map(n =>
      n.id === selectedNoteId
        ? { ...n, status: 'reviewed', coachAdvice: adviceText }
        : n
    ));

    const nextReviewedIds = [...reviewedIds, selectedNoteId];
    setReviewedIds(nextReviewedIds);
    localStorage.setItem('pro_dashboard_reviewed', JSON.stringify(nextReviewedIds));

    alert('アドバイスを送信しました！');

    setTimeout(() => {
      setSelectedNoteId(null);
      setAdviceText('');
      setAdviceMedia([]);
      setVideoUrlInput('');
      setActiveTab('pending');
    }, 500);
  };

  const handleApproveApp = async (id: string, userId: string) => {
    await supabase.from('coach_applications').update({ status: 'approved' }).eq('id', id);
    const { error } = await supabase.from('profiles').update({ system_role: 'coach', coach_rank: 'bronze' }).eq('id', userId);
    if (error) {
      console.error('コーチ権限付与失敗:', error);
      alert('承認処理でエラーが発生しました: ' + error.message + '\n\nSupabaseで 020_admin_update_profiles.sql を実行してください。');
      return;
    }
    // 採用通知を送信
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: '🎉 コーチ採用おめでとうございます！',
      message: 'あなたのコーチ応募が承認されました。コーチ機能が利用可能になりました。',
    });
    setApplications(prev => prev.filter(a => a.id !== id));
    alert('コーチとして承認しました！対象ユーザーに通知が送信されました。');
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
    if (!window.confirm('この相談を完全に削除しますか？元に戻せません。')) return;
    const { error } = await supabase.rpc('admin_delete_question', { p_question_id: id });
    if (!error) {
      setAllQuestions(prev => prev.filter(q => q.id !== id));
      setReports(prev => prev.filter(r => r.id !== id));
      alert('相談を削除しました。');
    } else {
      console.error('削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const handleHideQuestion = async (id: string, currentlyHidden: boolean) => {
    const newReason = currentlyHidden ? null : 'admin_hidden';
    const { error } = await supabase.from('coach_questions').update({ report_reason: newReason }).eq('id', id);
    if (!error) {
      setAllQuestions(prev => prev.map(q => q.id === id ? { ...q, report_reason: newReason } : q));
      alert(currentlyHidden ? '表示を復元しました。' : '相談を非表示にしました。');
    } else {
      console.error('非表示エラー:', error);
      alert('操作に失敗しました: ' + error.message);
    }
  };

  const filteredQuestions = allQuestions.filter(q => q.question !== '[管理者により削除]' && (questionFilter === 'all' || q.status === questionFilter));

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
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">スキル自己評価（10段階）</p>
                <SmallRadarChart skills={selectedNote.content.skills} />
              </div>

              {/* Student's Media Attachments */}
              {selectedNote.content.media && selectedNote.content.media.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">📎 添付メディア</p>
                  {selectedNote.content.media.map((m, i) => (
                    <div key={i}>
                      {m.type === 'image' && m.url && (
                        <img src={m.url} alt={m.name} className="w-full rounded-xl max-h-60 object-cover" />
                      )}
                      {m.type === 'video' && m.url && (
                        <video src={m.url} controls className="w-full rounded-xl max-h-60" />
                      )}
                      {m.type === 'url' && (m.url || m.name) && (
                        <a href={m.url || m.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-brand-blue hover:underline bg-blue-50 p-3 rounded-xl">
                          <Link size={14} /> {m.name || m.url}
                        </a>
                      )}
                    </div>
                  ))}
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

            {/* Media Attachments Preview */}
            {adviceMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {adviceMedia.map((m, i) => (
                  <div key={i} className="bg-white/10 rounded-xl px-3 py-2 text-xs text-white flex items-center gap-2">
                    {m.type === 'image' ? <ImageIcon size={12} /> : m.type === 'video' ? <Video size={12} /> : <Link size={12} />}
                    <span className="max-w-[120px] truncate">{m.name}</span>
                    <button onClick={() => setAdviceMedia(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adviceMediaUploading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" /> アップロード中...
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <label className="p-2.5 bg-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer" title="画像を添付">
                  <ImageIcon size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAdviceMediaUpload(file);
                    e.target.value = '';
                  }} />
                </label>
                {/* Video URL */}
                <div className="flex items-center gap-1">
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={e => setVideoUrlInput(e.target.value)}
                    placeholder="動画URL..."
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 w-40 focus:outline-none focus:border-brand-blue"
                  />
                  <button
                    onClick={() => {
                      if (videoUrlInput.trim()) {
                        setAdviceMedia(prev => [...prev, { type: 'url', name: videoUrlInput.trim(), url: videoUrlInput.trim() }]);
                        setVideoUrlInput('');
                      }
                    }}
                    disabled={!videoUrlInput.trim()}
                    className="p-2.5 bg-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-30"
                  >
                    <Link size={16} />
                  </button>
                </div>
              </div>
              
              {selectedNote.status !== 'reviewed' && (
                <button 
                  onClick={handleSubmitAdvice}
                  disabled={!adviceText.trim() || adviceMediaUploading}
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
      <div className="flex gap-2 flex-wrap">
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'pending' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            未対応 <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(n => n.status === 'pending').length}</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('reviewed')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'reviewed' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            対応済 <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(n => n.status === 'reviewed').length}</span>
          </button>
        )}
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
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('featured')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'featured' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            ⭐ 一押し
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleHideQuestion(q.id, q.report_reason === 'admin_hidden'); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${q.report_reason === 'admin_hidden' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                      >
                        {q.report_reason === 'admin_hidden' ? '👁 表示を復元' : '🚫 非表示にする'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteQuestion(q.id); }}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer relative z-10"
                      >
                        <Trash2 size={14} /> 完全に削除
                      </button>
                    </div>
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
                          <p className="text-[10px] text-slate-400 font-medium">氏名（本名）</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.full_name}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">ニックネーム</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.nickname}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">ソフトテニス経験年数</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.years_experience || '未記入'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-medium">所有資格</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{app.certification || 'なし'}</p>
                        </div>
                        {app.tournament_results && (
                          <div className="col-span-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                            <p className="text-[10px] text-amber-600 font-medium">大会実績</p>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">{app.tournament_results}</p>
                          </div>
                        )}
                        {app.self_intro && (
                          <div className="col-span-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                            <p className="text-[10px] text-indigo-500 font-medium">自己PR</p>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">{app.self_intro}</p>
                          </div>
                        )}
                        {app.id_document_url && (() => {
                          const urlPath = app.id_document_url.split('?')[0].toLowerCase();
                          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(urlPath);
                          return (
                            <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                              <p className="text-[10px] text-slate-500 font-medium mb-2">📄 身分証明書</p>
                              {isImage ? (
                                <img src={app.id_document_url} alt="身分証" className="w-full max-h-48 object-contain rounded-lg border border-slate-200" />
                              ) : (
                                <a href={app.id_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-indigo-600 underline bg-white px-3 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-50">
                                  📎 ファイルを開く
                                </a>
                              )}
                            </div>
                          );
                        })()}
                        {app.resume_url && (() => {
                          const urlPath = app.resume_url.split('?')[0].toLowerCase();
                          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(urlPath);
                          return (
                            <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                              <p className="text-[10px] text-slate-500 font-medium mb-2">📄 経歴書・資格証明</p>
                              {isImage ? (
                                <img src={app.resume_url} alt="経歴書" className="w-full max-h-48 object-contain rounded-lg border border-slate-200" />
                              ) : (
                                <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-indigo-600 underline bg-white px-3 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-50">
                                  📎 ファイルを開く
                                </a>
                              )}
                            </div>
                          );
                        })()}
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
          <>
          {reports.length === 0 ? (
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
          )}

          {/* Comment Reports Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-500" /> コメント報告
              </h3>
              <button
                onClick={async () => {
                  const data = await loadReportedUsers();
                  setReportedUsers(data);
                }}
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                更新
              </button>
            </div>
            {reportedUsers.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                <p className="text-sm text-slate-400">報告されたコメントはありません</p>
                <button
                  onClick={async () => {
                    const data = await loadReportedUsers();
                    setReportedUsers(data);
                  }}
                  className="mt-2 text-xs font-bold text-brand-blue hover:underline"
                >
                  データを読み込む
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reportedUsers.map(ru => (
                  <div key={ru.userId} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
                          <AlertTriangle size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{ru.username}</p>
                          <p className="text-[10px] text-slate-400">最終報告: {new Date(ru.latestReport).toLocaleDateString('ja-JP')}</p>
                        </div>
                      </div>
                      <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                        {ru.reportCount}件の報告
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ru.comments.map(c => (
                        <div key={c.id} className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                          <p className="text-xs text-slate-700 mb-1">「{c.content}」</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-orange-500 font-bold">報告{c.reportCount}件</span>
                            {c.reasons.length > 0 && (
                              <span className="text-[9px] text-slate-400">理由: {c.reasons.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        ) : activeTab === 'featured' ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium">⭐ 一押しメニューを選択すると、ライブラリの上部に「一押し練習メニュー」として表示されます。</p>
            </div>
            {allMenus.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 text-center">
                <p className="font-bold text-slate-600">メニューがありません</p>
              </div>
            ) : (
              allMenus.map(menu => (
                <div key={menu.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  menu.isFeatured ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100'
                }`}>
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                    {menu.imageUrl ? (
                      <img src={menu.imageUrl} alt={menu.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold text-center leading-tight px-0.5">{menu.title.slice(0, 4)}</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{menu.title}</p>
                    <p className="text-[10px] text-slate-400">{menu.category} ・ {menu.level}</p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleFeatured(menu.id, !menu.isFeatured)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                      menu.isFeatured
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {menu.isFeatured ? '⭐ 一押し中' : '選択'}
                  </button>
                </div>
              ))
            )}
          </div>
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
