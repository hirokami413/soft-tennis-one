import React, { useState } from 'react';
import { LibraryView } from './LibraryView';
import { PracticePlanView } from './PracticePlanView';
import { SubmitView } from './SubmitView';
import { Home, ClipboardList, PlusCircle } from 'lucide-react';

export const MenuHubView: React.FC = () => {
  const [subTab, setSubTab] = useState<'library' | 'practice' | 'submit'>('library');

  const tabs = [
    { id: 'library' as const, label: 'ライブラリ', icon: Home },
    { id: 'practice' as const, label: '練習プラン', icon: ClipboardList },
    { id: 'submit' as const, label: '投稿', icon: PlusCircle },
  ];

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Sub Tab Navigation */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1 print:hidden">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub Content */}
      {subTab === 'library' && <LibraryView />}
      {subTab === 'practice' && <PracticePlanView />}
      {subTab === 'submit' && <SubmitView />}
    </div>
  );
};
