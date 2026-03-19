import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  ShieldCheck, Send, Star, MessageCircle, CheckCircle2, Trophy, 
  AlertTriangle, Clock, ChevronDown, ChevronUp,
  Award, Zap, Crown, Gem, Flag, ThumbsUp, X, Search, Video,
  Image as ImageIcon, Link, ArrowRightLeft, ShoppingCart, Banknote,
  Upload, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseCoach } from '../hooks/useSupabaseCoach';
import { supabase } from '../lib/supabase';
import { uploadFile, generateFilePath } from '../lib/storage';
import { compressImage } from '../lib/imageCompress';

// ── Types ──
interface Coach {
  name: string;
  rank: 'bronze' | 'silver' | 'gold' | 'platinum';
  specialty: string[];
  avatar: string;
  answerCount: number;
  rating: number;
}

// ── Helpers ──
const rankConfig = {
  bronze:   { label: 'ブロンズ', color: 'text-amber-700 bg-amber-100 border-amber-200', icon: Award, multiplier: 1.0, rankUpBonus: 0 },
  silver:   { label: 'シルバー', color: 'text-slate-500 bg-slate-100 border-slate-200', icon: Zap, multiplier: 1.2, rankUpBonus: 5000 },
  gold:     { label: 'ゴールド', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Crown, multiplier: 1.3, rankUpBonus: 15000 },
  platinum: { label: 'プラチナ', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: Gem, multiplier: 1.5, rankUpBonus: 50000 },
};

// ランクアップ条件: { 必要回答数, 必要平均評価 }
const rankUpConditions: Record<string, { answers: number; rating: number; next: Coach['rank'] | null }> = {
  bronze:   { answers: 30, rating: 4.0, next: 'silver' },
  silver:   { answers: 100, rating: 4.3, next: 'gold' },
  gold:     { answers: 250, rating: 4.6, next: 'platinum' },
  platinum: { answers: Infinity, rating: 5.0, next: null },
};

// ── Dummy Data ──
// ── Dummy Data ──

// removed initialConsultations

// ── Coin Purchase Packages ──
const coinPackages = [
  { coins: 5000, price: 500, label: '5,000コイン', popular: false },
  { coins: 10000, price: 1000, label: '10,000コイン', popular: true },
  { coins: 30000, price: 2800, label: '30,000コイン', popular: false, bonus: 'お得！' },
];

// ── Main Component ──

export const CoachSupportView: React.FC = () => {
  const { user, refreshProfile, addCoins } = useAuth();
  const { consultations, loading: consultationsLoading, askQuestion, answerQuestion, selectBestAnswer, updateQuestionStatus, applyCoachApplication, reportQuestion } = useSupabaseCoach();
  const [newQuestion, setNewQuestion] = useLocalStorage('coach_support_new_question', '');
  const [expandedId, setExpandedId] = useState<string | null>('c-1');
  const [activeTab, setActiveTab] = useLocalStorage<'list' | 'new' | 'coach'>('coach_support_active_tab', 'list');
  const [searchQuery, setSearchQuery] = useState('');
  const [questionMedia, setQuestionMedia] = useState<{ type: 'image' | 'url'; name: string; url?: string }[]>([]);
  const [questionUrlInput, setQuestionUrlInput] = useState('');
  const [questionMediaUploading, setQuestionMediaUploading] = useState(false);

  // Role State
  const isCoach = user?.systemRole === 'coach' || user?.systemRole === 'admin';

  // Coach Mode States — DBのuser profileから読み取り
  const coachCoins = user?.coins || 0;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [coachAnswerText, setCoachAnswerText] = useState('');
  const [showCoachAnswerInput, setShowCoachAnswerInput] = useState(false);
  const [coachAnswerMedia, setCoachAnswerMedia] = useState<{ type: 'image' | 'url'; name: string; url?: string }[]>([]);
  const [coachAnswerMediaUploading, setCoachAnswerMediaUploading] = useState(false);
  const [coachAnswerUrlInput, setCoachAnswerUrlInput] = useState('');
  const coachRank = (user?.coachRank || 'bronze') as Coach['rank'];
  const coachAnswerCount = user?.coachAnswerCount || 0;
  const coachAvgRating = user?.coachAvgRating || 0;
  const [rankUpNotification, _setRankUpNotification] = useState<string | null>(null);

  // Rank-based reward calculation (base: 600)
  const getReward = () => {
    return Math.floor(600 * rankConfig[coachRank].multiplier);
  };

  // Student Coin & Question Type States
  const studentCoins = user?.coins || 0;
  const [questionType, setQuestionType] = useState<'text' | 'video'>('text');
  const [questionCategory, setQuestionCategory] = useState('');
  const [showCoinPurchaseModal, setShowCoinPurchaseModal] = useState(false);
  const [showCoinExchangeModal, setShowCoinExchangeModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(1000);
  const [exchangeDirection, setExchangeDirection] = useState<'toCash' | 'toCoins'>('toCash');

  // Coach Application States
  const [showCoachApplication, setShowCoachApplication] = useState(false);
  const [coachAppStatus, setCoachAppStatus] = useLocalStorage<'none' | 'pending' | 'approved' | 'rejected'>('coach_app_status', 'none');

  // DBからコーチ応募ステータスを同期（localStorageとDBの差分を解消）
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('coach_applications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setCoachAppStatus(data.status as any);
      } else {
        setCoachAppStatus('none');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [coachAppForm, setCoachAppForm] = useState({
    fullName: '',
    nickname: '',
    yearsExperience: '',
    tournamentResults: '',
    certification: '' as string,
    selfIntro: '',
    idDocumentUrl: '',
    resumeUrl: '',
  });
  const [uploading, setUploading] = useState(false);

  const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileUpload = async (field: 'idDocumentUrl' | 'resumeUrl', file: File) => {
    if (!user) return;
    if (file.size > MAX_DOC_SIZE) {
      alert(`ファイルサイズが大きすぎます。${Math.round(MAX_DOC_SIZE / 1024 / 1024)}MB以下のファイルを選択してください。\n現在のサイズ: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }
    setUploading(true);
    const folder = field === 'idDocumentUrl' ? 'id-docs' : 'resumes';
    const path = generateFilePath(user.id, folder, file.name);
    const { url, error } = await uploadFile('coach-docs', path, file);
    if (error) {
      alert('アップロードに失敗しました: ' + error);
    } else if (url) {
      setCoachAppForm(prev => ({ ...prev, [field]: url }));
    }
    setUploading(false);
  };

  const questionCost = questionType === 'text' ? 1000 : 2000;

  // Submit new question
  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;
    if (studentCoins < questionCost) {
      setShowCoinPurchaseModal(true);
      return;
    }
    // 質問を先に送信し、コイン差引はバックグラウンドで実行
    askQuestion({
      question: newQuestion.trim(),
      questionType,
      category: questionCategory || undefined,
      media: questionMedia.length > 0 ? questionMedia : undefined,
    });
    setNewQuestion('');
    setQuestionMedia([]);
    setQuestionUrlInput('');
    setActiveTab('list');
    // コイン差引（非ブロッキング）
    addCoins(-questionCost);
  };

  // Resolve → コーチにコインを付与（DB処理はuseSupabaseCoachで実行）
  // ベストアンサー選択
  const handleSelectBestAnswer = async (answerId: string, questionId: string) => {
    if (!window.confirm('この回答をベストアンサーに選びますか？\n選ばれたコーチにコインが付与されます。')) return;
    await selectBestAnswer(answerId, questionId);
    await refreshProfile();
  };

  // Rate → 評価のみ保存
  const handleRate = async (id: string, rating: number) => {
    await updateQuestionStatus(id, 'rated', rating);
    await refreshProfile();
  };

  // Report → 報告理由を入力してDBに保存
  const handleReport = async (id: string) => {
    const reason = window.prompt(
      '→️ 報告理由を入力してください\n\n' +
      '• 不適切・不正確な回答に対してのみ使用してください\n' +
      '• 虚偽の報告を繰り返すとアカウントが制限される場合があります'
    );
    if (!reason || !reason.trim()) return;
    await reportQuestion(id, reason.trim());
    alert('報告を送信しました。管理者が確認し対応いたします。');
  };

  // コーチ回答タブ: waitingのみ表示（自分が既に回答済みの質問は除く）
  const waitingConsultations = consultations
    .filter(c => c.status === 'waiting' && !c.answers.some(a => a.coachId === user?.id));

  const goToNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setCoachAnswerText('');
    setShowCoachAnswerInput(false);
  };

  const handleSkipQuestion = async () => {
    if (coachCoins >= 50) {
      await addCoins(-50);
      goToNextQuestion();
    } else {
      alert('コインが不足しています。');
    }
  };

  const handleCoachAnswerSubmit = (consultationId: string) => {
    if (!coachAnswerText.trim()) return;
    if (coachAnswerText.trim().length < 100) {
      alert('回答は100文字以上で入力してください。');
      return;
    }
    answerQuestion(consultationId, coachAnswerText, coachAnswerMedia.length > 0 ? coachAnswerMedia : undefined);
    setCoachAnswerMedia([]);
    setCoachAnswerUrlInput('');
    goToNextQuestion();
  };

  // 24時間経過で自動解決（サーバーサイドに任せるためフロントエンド実装は削除）

  const statusConfig = {
    waiting: { label: '回答待ち', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    answered: { label: '回答あり', cls: 'bg-brand-blue text-white border-blue-600' },
    resolved: { label: '解決済み', cls: 'bg-green-100 text-green-700 border-green-200' },

  };

  // Filtered list for display
  const displayConsultations = consultations.filter(c => {
    // 管理者により非表示にされた相談は除外
    if (c.report_reason === 'admin_hidden') return false;
    // 他人のwaitingはコーチ回答タブで扱うのでここでは除外
    // 自分のwaitingは「回答待ち」として表示
    // answered / resolved は全員分表示（Q&A一覧として）
    if (c.status === 'waiting' && !c.isMine) return false;
    if (searchQuery.trim()) {
      return c.question.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Coach Application Banner */}
      {!isCoach && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          {coachAppStatus === 'none' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-sm">🎓 コーチとして活動しませんか？</p>
                <p className="text-xs text-slate-500 mt-0.5">認定コーチになって、相談に答えてコインを獲得しましょう。</p>
              </div>
              <button
                onClick={() => setShowCoachApplication(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                コーチに応募
              </button>
            </div>
          )}
          {coachAppStatus === 'pending' && (
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-amber-500" />
              <div>
                <p className="font-bold text-slate-800 text-sm">コーチ応募を審査中です</p>
                <p className="text-xs text-slate-500">承認されるまでしばらくお待ちください。</p>
              </div>
            </div>
          )}
          {coachAppStatus === 'rejected' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">応募が承認されませんでした</p>
                  <p className="text-xs text-slate-500">条件を確認して再度お申し込みください。</p>
                </div>
              </div>
              <button
                onClick={() => { setCoachAppStatus('none'); setShowCoachApplication(true); }}
                className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                再応募
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-900 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={22} className="text-blue-200" />
            <h2 className="text-xl font-bold">プロ相談</h2>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed">
            Nexus One認証コーチに直接相談。<br/>
            練習の悩み、戦術、技術改善を<span className="font-bold text-white">プロの視点</span>で解決します。
          </p>
        </div>
      </div>

      {/* Tab Swticher */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          相談一覧
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'new' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          新しく相談
        </button>
        {isCoach && (
          <button
            onClick={() => setActiveTab('coach')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'coach' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            コーチ回答
          </button>
        )}
      </div>

      {/* New Question Form - Coin Based */}
      {activeTab === 'new' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Student Coin Balance */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🪙</span>
              <span className="font-black text-yellow-600 font-mono text-lg">{studentCoins}</span>
              <span className="text-xs text-slate-500 font-medium">コイン残高</span>
            </div>
            <button
              onClick={() => setShowCoinPurchaseModal(true)}
              className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-100 transition-colors"
            >
              <ShoppingCart size={14} /> コインを購入
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle size={18} className="text-brand-blue" />
              新しい相談を投稿
            </h3>

            {/* Question Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQuestionType('text')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  questionType === 'text'
                    ? 'border-brand-blue bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-bold text-slate-800">テキストのみ</p>
                <p className="text-yellow-600 font-mono font-bold text-sm mt-1">1,000 🪙</p>
              </button>
              <button
                onClick={() => setQuestionType('video')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  questionType === 'video'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <ImageIcon size={14} className="text-indigo-600" />
                  <Video size={14} className="text-indigo-600" />
                  <p className="text-sm font-bold text-slate-800">画像・動画付き</p>
                </div>
                <p className="text-yellow-600 font-mono font-bold text-sm mt-1">2,000 🪙</p>
              </button>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600">カテゴリ（任意）</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'serve', label: 'サーブ', emoji: '🎾' },
                  { id: 'stroke', label: 'ストローク', emoji: '💪' },
                  { id: 'volley', label: 'ボレー', emoji: '⚡' },
                  { id: 'footwork', label: 'フットワーク', emoji: '👟' },
                  { id: 'tactics', label: '戦術', emoji: '🧠' },
                  { id: 'mental', label: 'メンタル', emoji: '🧘' },
                  { id: 'other', label: 'その他', emoji: '💬' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setQuestionCategory(questionCategory === cat.id ? '' : cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      questionCategory === cat.id
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="練習の悩み、技術的な質問、戦術の相談など何でもどうぞ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all leading-relaxed"
            />
            
            {questionType === 'video' && (
              <div className="space-y-3">
                {/* 添付済みメディア一覧 */}
                {questionMedia.length > 0 && (
                  <div className="space-y-1.5">
                    {questionMedia.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                        {m.type === 'image' ? <ImageIcon size={12} className="text-blue-500 shrink-0" /> : <Link size={12} className="text-indigo-500 shrink-0" />}
                        <span className="text-xs text-slate-600 flex-1 truncate">{m.name}</span>
                        <button onClick={() => setQuestionMedia(prev => prev.filter((_, j) => j !== i))} className="p-0.5 text-red-400 hover:text-red-600">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {questionMediaUploading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" /> アップロード中...
                  </div>
                )}
                {/* 画像アップロード */}
                <label className="flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer w-fit">
                  <ImageIcon size={14} /> 画像をアップロード
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    if (file.size > 5 * 1024 * 1024) { alert('5MB以下の画像を選択してください'); return; }
                    setQuestionMediaUploading(true);
                    try {
                      const compressed = await compressImage(file);
                      const path = generateFilePath(user.id, 'coach-q', compressed.name);
                      const { url, error } = await uploadFile('note-media', path, compressed);
                      if (!error && url) setQuestionMedia(prev => [...prev, { type: 'image', name: file.name, url }]);
                    } catch { /* ignore */ }
                    setQuestionMediaUploading(false);
                    e.target.value = '';
                  }} />
                </label>
                {/* 動画URL入力 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={questionUrlInput}
                    onChange={e => setQuestionUrlInput(e.target.value)}
                    placeholder="YouTube/InstagramのURLを貼り付け"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => { if (questionUrlInput.trim()) { setQuestionMedia(prev => [...prev, { type: 'url', name: questionUrlInput.trim(), url: questionUrlInput.trim() }]); setQuestionUrlInput(''); } }}
                    disabled={!questionUrlInput.trim()}
                    className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-30 flex items-center gap-1"
                  >
                    <Link size={12} /> 追加
                  </button>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 mb-1">📱 動画の共有方法</p>
                  <ol className="text-[10px] text-slate-500 space-y-0.5 list-decimal pl-3.5">
                    <li>スマホで撮影した動画を <b>YouTube</b>（限定公開）や <b>Instagram</b>（リール）にアップロード</li>
                    <li>URLをコピーして上の欄に貼り付け</li>
                  </ol>
                  <p className="text-[9px] text-slate-400 mt-1">💡 画像はそのままアップロードできます</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmitQuestion}
              disabled={!newQuestion.trim()}
              className={`w-full rounded-xl py-4 font-bold disabled:opacity-50 transition-all flex justify-center items-center gap-2 ${
                studentCoins >= questionCost
                  ? 'bg-brand-blue text-white hover:bg-brand-blue-hover'
                  : 'bg-red-100 text-red-600 border border-red-200'
              }`}
            >
              <Send size={16} />
              {studentCoins >= questionCost
                ? `相談を送信する（${questionCost} 🪙）`
                : `コインが不足しています（${questionCost} 🪙 必要）`
              }
            </button>
          </div>
        </div>
      )}

      {/* Consultation List */}
      {activeTab === 'list' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="過去の相談を検索..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {displayConsultations.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
                <MessageCircle size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">相談が見つかりません</p>
              </div>
            ) : (
              displayConsultations.map(c => {
                const status = statusConfig[c.status];
                const isExpanded = expandedId === c.id;

              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Question Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''}</span>
                        {c.category && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {{
                              serve: '🎾サーブ', stroke: '💪ストローク', volley: '⚡ボレー',
                              footwork: '👟フットワーク', tactics: '🧠戦術', mental: '🧘メンタル', other: '💬その他'
                            }[c.category] || c.category}
                          </span>
                        )}
                        {c.userNickname && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto bg-slate-50 px-2 py-0.5 rounded-full">
                            <span className="text-xs">{c.userAvatar || '🏐'}</span>
                            {c.userNickname}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium text-slate-800 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {c.question}
                      </p>
                      {/* 質問の添付メディア（展開時のみ） */}
                      {isExpanded && c.media && c.media.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {c.media.map((m: any, i: number) => (
                            <div key={i}>
                              {m.type === 'image' && m.url ? (
                                <img src={m.url} alt={m.name} className="w-full max-h-48 object-contain rounded-xl border border-slate-200" />
                              ) : m.type === 'url' && m.url ? (
                                <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                  <Video size={12} className="text-indigo-500 shrink-0" />
                                  <span className="text-[11px] text-indigo-600 font-medium truncate">{m.url}</span>
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-400 mt-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-slate-100 animate-in fade-in duration-200">
                  
                  {/* Waiting State */}
                  {c.status === 'waiting' && c.answers.length === 0 && (
                    <div className="p-5 flex flex-col items-center text-center text-slate-400 gap-2">
                      <Clock size={28} className="text-slate-300" />
                      <p className="text-sm font-medium">コーチからの回答をお待ちください...</p>
                      <p className="text-[11px]">通常24時間以内に返信があります</p>
                    </div>
                  )}

                  {/* Answers List (Multiple Coaches) */}
                  {c.answers.length > 0 && (
                    <div className="p-4 space-y-3">
                      <p className="text-[11px] font-bold text-slate-500">💬 回答一覧（{c.answers.length}件）</p>
                      {c.answers.map(a => (
                        <div key={a.id} className={`border rounded-xl p-3 space-y-2 ${a.isBestAnswer ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white'}`}>
                          {/* Best Answer Badge */}
                          {a.isBestAnswer && (
                            <div className="flex items-center gap-1.5 text-yellow-600 text-[11px] font-bold">
                              <Trophy size={14} /> ベストアンサー
                            </div>
                          )}
                          {/* Coach Info */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                              {a.coachAvatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800">{a.coachName}</span>
                                {(() => {
                                  const rc = rankConfig[a.coachRank as keyof typeof rankConfig] || rankConfig.bronze;
                                  const RankIcon = rc.icon;
                                  return (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${rc.color} flex items-center gap-0.5`}>
                                      <RankIcon size={8} /> {rc.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <p className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          {/* Answer Text */}
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.answer}</p>
                          {/* 回答の添付メディア */}
                          {a.media && a.media.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {a.media.map((m: any, mi: number) => (
                                <div key={mi}>
                                  {m.type === 'image' && m.url ? (
                                    <img src={m.url} alt={m.name} className="w-full max-h-48 object-contain rounded-xl border border-slate-200" />
                                  ) : m.type === 'url' && m.url ? (
                                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                      <Video size={12} className="text-indigo-500 shrink-0" />
                                      <span className="text-[11px] text-indigo-600 font-medium truncate">{m.url}</span>
                                    </a>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Best Answer Button */}
                          {c.isMine && c.status === 'answered' && !c.answers.some(ans => ans.isBestAnswer) && (
                            <button
                              onClick={() => handleSelectBestAnswer(a.id, c.id)}
                              className="w-full py-2 bg-yellow-50 text-yellow-700 border border-yellow-300 rounded-lg text-xs font-bold hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Trophy size={14} /> この回答をベストアンサーに選ぶ
                            </button>
                          )}
                        </div>
                      ))}

                      {/* まだ回答待ちの場合 */}
                      {c.status === 'waiting' && (
                        <div className="text-center text-[11px] text-slate-400 py-2">
                          他のコーチからの回答も受付中...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy: 旧データ（coach_questions.answerに直接保存されたもの） */}
                  {c.answers.length === 0 && (c.status === 'answered' || c.status === 'resolved') && c.answer && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                        <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">🎾</div>
                        <div>
                          <span className="font-bold text-sm text-slate-800">コーチの回答</span>
                          <p className="text-[10px] text-slate-400">{c.answeredAt ? new Date(c.answeredAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.answer}</p>
                      </div>
                    </div>
                  )}

                  {/* Resolved → Rating */}
                  {c.status === 'resolved' && (
                    <div className="p-4 space-y-3">
                      <div className="bg-green-50 border border-green-100 px-4 py-3 rounded-xl flex items-center gap-2">
                        <ThumbsUp size={16} className="text-green-500" />
                        <span className="text-sm font-bold text-green-700">この相談は解決済みです</span>
                      </div>
                      {!c.userRating ? (
                        c.isMine && (
                          <div className="text-center space-y-2">
                            <p className="text-xs font-medium text-slate-500">ベストアンサーのコーチを評価してください</p>
                            <div className="flex justify-center gap-1">
                              {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => handleRate(c.id, star)} className="p-1 hover:scale-125 transition-transform">
                                  <Star size={28} className="text-slate-300 hover:text-yellow-400 hover:fill-current transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex justify-center gap-0.5">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={20} className={star <= c.userRating! ? 'text-yellow-400 fill-current' : 'text-slate-200'} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Report */}
                  {c.isMine && c.status !== 'resolved' && c.answers.length > 0 && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => handleReport(c.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Flag size={12} />
                        回答に問題がある場合（別のコーチに再振分）
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
          </div>
        </div>
      )}

      {/* Coach Mode */}
      {activeTab === 'coach' && isCoach && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Coach Header / Coins */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg">
                  {user?.avatarEmoji || '🎾'}
                </div>
              )}
              <span className="font-bold text-slate-800 text-sm">{user?.nickname || 'コーチ'} 様</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCoinExchangeModal(true)}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <ArrowRightLeft size={12} /> コイン交換
              </button>
              <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                <span className="text-lg">🪙</span>
                <span className="font-black text-yellow-600 font-mono text-sm">{coachCoins}</span>
              </div>
            </div>
          </div>

          {/* Rank-Up Notification */}
          {rankUpNotification && (
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-4 rounded-2xl text-center font-bold text-sm shadow-lg animate-in zoom-in-95 duration-300">
              {rankUpNotification}
            </div>
          )}

          {/* Rank Progress Panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const RankIcon = rankConfig[coachRank].icon; return <RankIcon size={16} />; })()}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rankConfig[coachRank].color}`}>
                  {rankConfig[coachRank].label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  報酬倍率 ×{rankConfig[coachRank].multiplier}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span>{coachAnswerCount}回答</span>
                <span className="flex items-center gap-0.5">
                  <Star size={10} className="text-yellow-400 fill-current" /> {coachAvgRating}
                </span>
              </div>
            </div>
            {/* Progress to next rank */}
            {rankUpConditions[coachRank].next && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>次のランク: {rankConfig[rankUpConditions[coachRank].next!].label}</span>
                  <span>{coachAnswerCount}/{rankUpConditions[coachRank].answers}回答 · 評価{coachAvgRating}/{rankUpConditions[coachRank].rating}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-blue to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (coachAnswerCount / rankUpConditions[coachRank].answers) * 100)}%` }}
                  />
                </div>
              </div>
            )}</div>

          {/* Question Card Display */}
          {currentQuestionIndex >= waitingConsultations.length ? (
            consultationsLoading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-blue rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm">質問を読み込み中...</p>
            </div>
            ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-3">
              <CheckCircle2 size={48} className="mx-auto text-green-400 mb-2" />
              <h3 className="font-bold text-slate-800 text-lg">すべての質問に回答しました！</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                現在、新しい相談はありません。<br />お疲れ様でした！
              </p>
            </div>
            )
          ) : (
            <div 
              key={waitingConsultations[currentQuestionIndex].id}
              className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden flex flex-col min-h-[400px] animate-in slide-in-from-bottom-8 fade-in duration-500"
            >
              {/* Card Content (Question) */}
              <div className="p-6 flex-1 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span className="text-xs font-medium">{waitingConsultations[currentQuestionIndex].createdAt}</span>
                  {waitingConsultations[currentQuestionIndex].questionType === 'video' && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">画像・動画付き</span>
                  )}
                </div>
                <p className="text-slate-800 font-bold text-lg leading-relaxed whitespace-pre-wrap">
                  {waitingConsultations[currentQuestionIndex].question}
                </p>
                {/* 生徒の添付メディア表示 */}
                {waitingConsultations[currentQuestionIndex].media && waitingConsultations[currentQuestionIndex].media!.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400">📎 添付メディア</p>
                    <div className="space-y-2">
                      {waitingConsultations[currentQuestionIndex].media!.map((m: any, i: number) => (
                        <div key={i}>
                          {m.type === 'image' && m.url ? (
                            <img src={m.url} alt={m.name} className="w-full max-h-60 object-contain rounded-xl border border-slate-200" />
                          ) : m.type === 'url' && m.url ? (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                              <Video size={14} className="text-indigo-500 shrink-0" />
                              <span className="text-xs text-indigo-600 font-medium truncate">{m.url}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                              <Link size={12} className="text-slate-400" />
                              <span className="text-xs text-slate-500 truncate">{m.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                {!showCoachAnswerInput ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSkipQuestion}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 hover:border-slate-300 transition-all"
                    >
                      <X size={24} strokeWidth={3} className="text-slate-400" />
                      <span className="text-xs">
                        飛ばす <span className="font-mono text-[10px] text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded">-50🪙</span>
                      </span>
                    </button>
                    <button
                      onClick={() => setShowCoachAnswerInput(true)}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-brand-blue text-white font-bold rounded-2xl shadow-md hover:bg-brand-blue-hover transition-all"
                    >
                      <MessageCircle size={24} />
                      <span className="text-xs">回答する</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                    <textarea
                      value={coachAnswerText}
                      onChange={(e) => setCoachAnswerText(e.target.value)}
                      placeholder="プロの視点からアドバイスを入力..."
                      className="w-full h-40 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                      autoFocus
                    />
                    {/* Coach Answer Media Attachments */}
                    <div className="space-y-2">
                      {coachAnswerMedia.length > 0 && (
                        <div className="space-y-1.5">
                          {coachAnswerMedia.map((m, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                              {m.type === 'image' ? <ImageIcon size={12} className="text-blue-500 shrink-0" /> : <Link size={12} className="text-indigo-500 shrink-0" />}
                              <span className="text-xs text-slate-600 flex-1 truncate">{m.name}</span>
                              <button onClick={() => setCoachAnswerMedia(prev => prev.filter((_, j) => j !== i))} className="p-0.5 text-red-400 hover:text-red-600">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {coachAnswerMediaUploading && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" /> アップロード中...
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <label className="flex items-center gap-1 text-[11px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">
                          <ImageIcon size={12} /> 画像
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !user) return;
                            if (file.size > 5 * 1024 * 1024) { alert('5MB以下の画像を選択してください'); return; }
                            setCoachAnswerMediaUploading(true);
                            try {
                              const compressed = await compressImage(file);
                              const path = generateFilePath(user.id, 'coach-a', compressed.name);
                              const { url, error } = await uploadFile('note-media', path, compressed);
                              if (!error && url) setCoachAnswerMedia(prev => [...prev, { type: 'image', name: file.name, url }]);
                            } catch { /* ignore */ }
                            setCoachAnswerMediaUploading(false);
                            e.target.value = '';
                          }} />
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={coachAnswerUrlInput}
                          onChange={e => setCoachAnswerUrlInput(e.target.value)}
                          placeholder="YouTube/Instagram URLを貼り付け（任意）"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-blue transition-all"
                        />
                        <button
                          onClick={() => { if (coachAnswerUrlInput.trim()) { setCoachAnswerMedia(prev => [...prev, { type: 'url', name: coachAnswerUrlInput.trim(), url: coachAnswerUrlInput.trim() }]); setCoachAnswerUrlInput(''); } }}
                          disabled={!coachAnswerUrlInput.trim()}
                          className="px-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-30"
                        >
                          <Link size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button
                        onClick={() => { setShowCoachAnswerInput(false); setCoachAnswerMedia([]); setCoachAnswerUrlInput(''); }}
                        className="py-3 px-4 font-bold text-slate-500 bg-white border border-slate-200 rounded-xl text-sm"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => { handleCoachAnswerSubmit(waitingConsultations[currentQuestionIndex].id); }}
                        disabled={coachAnswerText.trim().length < 100}
                        className="flex-1 py-3 bg-brand-blue text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={16} /> 回答を送信
                        <span className="text-[10px] opacity-80">（ベストアンサーで +{getReward()}🪙）</span>
                      </button>
                    </div>
                    <p className={`text-right text-[10px] ${coachAnswerText.trim().length < 100 ? 'text-red-400' : 'text-green-500'}`}>
                      {coachAnswerText.trim().length}/100文字以上
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Quality Assurance Note */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex gap-3 items-start">
        <AlertTriangle size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 leading-relaxed space-y-1">
           <p className="font-bold text-slate-600">品質管理について</p>
           <p>すべてのコーチ回答はAIフィルターによる品質チェック（具体性・専門性の検証）を通過しています。不誠実な回答には自動ペナルティ（ランクダウン・資格停止）が適用されます。</p>
        </div>
      </div>

      {/* Coach Application Banner */}
      {!isCoach && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">コーチとして活動しませんか？</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ソフトテニスの知識と経験を活かして、生徒の悩みを解決しながらコインを稼げます。
          </p>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="bg-white px-2 py-1 rounded-full border border-indigo-100 text-indigo-600 font-bold">経験年6年以上</span>
            <span className="bg-white px-2 py-1 rounded-full border border-indigo-100 text-indigo-600 font-bold">または 大会実績あり</span>
            <span className="bg-white px-2 py-1 rounded-full border border-indigo-100 text-indigo-600 font-bold">または JSPO資格</span>
          </div>
          {coachAppStatus === 'none' && (
            <button
              onClick={() => setShowCoachApplication(true)}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              コーチに応募する
            </button>
          )}
          {coachAppStatus === 'pending' && (
            <div className="w-full py-3 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 border border-yellow-200">
              <Clock size={16} />
              審査中…通常 3〜5 営業日以内に結果をご連絡します
            </div>
          )}
          {coachAppStatus === 'approved' && (
            <div className="w-full py-3 bg-green-100 text-green-700 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 border border-green-200">
              <CheckCircle2 size={16} />
              承認済み！上部のコーチ権限をONにしてください
            </div>
          )}
          {coachAppStatus === 'rejected' && (
            <div className="space-y-2">
              <div className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 border border-red-200">
                <X size={16} />
                申し訳ございませんが、今回は承認できませんでした
              </div>
              <button
                onClick={() => { setCoachAppStatus('none'); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                再応募する
              </button>
            </div>
          )}
        </div>
      )}

      {/* Coin Economy Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <span className="text-lg">🪙</span> コインのしくみ
        </h3>

        {/* How to EARN coins */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">コインを獲得する（コーチ側）</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { label: 'ベストアンサーに選ばれた', value: '600〜900🪙', note: 'ランク倍率 ×1.0〜×1.5' },
              { label: 'ランクアップボーナス', value: '5,000〜50,000🪙', note: 'シルバー→プラチナ' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-xl">
                <div>
                  <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                  {item.note && <span className="text-[9px] text-slate-400 ml-1.5">({item.note})</span>}
                </div>
                <span className="text-xs font-bold text-green-600">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How coins are SPENT */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">コインを消費する</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { label: 'コーチに質問（テキスト）', value: '-1,000🪙', note: '生徒側' },
              { label: 'コーチに質問（画像・動画付き）', value: '-2,000🪙', note: '生徒側' },
              { label: '質問をスキップ（コーチ側）', value: '-50🪙', note: '' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-xl">
                <div>
                  <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                  {item.note && <span className="text-[9px] text-slate-400 ml-1.5">({item.note})</span>}
                </div>
                <span className="text-xs font-bold text-red-500">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coin Purchase */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">コイン購入（生徒側）</p>
          <div className="flex gap-2">
            {[
              { label: '5,000🪙', price: '¥500' },
              { label: '10,000🪙', price: '¥1,000' },
              { label: '30,000🪙', price: '¥2,800', bonus: true },
            ].map((item, i) => (
              <div key={i} className={`flex-1 text-center bg-yellow-50 px-2 py-2 rounded-xl ${item.bonus ? 'border-2 border-yellow-300' : 'border border-yellow-100'}`}>
                <p className="text-xs font-bold text-yellow-700">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Exchange */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">現金化（コーチ側）</p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 font-medium">交換レート</span>
              <span className="text-xs font-bold text-emerald-700">5,000🪙 → ¥400</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 font-medium">最低交換額</span>
              <span className="text-xs font-bold text-emerald-700">30,000🪙〜</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-snug">※ コーチとして回答を積み上げることで、獲得したコインを現金化できます</p>
          </div>
        </div>

        {/* Rank System */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">ランクアップ制度（コーチ側）</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { rank: 'ブロンズ', color: 'bg-amber-100 border-amber-200 text-amber-700', mult: '×1.0', cond: '初期ランク', bonus: '' },
              { rank: 'シルバー', color: 'bg-slate-100 border-slate-200 text-slate-600', mult: '×1.2', cond: '30回 / ★4.0', bonus: '+5,000🪙' },
              { rank: 'ゴールド', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', mult: '×1.3', cond: '100回 / ★4.3', bonus: '+15,000🪙' },
              { rank: 'プラチナ', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', mult: '×1.5', cond: '250回 / ★4.6', bonus: '+50,000🪙' },
            ].map((r, i) => (
              <div key={i} className={`p-2.5 rounded-xl border ${r.color} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">{r.rank}</span>
                  <span className="text-[10px] font-black">{r.mult}</span>
                </div>
                <p className="text-[9px] opacity-70">{r.cond}</p>
                {r.bonus && <p className="text-[9px] font-bold">ボーナス {r.bonus}</p>}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-400 leading-snug">※ 回答数と平均評価の両方を満たすとランクアップ。倍率が報酬に反映されます</p>
        </div>
      </div>

      <div className="h-6" />

      {/* Coach Application Modal */}
      {showCoachApplication && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCoachApplication(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                コーチ応募
              </h3>
              <button onClick={() => setShowCoachApplication(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Conditions */}
              <div className="bg-indigo-50 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold text-indigo-700">応募条件（いずれか1つを満たすこと）</p>
                <ul className="text-[11px] text-indigo-600 space-y-1">
                  <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0" />ソフトテニス経験年数 <span className="font-bold">6年以上</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0" />一定以上の<span className="font-bold">大会実績</span>（県大会以上の入賞等）</li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0" />日本スポーツ協会公認 <span className="font-bold">スポーツ指導者資格</span></li>
                </ul>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">氏名（本名） <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={coachAppForm.fullName}
                  onChange={e => setCoachAppForm({...coachAppForm, fullName: e.target.value})}
                  placeholder="例: 田中 太郎"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400">※ 本人確認用です。生徒には公開されません</p>
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">ニックネーム（表示名） <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={coachAppForm.nickname}
                  onChange={e => setCoachAppForm({...coachAppForm, nickname: e.target.value})}
                  placeholder="例: テニスコーチT"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400">※ 生徒に表示される名前です。後から変更可能です</p>
              </div>

              {/* ID Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">身分証明書 <span className="text-red-500">*</span></label>
                <label
                  className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 transition-colors cursor-pointer ${
                    coachAppForm.idDocumentUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('idDocumentUrl', f); }}
                  />
                  {uploading ? (
                    <><span className="text-xs font-bold text-indigo-600 animate-pulse">アップロード中...</span></>
                  ) : coachAppForm.idDocumentUrl ? (
                    <><CheckCircle2 size={24} className="text-green-500" /><span className="text-xs font-bold text-green-600">アップロード済み</span></>
                  ) : (
                    <><Upload size={24} className="text-slate-400" /><span className="text-xs text-slate-500">クリックして身分証をアップロード</span></>
                  )}
                </label>
                <p className="text-[10px] text-slate-400">運転免許証、マイナンバーカード等（画像ファイル・本人確認用・公開されません）</p>
              </div>

              {/* Experience Years */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">ソフトテニス経験年数 <span className="text-red-500">*</span></label>
                <select
                  value={coachAppForm.yearsExperience}
                  onChange={e => setCoachAppForm({...coachAppForm, yearsExperience: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">選択してください</option>
                  <option value="3-5">3〜5年</option>
                  <option value="6-10">6〜10年</option>
                  <option value="11-20">11〜20年</option>
                  <option value="20+">20年以上</option>
                </select>
              </div>

              {/* Tournament Results */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">大会実績（任意）</label>
                <textarea
                  value={coachAppForm.tournamentResults}
                  onChange={e => setCoachAppForm({...coachAppForm, tournamentResults: e.target.value})}
                  placeholder="例: ○○県大会優勝、全日本選手権出場 など"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Certification */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">所有資格（任意）</label>
                <select
                  value={coachAppForm.certification}
                  onChange={e => setCoachAppForm({...coachAppForm, certification: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">なし</option>
                  <option value="jspo-start">日本スポーツ協会 スタートコーチ</option>
                  <option value="jspo-basic">日本スポーツ協会 コーチ②</option>
                  <option value="jspo-advanced">日本スポーツ協会 コーチ③</option>
                  <option value="jspo-pro">日本スポーツ協会 コーチ④</option>
                  <option value="teaching">教員免許（保健体育）</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">競技歴書類（任意）</label>
                <label
                  className={`w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer ${
                    coachAppForm.resumeUrl ? 'border-green-300 bg-green-50 text-green-600 font-bold' : 'border-slate-200 text-slate-500 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload('resumeUrl', f); }}
                  />
                  {coachAppForm.resumeUrl ? (
                    <><CheckCircle2 size={14} /> アップロード済み</>
                  ) : (
                    <><Upload size={14} /> 資格証明書・経歴書をアップロード</>
                  )}
                </label>
              </div>

              {/* Self Introduction */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">自己PR（任意）</label>
                <textarea
                  value={coachAppForm.selfIntro}
                  onChange={e => setCoachAppForm({...coachAppForm, selfIntro: e.target.value})}
                  placeholder="得意分野や指導への想いを自由にお書きください"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={async () => {
                  await applyCoachApplication(coachAppForm.fullName, coachAppForm.nickname, {
                    yearsExperience: coachAppForm.yearsExperience,
                    certification: coachAppForm.certification,
                    selfIntro: coachAppForm.selfIntro,
                    tournamentResults: coachAppForm.tournamentResults,
                    idDocumentUrl: coachAppForm.idDocumentUrl,
                    resumeUrl: coachAppForm.resumeUrl
                  });
                  setCoachAppStatus('pending');
                  setShowCoachApplication(false);
                }}
                disabled={!coachAppForm.idDocumentUrl || !coachAppForm.yearsExperience || !coachAppForm.fullName.trim() || !coachAppForm.nickname.trim() || uploading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                応募を提出する
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center">提出された情報は審査目的のみに使用され、外部に公開されることはありません。</p>
            </div>
          </div>
        </div>
      )}

      {/* Coin Purchase Modal */}
      {showCoinPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCoinPurchaseModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-yellow-600" />
                コインを購入
              </h3>
              <button onClick={() => setShowCoinPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 text-center">コインを購入してコーチに質問しよう（5,000コイン = ¥500）</p>
              {coinPackages.map(pkg => (
                <button
                  key={pkg.coins}
                  onClick={async () => {
                    await addCoins(pkg.coins);
                    setShowCoinPurchaseModal(false);
                  }}
                  className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all hover:shadow-md ${
                    pkg.popular ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🪙</span>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">{pkg.label}</p>
                      {pkg.bonus && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{pkg.bonus}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">¥{pkg.price.toLocaleString()}</p>
                    {pkg.popular && <span className="text-[10px] text-yellow-600 font-bold">人気</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center">※ モック実装です。実際の決済は発生しません。</p>
            </div>
          </div>
        </div>
      )}

      {/* Coin Exchange Modal (Coach) */}
      {showCoinExchangeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCoinExchangeModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-emerald-600" />
                コイン交換
              </h3>
              <button onClick={() => setShowCoinExchangeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Direction Tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => { setExchangeDirection('toCash'); setExchangeAmount(30000); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    exchangeDirection === 'toCash' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  🪙 → ¥ 現金化
                </button>
                <button
                  onClick={() => { setExchangeDirection('toCoins'); setExchangeAmount(1000); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    exchangeDirection === 'toCoins' ? 'bg-white text-yellow-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  ¥ → 🪙 コイン購入
                </button>
              </div>

              {/* Amount Input */}
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-500">
                  {exchangeDirection === 'toCash' ? '現金化するコイン数' : '購入するコイン数'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setExchangeAmount(Math.max(exchangeDirection === 'toCash' ? 30000 : 1000, exchangeAmount - 1000))}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg hover:bg-slate-200 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-3xl font-black text-slate-800 font-mono w-24 text-center">{exchangeAmount}</span>
                  <button
                    onClick={() => setExchangeAmount(exchangeAmount + 1000)}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg hover:bg-slate-200 transition-colors"
                  >
                    ＋
                  </button>
                </div>
              </div>

              {/* Conversion Result */}
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                {exchangeDirection === 'toCash' ? (
                  <>
                    <p className="text-xs text-slate-500">受取額</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      <Banknote size={20} className="inline mr-1" />
                      ¥{Math.floor(exchangeAmount / 10 * 0.8).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{exchangeAmount.toLocaleString()}コイン → ¥{Math.floor(exchangeAmount / 10 * 0.8).toLocaleString()}</p>
                    {exchangeAmount < 30000 && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">※ 現金化は30,000コインから可能です</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">取得コイン</p>
                    <p className="text-2xl font-black text-yellow-600 mt-1">
                      🪙 {exchangeAmount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">¥{(exchangeAmount / 10).toLocaleString()} = {exchangeAmount.toLocaleString()}コイン</p>
                  </>
                )}
              </div>

              <button
                onClick={async () => {
                  if (exchangeDirection === 'toCash') {
                    if (coachCoins >= exchangeAmount) {
                      await addCoins(-exchangeAmount);
                      setShowCoinExchangeModal(false);
                    }
                  } else {
                    await addCoins(exchangeAmount);
                    setShowCoinExchangeModal(false);
                  }
                }}
                disabled={exchangeDirection === 'toCash' && (coachCoins < exchangeAmount || exchangeAmount < 30000)}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                {exchangeDirection === 'toCash' ? '現金化する' : 'コインを購入する'}
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center">※ モック実装です。実際の決済は発生しません。</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
