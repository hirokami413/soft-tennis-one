import React, { useState, useRef, useEffect } from 'react';
import { Heart, Search } from 'lucide-react';
import { type MenuData } from '../data/dummyData';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { useFavorites } from '../contexts/FavoritesContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import { MenuCard } from '../components/MenuCard';
import { MenuDetailModal } from '../components/MenuDetailModal';

export const FavoritesView: React.FC = () => {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { addToPlaylist, isInPlaylist } = usePlaylist();
  const { menus } = useSupabaseMenus();
  const [selectedMenu, setSelectedMenu] = useState<MenuData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 画面が表示された時点でのお気に入りIDのスナップショットを保持
  // 解除してもこのスナップショットに含まれているメニューは表示し続ける
  const snapshotRef = useRef<string[]>(favorites);

  // favorites にアイテムが追加された場合はスナップショットにも追加
  useEffect(() => {
    const newIds = favorites.filter(id => !snapshotRef.current.includes(id));
    if (newIds.length > 0) {
      snapshotRef.current = [...snapshotRef.current, ...newIds];
    }
  }, [favorites]);

  const categories = ["すべて", "フォアハンド", "バックハンド", "ボレー", "スマッシュ", "サーブ", "フットワーク", "実戦形式"];

  // スナップショットに含まれるメニューを表示（解除してもすぐ消えない）
  const favoriteMenus = menus
    .filter(menu => snapshotRef.current.includes(menu.id))
    .filter(menu => {
      const active = activeCategory || "すべて";
      const matchCategory = active === "すべて" || menu.category === active;
      const query = searchQuery.toLowerCase();
      const matchSearch = query === "" ||
        menu.title.toLowerCase().includes(query) ||
        menu.description.toLowerCase().includes(query) ||
        (menu.tags && menu.tags.some(tag => tag.toLowerCase().includes(query)));
      return matchCategory && matchSearch;
    });

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">お気に入り</h2>
          <p className="text-sm text-slate-500 mt-1">
            {favorites.length > 0
              ? `${favorites.length} 件のメニューを保存中`
              : 'お気に入りに登録したメニューがここに表示されます'}
          </p>
        </div>
      </div>

      {/* Empty State (no favorites at all) */}
      {favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Heart size={36} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">まだお気に入りがありません</h3>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            ライブラリのメニューカードにある <span className="text-rose-500">♡</span> ボタンをタップして、お気に入りに登録しましょう。
          </p>
        </div>
      )}

      {/* Search & Category (only show when there are favorites) */}
      {favorites.length > 0 && (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all shadow-sm"
              placeholder="お気に入りの中を検索..."
            />
          </div>

          {/* Category Chips */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
            {categories.map(cat => {
              const isActive = (activeCategory || "すべて") === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === "すべて" ? null : cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Filtered Menu List */}
          <div>
            {favoriteMenus.map(menu => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onClick={() => setSelectedMenu(menu)}
                onAdd={() => addToPlaylist(menu)}
                isAdded={isInPlaylist(menu.id)}
                onToggleFavorite={() => toggleFavorite(menu.id)}
                isFavorite={isFavorite(menu.id)}
              />
            ))}
          </div>

          {/* No results for current filter */}
          {favoriteMenus.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
              <p className="font-medium">該当するお気に入りメニューがありません</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-brand-blue hover:bg-slate-50 transition-colors"
              >
                条件をクリア
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          isOpen={!!selectedMenu}
          onClose={() => setSelectedMenu(null)}
          onAdd={() => addToPlaylist(selectedMenu)}
          isAdded={isInPlaylist(selectedMenu.id)}
        />
      )}

      <div className="h-6" />
    </div>
  );
};

