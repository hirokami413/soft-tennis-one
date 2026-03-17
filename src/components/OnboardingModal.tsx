import React, { useState } from 'react';
import { Users, BookOpen, ShieldCheck, ChevronRight, Sparkles, X } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

const steps = [
  {
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    title: 'チームに参加しよう',
    desc: '招待コードを入力してチームに参加、または新しいチームを作成できます。\nチーム内で練習予定の共有や出欠管理ができます。',
  },
  {
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-600',
    title: 'テニスノートを書こう',
    desc: '毎日の練習を Keep / Problem / Try で振り返り。\nレーダーチャートで自分のスキルを可視化し、目標管理もできます。',
  },
  {
    icon: ShieldCheck,
    color: 'from-violet-500 to-purple-600',
    title: 'コーチに相談しよう',
    desc: '認定コーチにテキストや動画で質問できます。\nコインを使って質問し、プロのアドバイスを受けましょう。',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('app_onboarding_done', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('app_onboarding_done', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Skip */}
        <div className="flex justify-end p-4 pb-0">
          <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-medium flex items-center gap-1">
            スキップ <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-2 text-center space-y-6">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
            <Icon size={36} className="text-white" />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">{current.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">{current.desc}</p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-brand-blue w-6' : 'bg-slate-200 dark:bg-slate-600'
              }`} />
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-brand-blue text-white rounded-2xl font-bold text-sm hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2"
          >
            {step < steps.length - 1 ? (
              <>次へ <ChevronRight size={16} /></>
            ) : (
              <><Sparkles size={16} /> はじめる</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
