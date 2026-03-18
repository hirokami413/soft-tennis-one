import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, Heart } from 'lucide-react';
import { MenuCard } from '../components/MenuCard';
import { MenuDetailModal } from '../components/MenuDetailModal';
import { type MenuData } from '../types/menu';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useFavorites } from '../contexts/FavoritesContext';

export const LibraryView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "reviews">("newest");
  const [selectedMenu, setSelectedMenu] = useState<MenuData | null>(null);
  const { addToPlaylist, isInPlaylist } = usePlaylist();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { menus, isLoading } = useSupabaseMenus();

  // お気に入りタブ表示時のスナップショット（解除しても即消えない）
  const snapshotRef = useRef<string[]>(favorites);
  useEffect(() => {
    if (viewMode === 'all') {
      // allに切り替えたらスナップショットを更新
      snapshotRef.current = favorites;
    } else {
      // favoritesモード中に追加されたものはスナップショットに追加
      const newIds = favorites.filter(id => !snapshotRef.current.includes(id));
      if (newIds.length > 0) {
        snapshotRef.current = [...snapshotRef.current, ...newIds];
      }
    }
  }, [favorites, viewMode]);

  const categories = ["すべて", "フォアハンド", "バックハンド", "ボレー", "スマッシュ", "サーブ", "フットワーク", "トレーニング", "実戦形式"];

  // 全メニューからタグを収集
  const allTags = Array.from(new Set(menus.flatMap(m => m.tags || [])));

  const filteredMenus = menus.filter(m => {
    // お気に入りフィルタ
    if (viewMode === 'favorites' && !snapshotRef.current.includes(m.id)) return false;

    // カテゴリフィルタ
    const active = activeCategory || "すべて";
    const matchCategory = active === "すべて" || m.category === active;
    
    // タグフィルタ
    const matchTag = !activeTag || (m.tags && m.tags.includes(activeTag));

    // 検索キーワードフィルタ
    const query = searchQuery.toLowerCase();
    const matchSearch = query === "" || 
                        m.title.toLowerCase().includes(query) || 
                        m.description.toLowerCase().includes(query) ||
                        (m.tags && m.tags.some(tag => tag.toLowerCase().includes(query)));
                        
    return matchCategory && matchSearch && matchTag;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "rating") {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    } else {
      // reviews
      const countA = a.reviewCount || 0;
      const countB = b.reviewCount || 0;
      if (countB !== countA) return countB - countA;
      return (b.rating || 0) - (a.rating || 0);
    }
  });

  const handleAdd = (e: React.MouseEvent | undefined, menu: MenuData) => {
    if (e) e.stopPropagation();
    if (!isInPlaylist(menu.id)) {
      addToPlaylist(menu);
    }
    if (selectedMenu) setSelectedMenu(null);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag);
  };

  const favCount = favorites.length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-blue rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500">練習メニューを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* View Mode Toggle */}
      <div className="flex bg-slate-100 rounded-2xl p-1">
        <button
          onClick={() => { setViewMode('all'); setActiveTag(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            viewMode === 'all'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          すべてのメニュー
        </button>
        <button
          onClick={() => { setViewMode('favorites'); snapshotRef.current = favorites; setActiveTag(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'favorites'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Heart size={14} className={viewMode === 'favorites' ? 'text-rose-500 fill-rose-500' : ''} />
          お気に入り
          {favCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              viewMode === 'favorites' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'
            }`}>{favCount}</span>
          )}
        </button>
      </div>

      {/* Search & Filter Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {viewMode === 'all' ? 'すべての練習メニュー' : 'お気に入りメニュー'}
          </h2>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
            <ArrowUpDown size={14} className="text-slate-500" />
            <select
              value={sortBy}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              onChange={(e) => setSortBy(e.target.value as "newest" | "rating" | "reviews")}
            >
              <option value="newest">新着順</option>
              <option value="rating">評価順</option>
              <option value="reviews">レポート数順</option>
            </select>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="メニュー名やキーワードで検索..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Category Chips */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                (activeCategory === cat) || (cat === "すべて" && !activeCategory)
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tag Chips */}
        {allTags.length > 0 && (
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTag === tag
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-blue-50 text-brand-blue border border-blue-100 hover:bg-blue-100'
                }`}
              >
                #{tag}
              </button>
            ))}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                タグ解除 ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state for favorites with no items */}
      {viewMode === 'favorites' && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Heart size={36} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">まだお気に入りがありません</h3>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            メニューカードの <span className="text-rose-500">♡</span> をタップして登録しましょう。
          </p>
        </div>
      )}

      {/* ⭐ 一押しメニュー */}
      {viewMode === 'all' && menus.filter(m => m.isFeatured).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <h3 className="text-base font-bold text-slate-800">一押し練習メニュー</h3>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1">
            {menus.filter(m => m.isFeatured).map(menu => (
              <div key={menu.id} className="w-[200px] flex-shrink-0">
                <MenuCard
                  menu={menu}
                  onClick={() => setSelectedMenu(menu)}
                  onAdd={(e) => handleAdd(e, menu)}
                  isAdded={isInPlaylist(menu.id)}
                  onToggleFavorite={() => toggleFavorite(menu.id)}
                  isFavorite={isFavorite(menu.id)}
                  onTagClick={handleTagClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      {(viewMode === 'all' || favorites.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {filteredMenus.map(menu => (
             <MenuCard 
               key={menu.id} 
               menu={menu} 
               onClick={() => setSelectedMenu(menu)}
               onAdd={(e) => handleAdd(e, menu)}
               isAdded={isInPlaylist(menu.id)}
               onToggleFavorite={() => toggleFavorite(menu.id)}
               isFavorite={isFavorite(menu.id)}
               onTagClick={handleTagClick}
             />
          ))}
          {filteredMenus.length === 0 && (viewMode === 'all' || favorites.length > 0) && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
              <p className="font-medium">該当するメニューがありません</p>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory(null);
                  setActiveTag(null);
                }}
                className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-brand-blue hover:bg-slate-50 transition-colors"
              >
                条件をクリア
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          isOpen={!!selectedMenu}
          onClose={() => setSelectedMenu(null)}
          onAdd={() => handleAdd(undefined, selectedMenu)}
          isAdded={isInPlaylist(selectedMenu.id)}
          onToggleFavorite={() => toggleFavorite(selectedMenu.id)}
          isFavorite={isFavorite(selectedMenu.id)}
        />
      )}
    </div>
  );
};
