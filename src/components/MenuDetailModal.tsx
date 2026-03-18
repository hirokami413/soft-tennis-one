import React, { useState } from 'react';
import { X, Clock, Users, Star, MessageCircle, AlertCircle, Camera, Check, Youtube, Edit2, Trash2 } from 'lucide-react';
import { type MenuData } from '../types/menu';
import { Rating } from './Rating';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { EditMenuModal } from './EditMenuModal';

interface MenuDetailModalProps {
  menu: MenuData;
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  isAdded?: boolean;
}

export const MenuDetailModal: React.FC<MenuDetailModalProps> = ({ 
  menu, 
  isOpen, 
  onClose,
  onAdd,
  isAdded = false
}) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportRating, setReportRating] = useState(0);
  
  const { user } = useAuth();
  const { deleteMenu } = useSupabaseMenus();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleSubmitReport = () => {
    alert("「やってみた！」レポートを投稿しました！（※モック動作）");
    setShowReportForm(false);
    setReportText("");
    setReportRating(0);
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
        
        {/* Handle for drag-to-close feel (visual only for now) */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header Image */}
        <div className="relative h-48 md:h-64 flex-shrink-0 bg-slate-100">
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
                '実戦形式': 'bg-gradient-to-br from-amber-400 to-amber-600',
              } as Record<string, string>)[menu.category] || 'bg-gradient-to-br from-slate-400 to-slate-600'
            }`}>
              <span className="text-white font-bold text-2xl text-center leading-snug drop-shadow-lg">
                {menu.title}
              </span>
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-safe">
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
              // Instagram URLから埋め込みURLを生成
              const getInstagramEmbedUrl = (url: string): string | null => {
                const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
                if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
                return null;
              };
              const embedUrl = getInstagramEmbedUrl(menu.instagramUrl);
              return (
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">📸</span>
                    Instagram動画
                  </h3>
                  {embedUrl ? (
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm border border-slate-100" style={{ minHeight: '750px' }}>
                      <iframe
                        src={embedUrl}
                        className="w-full border-0"
                        style={{ minHeight: '750px' }}
                        allowFullScreen
                        scrolling="no"
                      />
                    </div>
                  ) : (
                    <a
                      href={menu.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl hover:shadow-md transition-all group"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">📸</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">Instagramで見る</p>
                        <p className="text-[10px] text-slate-400 truncate">{menu.instagramUrl}</p>
                      </div>
                      <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                  )}
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
                <span className="text-sm text-slate-500 font-medium">{menu.reviewCount}件</span>
              </div>

              {!showReportForm ? (
                <button 
                  onClick={() => setShowReportForm(true)}
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
                      disabled={reportRating === 0 || reportText.length === 0}
                      className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-blue text-white disabled:opacity-50 flex justify-center items-center gap-1"
                    >
                      <Check size={16} />
                      投稿
                    </button>
                  </div>
                </div>
              )}


            </div>
            
            {/* Bottom spacer for fixed button */}
            <div className="h-24" />
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe">
          <button 
            onClick={onAdd}
            className={`w-full py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
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
  );
};
