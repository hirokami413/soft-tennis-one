import React, { useState } from 'react';
import { X, Clock, Users, Star, MessageCircle, AlertCircle, Camera, Check, Youtube, Edit2, Trash2, Heart, Flag, MoreHorizontal } from 'lucide-react';
import { type MenuData } from '../types/menu';
import { Rating } from './Rating';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { useReports } from '../hooks/useReports';
import { EditMenuModal } from './EditMenuModal';

interface MenuDetailModalProps {
  menu: MenuData;
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  isAdded?: boolean;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export const MenuDetailModal: React.FC<MenuDetailModalProps> = ({ 
  menu, 
  isOpen, 
  onClose,
  onAdd,
  isAdded = false,
  onToggleFavorite,
  isFavorite = false
}) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportRating, setReportRating] = useState(0);
  
  const { user } = useAuth();
  const { deleteMenu } = useSupabaseMenus();
  const { reports, loading: reportsLoading, submitReport, deleteReport, updateReport, flagReport } = useReports(menu.id);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportText, setEditReportText] = useState('');
  const [editReportRating, setEditReportRating] = useState(0);
  const [reportMenuId, setReportMenuId] = useState<string | null>(null);

  const isAuthor = user?.id === menu.authorId;

  if (!isOpen) return null;

  if (isEditing) {
    return (
      <EditMenuModal 
        menu={menu} 
        onClose={() => {
          setIsEditing(false);
          onClose();
        }} 
      />
    );
  }

  const handleDelete = async () => {
    if (!window.confirm("本当にこのメニューを削除しますか？\n（この操作は取り消せません）")) return;
    try {
      setIsDeleting(true);
      await deleteMenu(menu.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。');
      setIsDeleting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!user) {
      alert('レポートを投稿するにはログインが必要です。');
      return;
    }
    try {
      setIsSubmittingReport(true);
      await submitReport(reportRating, reportText);
      setShowReportForm(false);
      setReportText('');
      setReportRating(0);
    } catch (err) {
      console.error(err);
      alert('レポートの投稿に失敗しました。');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content - Sliding up from bottom */}
      <div className="relative bg-white w-full h-[90vh] md:h-[85vh] md:max-w-2xl md:mx-auto rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        
        {/* Handle + Close button */}
        <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
          <div className="w-8" />
          <div className="w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer" onClick={onClose} />
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content (including image) */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {/* Header Image */}
          <div className="relative h-48 md:h-64 bg-slate-100">
            {menu.imageUrl ? (
              <img src={menu.imageUrl} alt={menu.title} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center p-6 ${
                ({
                  'フォアハンド': 'bg-gradient-to-br from-blue-400 to-blue-600',
                  'バックハンド': 'bg-gradient-to-br from-violet-400 to-violet-600',
                  'ボレー': 'bg-gradient-to-br from-emerald-400 to-emerald-600',
                  'スマッシュ': 'bg-gradient-to-br from-orange-400 to-orange-600',
                  'サーブ': 'bg-gradient-to-br from-rose-400 to-rose-600',
                  'フットワーク': 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                  'トレーニング': 'bg-gradient-to-br from-lime-400 to-lime-600',
                  '実戦形式': 'bg-gradient-to-br from-amber-400 to-amber-600',
                } as Record<string, string>)[menu.category] || 'bg-gradient-to-br from-slate-400 to-slate-600'
              }`}>
                <span className="text-white font-bold text-2xl text-center leading-snug drop-shadow-lg">
                  {menu.title}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col gap-6">
            
            {/* Title & Stats */}
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-1 rounded-md">
                  {menu.category}
                </span>
                {menu.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-current" />
                    <span className="font-bold text-slate-700">{menu.rating}</span>
                    <span className="text-xs text-slate-400">({menu.reviewCount})</span>
                  </div>
                )}
              </div>
              
              {isAuthor && (
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-200"
                  >
                    <Edit2 size={14} /> 編集する
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-100 disabled:opacity-50"
                  >
                    {isDeleting ? <span className="animate-spin text-red-600">...</span> : <><Trash2 size={14} /> 削除する</>}
                  </button>
                </div>
              )}

              <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-3">
                {menu.title}
              </h2>

              {menu.tags && menu.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {menu.tags.map((tag: string) => (
                    <span key={tag} className="text-xs font-bold text-brand-blue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-4 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  <span>{menu.duration || '-'}分</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-slate-400" />
                  <span>{menu.minPlayers || '-'}〜{menu.maxPlayers || '-'}人</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto text-slate-500">
                  <span>{menu.level}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="text-slate-700 leading-relaxed text-sm">
              {menu.description}
            </div>

            {/* Provider indicator or other missing section fixes shouldn't be here, just handling Steps */}
            {menu.steps && menu.steps.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-sm">📋</div>
                  練習手順
                </h3>
                <ul className="space-y-3">
                  {menu.steps.map((step: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-700">
                      <span className="font-bold text-brand-blue opacity-50">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* YouTube Video Section */}
            {menu.youtubeUrl && getYoutubeId(menu.youtubeUrl) && (
              <div className="mt-2">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Youtube size={20} className="text-red-500" />
                  参考動画
                </h3>
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-slate-100 shadow-sm border border-slate-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeId(menu.youtubeUrl)}`}
                    title="YouTube video player"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Instagram Section */}
            {menu.instagramUrl && (() => {
              const match = menu.instagramUrl.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
              const embedUrl = match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null;
              return (
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">📸</span>
                    Instagram動画
                  </h3>
                  <a
                    href={menu.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all group"
                    style={{ height: '420px' }}
                  >
                    {/* iframeをサムネイルとして表示（クリック無効） */}
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        style={{ pointerEvents: 'none' }}
                        loading="lazy"
                        tabIndex={-1}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
                    )}
                    {/* オーバーレイ + 再生ボタン */}
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center z-10">
                      <div className="w-16 h-16 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                        <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-l-white ml-1" />
                      </div>
                      <p className="text-white font-bold text-sm drop-shadow-lg">Instagramで再生</p>
                    </div>
                  </a>
                </div>
              );
            })()}

            {/* Coach Advice */}
            {menu.advice && (
              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                <h3 className="text-brand-blue font-bold mb-2 flex items-center gap-2 text-sm">
                  <AlertCircle size={16} />
                  Nexus One コーチより
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {menu.advice.replace('【Nexus One コーチより】\n', '')}
                </p>
              </div>
            )}

            {/* Community Feature (Yattemita Report) */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle size={18} className="text-brand-blue" />
                  みんなの「やってみた！」
                </h3>
                <span className="text-sm text-slate-500 font-medium">{reports.length}件</span>
              </div>

              {!showReportForm ? (
                <button 
                  onClick={() => {
                    if (!user) {
                      alert('レポートを投稿するにはログインが必要です。');
                      return;
                    }
                    setShowReportForm(true);
                  }}
                  className="w-full flex justify-center items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-slate-600 transition-colors"
                >
                  <Camera size={18} />
                  レポートを投稿する
                </button>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-bold text-slate-500 mb-1 block">評価</span>
                    <Rating onChange={setReportRating} size={28} />
                  </div>
                  <div>
                     <span className="text-xs font-bold text-slate-500 mb-1 block">感想・ポイント</span>
                     <textarea 
                       value={reportText}
                       onChange={(e) => setReportText(e.target.value)}
                       placeholder="この練習をやってみてどうでしたか？"
                       className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                     />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowReportForm(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-sm bg-white text-slate-600 border border-slate-200"
                    >
                      キャンセル
                    </button>
                    <button 
                      onClick={handleSubmitReport}
                      disabled={reportRating === 0 || reportText.length === 0 || isSubmittingReport}
                      className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-blue text-white disabled:opacity-50 flex justify-center items-center gap-1"
                    >
                      {isSubmittingReport ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> 投稿</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Report List */}
              {reportsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-blue rounded-full animate-spin" />
                </div>
              ) : reports.length > 0 && (
                <div className="mt-4 space-y-3">
                  {reports.map(report => {
                    const isOwnReport = user?.id === report.authorId;
                    const isEditingThis = editingReportId === report.id;
                    return (
                    <div key={report.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{report.authorAvatar}</span>
                        <span className="text-sm font-bold text-slate-700">{report.authorNickname}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{report.createdAt}</span>
                        {/* Actions */}
                        <div className="relative">
                          <button
                            onClick={() => setReportMenuId(reportMenuId === report.id ? null : report.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {reportMenuId === report.id && (
                            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                              {isOwnReport ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingReportId(report.id);
                                      setEditReportText(report.comment);
                                      setEditReportRating(report.rating);
                                      setReportMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Edit2 size={14} /> 編集
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('このレポートを削除しますか？')) {
                                        await deleteReport(report.id);
                                      }
                                      setReportMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} /> 削除
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt('通報理由を入力してください：');
                                    if (reason !== null) {
                                      try {
                                        await flagReport(report.id, reason);
                                        alert('報告しました。管理者が確認します。');
                                      } catch (err: any) {
                                        alert(err.message || '報告に失敗しました。');
                                      }
                                    }
                                    setReportMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                >
                                  <Flag size={14} /> 不適切な内容を報告
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isEditingThis ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <button key={i} type="button" onClick={() => setEditReportRating(i + 1)}>
                                <Star size={18} className={i < editReportRating ? 'text-yellow-400 fill-current' : 'text-slate-200'} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editReportText}
                            onChange={(e) => setEditReportText(e.target.value)}
                            className="w-full h-20 p-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-brand-blue"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingReportId(null)} className="flex-1 py-2 rounded-xl text-sm font-bold bg-white text-slate-600 border border-slate-200">キャンセル</button>
                            <button
                              onClick={async () => {
                                await updateReport(report.id, editReportRating, editReportText);
                                setEditingReportId(null);
                              }}
                              disabled={editReportRating === 0 || editReportText.length === 0}
                              className="flex-1 py-2 rounded-xl text-sm font-bold bg-brand-blue text-white disabled:opacity-50"
                            >保存</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-0.5 mb-2">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} size={14} className={i < report.rating ? 'text-yellow-400 fill-current' : 'text-slate-200'} />
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.comment}</p>
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

            </div>
            
            {/* Bottom spacer for fixed button */}
            <div className="h-24" />
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe">
          <div className="flex gap-3">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                  isFavorite
                    ? 'bg-rose-50 border-rose-200 text-rose-500'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-rose-400'
                }`}
              >
                <Heart size={22} className={isFavorite ? 'fill-current' : ''} />
              </button>
            )}
            <button 
              onClick={onAdd}
              className={`flex-1 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
                isAdded 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-brand-blue text-white active:bg-blue-800 hover:bg-brand-blue-hover'
              }`}
            >
              {isAdded ? "セットに追加済み" : "今日のメニューに追加する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
