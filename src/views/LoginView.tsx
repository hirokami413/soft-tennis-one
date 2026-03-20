import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, ExternalLink } from 'lucide-react';



export const LoginView: React.FC = () => {
  const { loginWithOAuth } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // アプリ内ブラウザ（WebView）の検出
  const isInAppBrowser = useMemo(() => {
    const ua = navigator.userAgent || '';
    return /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|MicroMessenger|KAKAOTALK|Notion|Discord/i.test(ua)
      || (/iPhone|iPad|iPod|Android/i.test(ua) && /wv|WebView/i.test(ua));
  }, []);

  const handleSocialClick = async (provider: 'google' | 'apple') => {
    try {
      setIsLoggingIn(true);
      await loginWithOAuth(provider);
    } catch (error) {
      console.error('OAuth Login Error:', error);
      setIsLoggingIn(false);
    }
  };

  const handleOpenInBrowser = () => {
    const url = window.location.href;
    // iOSの場合はSafari、Androidの場合はChromeで開く
    window.open(url, '_system');
    // Androidのintent URLフォールバック
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;end`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl mb-5 overflow-hidden bg-white">
            <img src="/logo.png" alt="ソフトテニス One" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ソフトテニス One</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">ソフトテニス練習支援アプリ</p>
        </div>

          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 space-y-5 animate-in fade-in duration-300">
            {/* アプリ内ブラウザ警告 */}
            {isInAppBrowser && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">アプリ内ブラウザではログインできません</p>
                    <p className="text-xs text-amber-700 mt-1">セキュリティポリシーにより、アプリ内ブラウザからのログインがブロックされます。下のボタンから標準ブラウザで開いてください。</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenInBrowser}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors"
                >
                  <ExternalLink size={16} />
                  標準ブラウザで開く
                </button>
                <p className="text-[10px] text-amber-600 text-center">
                  上のボタンが動作しない場合は、URLをコピーしてSafariまたはChromeに貼り付けてください。
                </p>
              </div>
            )}

            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-slate-800">ログイン / 新規登録</h2>
              <p className="text-xs text-slate-500 mt-1">アカウントを作成してメニュー投稿やコーチ相談を利用しよう</p>
            </div>

            {/* Google */}
            <button
              onClick={() => handleSocialClick('google')}
              disabled={isLoggingIn}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
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

            {/* Apple */}
            <button
              onClick={() => handleSocialClick('apple')}
              disabled={isLoggingIn}
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
