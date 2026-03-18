import React, { useState } from 'react';
import { Clock, Users, Star, ChevronRight, CheckCircle2, Calendar, Heart, MoreVertical, Flag, X } from 'lucide-react';
import type { MenuData } from '../types/menu';

interface MenuCardProps {
  menu: MenuData;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
  isAdded?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  isFavorite?: boolean;
  onTagClick?: (tag: string) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ menu, onClick, onAdd, isAdded = false, onToggleFavorite, isFavorite = false, onTagClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleReport = (reason: string) => {
    setShowReportMenu(false);
    setReportSubmitted(true);
    // Mock: In production, send to backend
    console.log(`Reported menu "${menu.title}" for: ${reason}`);
    setTimeout(() => setReportSubmitted(false), 3000);
  };

  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer transform transition-all active:scale-[0.98] hover:shadow-md"
    >
      {/* Report Toast */}
      {reportSubmitted && (
        <div className="absolute top-2 left-2 right-2 z-30 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl text-center shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          ✓ 報告を受け付けました。運営チームが確認します。
        </div>
      )}

      {/* Thumbnail Area */}
      <div className="relative h-32 w-full bg-slate-200">
        {menu.imageUrl ? (
          <>
            {/* Skeleton placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-slate-200 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
              </div>
            )}
            <img 
              src={menu.imageUrl} 
              alt={menu.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center p-4 ${
            {
              'フォアハンド': 'bg-gradient-to-br from-blue-400 to-blue-600',
              'バックハンド': 'bg-gradient-to-br from-violet-400 to-violet-600',
              'ボレー': 'bg-gradient-to-br from-emerald-400 to-emerald-600',
              'スマッシュ': 'bg-gradient-to-br from-orange-400 to-orange-600',
              'サーブ': 'bg-gradient-to-br from-rose-400 to-rose-600',
              'フットワーク': 'bg-gradient-to-br from-cyan-400 to-cyan-600',
              '実戦形式': 'bg-gradient-to-br from-amber-400 to-amber-600',
            }[menu.category] || 'bg-gradient-to-br from-slate-400 to-slate-600'
          }`}>
            <span className="text-white font-bold text-base text-center leading-snug drop-shadow-md line-clamp-3">
              {menu.title}
            </span>
          </div>
        )}
        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent p-4 flex justify-between items-start">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-semibold shadow-sm">
            {menu.category}
          </span>
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }}
                className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90"
              >
                <Heart
                  size={16}
                  className={isFavorite ? 'text-rose-500 fill-rose-500' : 'text-slate-500'}
                />
              </button>
            )}
            {menu.rating && (
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm">
                <Star size={12} className="text-yellow-400 fill-current" />
                <span className="text-xs font-bold text-slate-700">{menu.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex justify-between items-start gap-1">
          <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">
            {menu.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Report Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReportMenu(!showReportMenu);
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="報告"
            >
              <MoreVertical size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAdd(e);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                isAdded 
                  ? 'bg-green-100 text-green-600'
                  : 'bg-brand-blue text-white hover:bg-brand-blue-hover active:bg-blue-800'
              }`}
            >
              {isAdded ? (
                <CheckCircle2 size={16} strokeWidth={2.5} />
              ) : (
                <div className="text-lg font-light mb-0.5">+</div>
              )}
            </button>
          </div>
        </div>

        {/* Report Dropdown */}
        {showReportMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowReportMenu(false); }} />
            <div className="absolute right-3 top-[145px] w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Flag size={12} className="text-red-500" />
                  このメニューを報告
                </span>
                <button onClick={(e) => { e.stopPropagation(); setShowReportMenu(false); }} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              {[
                '不適切な内容',
                '危険な練習方法',
                '誤った情報',
                'スパム / 宣伝',
                'その他',
              ].map(reason => (
                <button
                  key={reason}
                  onClick={(e) => { e.stopPropagation(); handleReport(reason); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </>
        )}

        {menu.tags && menu.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-[-4px]">
            {menu.tags.map(tag => (
              <button
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
                className="text-[10px] font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{menu.duration}分</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{menu.minPlayers}〜{menu.maxPlayers}人</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] ml-auto">
             {menu.level}
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="border-t border-slate-50 px-3 py-2 bg-slate-50/50 flex items-center justify-between">
        <p className="text-[8px] text-slate-400 font-medium flex items-center gap-1">
          <Calendar size={9} />
          {menu.createdAt.replace(/-/g, '/')}
        </p>
        <ChevronRight size={14} className="text-slate-400" />
      </div>
    </div>
  );
};
