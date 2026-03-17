import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sparkles, Users, Clock, Target, Plus } from 'lucide-react';
import { type MenuData } from '../data/dummyData';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { usePlaylist } from '../contexts/PlaylistContext';

export const AIPromptView: React.FC = () => {
  const [players, setPlayers] = useLocalStorage('ai_prompt_players', '4');
  const [time, setTime] = useLocalStorage('ai_prompt_time', '60');
  const [level, setLevel] = useLocalStorage('ai_prompt_level', '指定なし');
  const [theme, setTheme] = useLocalStorage('ai_prompt_theme', '');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useLocalStorage<{ message: string, menus: MenuData[] } | null>('ai_prompt_suggestion', null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const { addToPlaylist, isInPlaylist } = usePlaylist();
  const { menus } = useSupabaseMenus();

  const handleGenerate = () => {
    if (!players || !time || !theme) return;
    
    setIsAnalyzing(true);
    setSuggestion(null);

    // AI提案を模した遅延処理
    setTimeout(() => {
      const targetTime = parseInt(time, 10) || 60;
      const playerCount = parseInt(players, 10) || 99;
      let currentTotal = 0;
      const selectedMenus: MenuData[] = [];
      const themeLC = theme.toLowerCase();
      
      // 参加人数で実施可能なメニューだけに絞り込み
      const eligible = menus.filter(menu => (menu.minPlayers || 1) <= playerCount);

      // テーマに関連するメニューをスコアリング（カテゴリ、タグ、説明文でマッチ）
      const scored = eligible.map(menu => {
        let score = 0;
        
        // テーマのスコアリング
        if (theme) {
          if (menu.category.toLowerCase().includes(themeLC)) score += 3;
          if (menu.tags && menu.tags.some(tag => tag.toLowerCase().includes(themeLC))) score += 2;
          if (menu.title.toLowerCase().includes(themeLC)) score += 2;
          if (menu.description.toLowerCase().includes(themeLC)) score += 1;
        }

        // レベルのスコアリング（厳密に一致で+5、全レベル対応なら+2）
        if (level !== '指定なし') {
          if (menu.level === level) {
            score += 5;
          } else if (menu.level === '全レベル' || menu.level.includes(level)) {
            score += 2;
          } else {
            // レベルが合わないものはペナルティ
            score -= 3;
          }
        }

        // ランダム性も加えてバリエーションを出す
        score += Math.random() * 1.5;
        return { menu, score };
      });

      // スコアの高い順にソートして、時間内に収まるメニューを選択
      scored.sort((a, b) => b.score - a.score);

      for (const { menu } of scored) {
        if (currentTotal + (menu.duration || 10) <= targetTime) {
          selectedMenus.push(menu);
          currentTotal += (menu.duration || 10);
        }
      }

      // もし1つも入らなかった場合のフォールバック
      if (selectedMenus.length === 0 && menus.length > 0) {
        const smallestMenu = [...menus].sort((a, b) => (a.duration || 10) - (b.duration || 10))[0];
        selectedMenus.push(smallestMenu);
        currentTotal = smallestMenu.duration || 10;
      }

      setSuggestion({
        message: `「${theme}」を強化するための、合計${currentTotal}分のセットを作成しました。テーマに関連するメニューを優先的に組み合わせています。`,
        menus: selectedMenus
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleAddAll = () => {
    if (!suggestion) return;
    suggestion.menus.forEach(menu => {
      if (!isInPlaylist(menu.id)) {
        addToPlaylist(menu);
      }
    });
    setToastMsg('すべてのメニューを今日のメニューに追加しました！');
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      
      {/* Header Info */}
      <div className="bg-gradient-to-br from-indigo-500 to-brand-blue text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <Sparkles size={64} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Sparkles size={20} />
            AI 練習コンシェルジュ
          </h2>
          <p className="text-sm opacity-90 leading-relaxed">
            今日の状況と強化したいテーマを入力してください。<br/>
            Nexus Oneの英知を集めたAIが最適な練習セットを提案します。
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
        
        {/* Row 1: Players & Time */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Users size={14} /> 参加人数
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                placeholder="例: 4"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium tracking-widest">人</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Clock size={14} /> 練習時間
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                min="10"
                max="480"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                placeholder="例: 60"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium tracking-widest">分</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Sparkles size={14} /> 対象レベル
            </label>
            <div className="relative">
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none transition-all"
              >
                <option value="指定なし">指定なし</option>
                <option value="初級">初級</option>
                <option value="中級">中級</option>
                <option value="上級">上級</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Theme */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Target size={14} /> 強化テーマ・課題
          </label>
          <input 
            type="text" 
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
            placeholder="例: 前衛の決定力アップ、後衛の安定性"
          />
        </div>

        {/* Preset Chips */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
          {["試合前の調整", "ボレー強化", "展開練習", "基礎固め"].map(preset => (
            <button 
              key={preset}
              onClick={() => setTheme(preset)}
              className="flex-shrink-0 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full hover:bg-slate-200 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleGenerate}
          disabled={!players || !time || !theme || isAnalyzing}
          className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold disabled:opacity-50 transition-all flex justify-center items-center gap-2 hover:bg-slate-800"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              最適なAIメニューを構築中...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              メニューを提案する
            </>
          )}
        </button>
      </div>

      {/* Results Area */}
      {suggestion && (
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 space-y-4">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center shadow-md">
              <Sparkles size={16} />
            </div>
            <p className="text-sm font-medium text-brand-blue leading-relaxed ml-2 pt-1">
              {suggestion.message}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <h3 className="font-bold text-slate-800">提案されたセット</h3>
              <span className="text-xs font-bold text-slate-500">{suggestion.menus.length} メニュー</span>
            </div>

            {suggestion.menus.map((menu, idx) => (
              <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <img src={menu.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-slate-100" alt="" />
                 <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-sm text-slate-800 mb-1 truncate">{menu.title}</h4>
                   <div className="flex gap-2 text-xs font-medium text-slate-500">
                     <span>{menu.duration || 10}分</span>
                     <span className="text-slate-300">|</span>
                     <span>{menu.category}</span>
                   </div>
                 </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAddAll}
            className="w-full bg-brand-blue text-white rounded-2xl py-4 font-bold transition-all flex justify-center items-center gap-2 shadow-sm hover:bg-brand-blue-hover mt-4"
          >
            <Plus size={18} />
            すべてのメニューを追加
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="h-6" />

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
