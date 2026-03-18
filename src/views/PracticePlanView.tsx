import React, { useState } from 'react';
import { TodaySetView } from './TodaySetView';
import { AIPromptView } from './AIPromptView';
import { ListTodo, Sparkles } from 'lucide-react';

export const PracticePlanView: React.FC = () => {
  const [subTab, setSubTab] = useState<'today' | 'ai'>('today');

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Sub Tab Toggle */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1 print:hidden">
        <button
          onClick={() => setSubTab('today')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            subTab === 'today'
              ? 'bg-brand-blue text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <ListTodo size={16} />
          今日のメニュー
        </button>
        <button
          onClick={() => setSubTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            subTab === 'ai'
              ? 'bg-gradient-to-r from-indigo-500 to-brand-blue text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={16} />
          AI提案
        </button>
      </div>

      {/* Sub Content */}
      {subTab === 'today' ? <TodaySetView /> : <AIPromptView />}
    </div>
  );
};
