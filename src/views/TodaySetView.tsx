import React, { useState, useRef } from 'react';
import { usePlaylist, type PlaylistItem } from '../contexts/PlaylistContext';
import { MenuDetailModal } from '../components/MenuDetailModal';
import { Clock, Trash2, Printer, GripVertical, Plus, X, Pencil, Undo2, Save, FolderOpen } from 'lucide-react';

export const TodaySetView: React.FC = () => {
  const { playlist, removeFromPlaylist, updatePlaylistItem, reorderPlaylist, clearPlaylist, undo, canUndo, totalDuration, addCustomItem, saveAsSet, loadSet, deleteSet, getSavedSets } = usePlaylist();
  
  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  // Save Set State
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [setName, setSetName] = useState('');
  const [showSavedSets, setShowSavedSets] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  // Modal State
  const [selectedMenu, setSelectedMenu] = useState<PlaylistItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const startEditing = (menu: PlaylistItem) => {
    setEditingId(menu.id);
    setEditTitle(menu.title);
    setEditNote(menu.description || "");
  };

  const saveEditing = (id: string) => {
    updatePlaylistItem(id, { title: editTitle, description: editNote });
    setEditingId(null);
  };

  // Custom Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDurationVal, setCustomDurationVal] = useState("10");
  const [customSetsVal, setCustomSetsVal] = useState("1");
  const [customNote, setCustomNote] = useState("");

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const dur = parseInt(customDurationVal) || 10;
    const sets = parseInt(customSetsVal) || 1;

    const newMenu: PlaylistItem = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      category: "オリジナル",
      level: "-",
      duration: dur,
      minPlayers: 1,
      maxPlayers: 99,
      description: customNote,
      steps: [],
      advice: "",
      createdAt: new Date().toISOString().split('T')[0],
      customDuration: dur,
      customSets: sets
    };

    addCustomItem(newMenu);
    setCustomTitle("");
    setCustomDurationVal("10");
    setCustomSetsVal("1");
    setCustomNote("");
    setShowAddForm(false);
  };

  if (playlist.length === 0) {
    return (
      <div className="flex flex-col gap-6 py-2">
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100 relative">
          <div className="absolute top-4 right-4 print:hidden">
            {canUndo && (
              <button 
                onClick={undo}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-colors text-brand-blue bg-blue-50 hover:bg-blue-100 shadow-sm"
              >
                <Undo2 size={16} /> 直前の操作を取り消す
              </button>
            )}
          </div>
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Clock size={28} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">今日のメニューは空です</h2>
          <p className="text-sm">ライブラリから練習メニューを追加するか<br/>下のボタンからオリジナルメニューを作りましょう</p>
        </div>

        {/* Custom Menu Addition (shown even when empty) */}
        <div>
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full py-4 border-2 border-dashed border-brand-blue/30 rounded-2xl text-brand-blue font-bold flex flex-col items-center justify-center gap-2 hover:bg-brand-blue/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Plus size={24} />
              </div>
              独自の練習メニューを追加
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="bg-white p-5 rounded-2xl border border-brand-blue/20 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800">独自メニューの作成</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">練習名 <span className="text-red-500">*</span></label>
                  <input required type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="例: 壁打ち練習" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">時間 (分)</label>
                    <input type="number" min="1" value={customDurationVal} onChange={e => setCustomDurationVal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">セット数</label>
                    <input type="number" min="1" value={customSetsVal} onChange={e => setCustomSetsVal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">備考 (任意)</label>
                  <textarea value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="意識するポイントや追加のルールなど" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all resize-none"></textarea>
                </div>
                <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl shadow-sm hover:bg-brand-blue-hover transition-colors">
                  セットに追加する
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Saved Sets (shown even when playlist is empty) */}
        {getSavedSets().length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSavedSets(!showSavedSets)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FolderOpen size={16} />
              保存済みセットから読み込む
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {getSavedSets().length}
              </span>
            </button>
            {showSavedSets && (
              <div className="border-t border-slate-100 max-h-64 overflow-y-auto">
                {getSavedSets().map(set => (
                  <div key={set.name} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{set.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {set.items.length}個 · {set.items.reduce((t, i) => t + i.customDuration * i.customSets, 0)}分 · {new Date(set.savedAt).toLocaleDateString('ja-JP')}保存
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3">
                      <button
                        onClick={() => {
                          loadSet(set.name);
                          setShowSavedSets(false);
                        }}
                        className="px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-full hover:bg-brand-blue-hover transition-colors"
                      >
                        読込
                      </button>
                      <button
                        onClick={() => deleteSet(set.name)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header Info */}
      <div className="bg-brand-blue text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-lg font-medium opacity-90 mb-1">今日の練習メニュー</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">{totalDuration}</span>
            <span className="text-lg mb-1 opacity-90 font-medium">分</span>
          </div>
          <p className="text-xs opacity-80 mt-2">
            {playlist.length} 個のメニューが追加されています
          </p>
        </div>
      </div>

      {/* Save & Load Sets */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex">
          {/* Save Button */}
          <button
            onClick={() => { setShowSaveInput(!showSaveInput); setShowSavedSets(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-r border-slate-100 ${
              showSaveInput ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-blue-50'
            }`}
          >
            <Save size={16} />
            セットを保存
          </button>
          {/* Load Button */}
          <button
            onClick={() => { setShowSavedSets(!showSavedSets); setShowSaveInput(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
              showSavedSets ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FolderOpen size={16} />
            保存済みセット
            {getSavedSets().length > 0 && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {getSavedSets().length}
              </span>
            )}
          </button>
        </div>

        {/* Save Input Form */}
        {showSaveInput && (
          <div className="p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="セット名を入力（例: 火曜の基礎練）"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
              <button
                onClick={() => {
                  if (!setName.trim()) return;
                  saveAsSet(setName.trim());
                  setSaveMessage(`「${setName.trim()}」を保存しました`);
                  setSetName('');
                  setShowSaveInput(false);
                  setTimeout(() => setSaveMessage(''), 3000);
                }}
                disabled={!setName.trim() || playlist.length === 0}
                className="px-5 py-2.5 bg-brand-blue text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors hover:bg-brand-blue-hover"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* Saved Sets List */}
        {showSavedSets && (
          <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            {getSavedSets().length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">保存済みセットはありません</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {getSavedSets().map(set => (
                  <div key={set.name} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{set.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {set.items.length}個 · {set.items.reduce((t, i) => t + i.customDuration * i.customSets, 0)}分 · {new Date(set.savedAt).toLocaleDateString('ja-JP')}保存
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3">
                      <button
                        onClick={() => {
                          loadSet(set.name);
                          setShowSavedSets(false);
                          setSaveMessage(`「${set.name}」を読み込みました`);
                          setTimeout(() => setSaveMessage(''), 3000);
                        }}
                        className="px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-full hover:bg-brand-blue-hover transition-colors"
                      >
                        読込
                      </button>
                      <button
                        onClick={() => deleteSet(set.name)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Feedback Message */}
      {saveMessage && (
        <div className="bg-green-50 text-green-700 text-sm font-bold px-4 py-3 rounded-2xl border border-green-100 text-center animate-in fade-in duration-300">
          ✓ {saveMessage}
        </div>
      )}

      {/* Playlist Items */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800">リスト一覧</h3>
          <div className="flex items-center gap-2 print:hidden">
            <button 
              onClick={undo}
              disabled={!canUndo}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                canUndo 
                  ? 'text-brand-blue bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 bg-slate-50 cursor-not-allowed'
              }`}
            >
              <Undo2 size={14} /> 元に戻す
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-hover px-4 py-1.5 rounded-full transition-colors shadow-sm"
            >
              <Printer size={14} /> PDFに出力
            </button>
            <button 
              type="button"
              onClick={clearPlaylist}
              title="全削除"
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {playlist.map((menu, index) => (
          <div 
            key={menu.id} 
            draggable
            onDragStart={(e) => {
              setDraggedIndex(index);
              dragNode.current = e.currentTarget;
              e.currentTarget.style.opacity = '0.5';
            }}
            onDragEnd={(e) => {
              setDraggedIndex(null);
              dragNode.current = null;
              e.currentTarget.style.opacity = '1';
            }}
            onDragEnter={(e) => {
              if (dragNode.current !== e.currentTarget && draggedIndex !== null) {
                reorderPlaylist(draggedIndex, index);
                setDraggedIndex(index);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault(); // 必須（ドロップを許可するため）
            }}
            onClick={(e) => {
              // 編集モード中、または削除ボタン等のクリック時はモーダルを開かない
              if (editingId === menu.id || (e.target as HTMLElement).closest('button, input, textarea, .edit-trigger')) {
                return;
              }
              // オリジナルメニュー以外の詳細モーダルを開く
              if (menu.category !== "オリジナル") {
                setSelectedMenu(menu);
                setIsModalOpen(true);
              }
            }}
            className={`flex flex-col bg-white rounded-2xl shadow-sm transition-all border ${
              draggedIndex === index ? 'border-brand-blue scale-[1.02] shadow-md z-10' : 'border-slate-100 cursor-grab active:cursor-grabbing hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors print:hidden">
                  <GripVertical size={20} />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-500">
                  {index + 1}
                </div>
              </div>
            
            <div className="flex-1 min-w-0 py-1">
              {editingId === menu.id ? (
                <div className="flex flex-col gap-2 mb-2 pr-2">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-brand-blue"
                    placeholder="メニュー名"
                  />
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-300 rounded px-2 py-1 outline-none focus:border-brand-blue resize-none"
                    placeholder="備考・メモを追加"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1"
                    >
                      キャンセル
                    </button>
                    <button 
                      onClick={() => saveEditing(menu.id)}
                      className="text-xs bg-brand-blue text-white rounded px-3 py-1 font-bold hover:bg-brand-blue-hover"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="group cursor-pointer relative edit-trigger"
                  onClick={(e) => {
                    e.stopPropagation(); // モーダルを開くイベントをブロック
                    startEditing(menu);
                  }}
                >
                  <h4 className="font-bold text-slate-800 leading-tight mb-1 pr-6 flex items-start justify-between">
                    <span className="group-hover:text-brand-blue transition-colors">{menu.title}</span>
                    <Pencil size={14} className="text-slate-300 group-hover:text-brand-blue transition-colors mt-0.5 shrink-0" />
                  </h4>
                  {menu.description && (
                    <p className="text-[11px] text-slate-500 mb-1.5 leading-snug break-words pr-6">{menu.description}</p>
                  )}
                </div>
              )}
              
              <div className="flex gap-3 text-xs font-medium text-slate-500">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">
                  {menu.category}
                </span>
              </div>
            </div>

            <button
              onClick={() => removeFromPlaylist(menu.id)}
              className="w-10 h-10 flex shrink-0 items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {/* Customization Controls */}
          <div className="flex items-center justify-between border-t border-slate-50 p-3 bg-slate-50/50 rounded-b-2xl print:bg-transparent print:border-none">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">時間</span>
                {/* Screen View */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm print:hidden">
                  <button 
                    onClick={() => updatePlaylistItem(menu.id, { customDuration: Math.max(1, menu.customDuration - 1) })}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-blue"
                  >-</button>
                  <span className="w-6 text-center text-sm font-bold text-slate-700">{menu.customDuration}</span>
                  <button 
                    onClick={() => updatePlaylistItem(menu.id, { customDuration: menu.customDuration + 1 })}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-blue"
                  >+</button>
                </div>
                {/* Print View */}
                <span className="hidden print:inline-block text-sm font-bold text-slate-700">{menu.customDuration}</span>
                <span className="text-xs text-slate-500">分</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">セット</span>
                {/* Screen View */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm print:hidden">
                  <button 
                    onClick={() => updatePlaylistItem(menu.id, { customSets: Math.max(1, menu.customSets - 1) })}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-blue"
                  >-</button>
                  <span className="w-6 text-center text-sm font-bold text-slate-700">{menu.customSets}</span>
                  <button 
                    onClick={() => updatePlaylistItem(menu.id, { customSets: menu.customSets + 1 })}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-blue"
                  >+</button>
                </div>
                {/* Print View */}
                <span className="hidden print:inline-block text-sm font-bold text-slate-700">{menu.customSets}</span>
              </div>
            </div>
            
            <div className="text-sm font-bold text-brand-blue tracking-tight">
              {menu.customDuration * menu.customSets} <span className="text-xs font-medium">分</span>
            </div>
          </div>
        </div>
        ))}

        {/* Custom Menu Addition UI */}
        <div className="mt-2">
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full py-4 border-2 border-dashed border-brand-blue/30 rounded-2xl text-brand-blue font-bold flex flex-col items-center justify-center gap-2 hover:bg-brand-blue/5 transition-colors print:hidden"
            >
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Plus size={24} />
              </div>
              独自の練習メニューを追加
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="bg-white p-5 rounded-2xl border border-brand-blue/20 shadow-md print:hidden">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800">独自メニューの作成</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">練習名 <span className="text-red-500">*</span></label>
                  <input required type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="例: 壁打ち練習" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">時間 (分)</label>
                    <input type="number" min="1" value={customDurationVal} onChange={e => setCustomDurationVal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">セット数</label>
                    <input type="number" min="1" value={customSetsVal} onChange={e => setCustomSetsVal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">備考 (任意)</label>
                  <textarea value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="意識するポイントや追加のルールなど" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all resize-none"></textarea>
                </div>
                
                <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl shadow-sm hover:bg-brand-blue-hover transition-colors">
                  セットに追加する
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Spacer for bottom nav */}
      <div className="h-4" />

      {/* Menu Detail Modal */}
      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={() => {}} // TodaySetView内ではすでに追加済みなので何もしない
          isAdded={true}
        />
      )}
    </div>
  );
};
