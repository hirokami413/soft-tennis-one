import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AVATAR_EMOJIS = [
  '🎾', '🏸', '⭐', '🔥', '💪', '🌟', '🎯', '🏆',
  '🐱', '🐶', '🐻', '🦊', '🐰', '🐸', '🦁', '🐧',
  '🌸', '🍀', '🌊', '⚡', '🎵', '🚀', '💎', '🎪',
];

type LoginStep = 'social' | 'profile';
type Provider = 'google' | 'line' | 'apple';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [step, setStep] = useState<LoginStep>('social');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('google');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎾');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSocialClick = (provider: Provider) => {
    setSelectedProvider(provider);
    setStep('profile');
  };

  const handleComplete = () => {
    if (!nickname.trim()) return;
    setIsLoggingIn(true);
    // Simulate async login
    setTimeout(() => {
      login({
        nickname: nickname.trim(),
        avatarEmoji: selectedAvatar,
        provider: selectedProvider,
        coins: 0,
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-3xl shadow-xl mb-5">
            <span className="text-white font-black text-3xl">N</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nexus One</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">ソフトテニス練習支援アプリ</p>
        </div>

        {step === 'social' && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 space-y-5 animate-in fade-in duration-300">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-slate-800">ログイン / 新規登録</h2>
              <p className="text-xs text-slate-500 mt-1">アカウントを作成してメニュー投稿やコーチ相談を利用しよう</p>
            </div>

            {/* Google */}
            <button
              onClick={() => handleSocialClick('google')}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-700">Googleでログイン</span>
            </button>

            {/* LINE */}
            <button
              onClick={() => handleSocialClick('line')}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#06C755] rounded-2xl hover:bg-[#05b34d] transition-all active:scale-[0.98] shadow-sm"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-white">LINEでログイン</span>
            </button>

            {/* Apple */}
            <button
              onClick={() => handleSocialClick('apple')}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-black rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-white">Appleでログイン</span>
            </button>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 font-medium">個人情報は公開されません</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">プロフィール設定</h2>
              <p className="text-xs text-slate-500 mt-1">表示名とアバターを設定してください</p>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 block">アバター</label>
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-4xl shadow-inner border-4 border-white">
                  {selectedAvatar}
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      selectedAvatar === emoji
                        ? 'bg-blue-100 border-2 border-brand-blue scale-110 shadow-sm'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">
                ニックネーム <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: テニス太郎"
                maxLength={20}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                autoFocus
              />
              <p className="text-[11px] text-slate-400">この名前が他のユーザーに表示されます（20文字以内）</p>
            </div>

            {/* Provider indicator */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                selectedProvider === 'google' ? 'bg-blue-100' :
                selectedProvider === 'line' ? 'bg-green-100' : 'bg-slate-200'
              }`}>
                {selectedProvider === 'google' ? 'G' : selectedProvider === 'line' ? 'L' : ''}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {selectedProvider === 'google' ? 'Google' : selectedProvider === 'line' ? 'LINE' : 'Apple'} アカウントで連携
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('social')}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                戻る
              </button>
              <button
                onClick={handleComplete}
                disabled={!nickname.trim() || isLoggingIn}
                className="flex-[2] px-4 py-3 bg-brand-blue text-white rounded-2xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-brand-blue-hover active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  'はじめる'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            ログインすることで利用規約・プライバシーポリシーに同意したとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
};
