import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, ExternalLink, Mail, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithOAuth, signUpWithEmail, signInWithEmail } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // アプリ内ブラウザ（WebView）の検出
  const isInAppBrowser = useMemo(() => {
    const ua = navigator.userAgent || '';
    return /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|MicroMessenger|KAKAOTALK|Notion|Discord/i.test(ua)
      || (/iPhone|iPad|iPod|Android/i.test(ua) && /wv|WebView/i.test(ua));
  }, []);

  const handleGoogleClick = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithOAuth('google');
    } catch (error) {
      console.error('OAuth Login Error:', error);
      setIsLoggingIn(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (!email.trim() || !password.trim()) {
      setEmailError('メールアドレスとパスワードを入力してください');
      return;
    }
    if (password.length < 6) {
      setEmailError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoggingIn(true);
    try {
      if (emailMode === 'signup') {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setEmailError(error.includes('already registered') ? 'このメールアドレスは既に登録されています' : error);
        } else {
          setEmailSuccess('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
          setEmail('');
          setPassword('');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setEmailError(error.includes('Invalid login') ? 'メールアドレスまたはパスワードが正しくありません' : error);
        }
      }
    } catch {
      setEmailError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenInBrowser = () => {
    const url = window.location.href;
    window.open(url, '_system');
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
            onClick={handleGoogleClick}
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

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium">または</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email/Password */}
          {!emailMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setEmailMode('login'); setEmailError(''); setEmailSuccess(''); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                <Mail size={16} />
                メールでログイン
              </button>
              <button
                onClick={() => { setEmailMode('signup'); setEmailError(''); setEmailSuccess(''); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue text-white rounded-2xl font-bold text-sm hover:bg-brand-blue-hover transition-all active:scale-[0.98]"
              >
                新規登録
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-700">
                  {emailMode === 'signup' ? '新規アカウント登録' : 'メールでログイン'}
                </h3>
                <button
                  type="button"
                  onClick={() => { setEmailMode(null); setEmailError(''); setEmailSuccess(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  戻る
                </button>
              </div>

              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="メールアドレス"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all"
                autoComplete="email"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="パスワード（6文字以上）"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all"
                  autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {emailError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{emailError}</p>
              )}
              {emailSuccess && (
                <p className="text-xs text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">{emailSuccess}</p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                  emailMode === 'signup'
                    ? 'bg-brand-blue text-white hover:bg-brand-blue-hover'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                {isLoggingIn ? '処理中...' : emailMode === 'signup' ? 'アカウントを作成' : 'ログイン'}
              </button>

              <p className="text-center text-xs text-slate-400">
                {emailMode === 'signup' ? (
                  <>すでにアカウントをお持ちですか？ <button type="button" onClick={() => { setEmailMode('login'); setEmailError(''); }} className="text-brand-blue font-bold">ログイン</button></>
                ) : (
                  <>アカウントをお持ちでないですか？ <button type="button" onClick={() => { setEmailMode('signup'); setEmailError(''); }} className="text-brand-blue font-bold">新規登録</button></>
                )}
              </p>
            </form>
          )}

          <div className="flex items-center gap-3 pt-1">
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
