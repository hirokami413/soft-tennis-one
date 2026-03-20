import React from 'react';
import { MapPin, Award, ShieldCheck, HeartHandshake, Sparkles, Quote, BookOpen, Crown, ExternalLink } from 'lucide-react';

export const AboutView: React.FC = () => {

  return (
    <div className="flex flex-col gap-6 py-2">

      {/* Hero / Catchcopy */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-slate-900">
        <img 
          src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=1200" 
          alt="Tennis Court" 
          className="w-full h-80 object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 pb-8">
          <span className="px-3 py-1 bg-brand-blue/90 text-white text-xs font-bold rounded-full mb-4 inline-block">
            ソフトテニス One
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
            チーム全体が強くなるための<br/>
            <span className="text-blue-300">オールインワンプラットフォーム</span>
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            日々の練習メニューから、チーム連絡、テニスノート、<br/>
            さらにはプロコーチからの直接指導まで、ここで完結。
          </p>
        </div>
      </div>

      {/* 制作の想い */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Quote size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-slate-900">制作の想い</h3>
        </div>

        <p className="text-brand-blue font-bold text-base mb-4 leading-snug">
          「ないなら、作るしかないと思いました。」
        </p>
        
        <div className="text-slate-600 text-sm leading-relaxed space-y-4">
          <p>
            せっかくコートに立ったのに、メニューが決まらず、目的もなく適当に乱打だけして時間が過ぎていく。そんな経験が僕にもあります。当初は「今の人数や時間にぴったりの練習を、現場で即座に引き出せるツール」を作ることからこのプロジェクトは始まりました。
          </p>
          <p className="font-semibold text-slate-700 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            「練習メニューに迷う時間をゼロにするだけでなく、チームの繋がりや個人の成長まで全てをサポートできる環境を作りたい。」
          </p>
          <p>
            その想いから、『ソフトテニス One』は単なるメニュー集にとどまらず、日々の振り返りを記録する「テニスノート」や、遠くにいるプロコーチから直接指導を受けられる「オンライン指導機能」、さらにはチームの予定やコミュニケーションを一括管理する機能までを備えた、オールインワンプラットフォームへと進化しました。
          </p>
          <p>
            ここは僕たちが一方的に教えるだけの場所ではありません。全国の皆さんと一緒に「最高の練習」と「成長の記録」をストックしていく場所です。
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-xl shrink-0">
            N
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Nexus One 代表</p>
            <p className="text-lg font-black text-slate-900">上見 宏彰 <span className="text-xs font-medium text-slate-500 ml-1">Hiroaki Kami</span></p>
          </div>
        </div>
      </div>

      {/* アプリの主要機能 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-5">このアプリでできること</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* メニュー＆AI */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex flex-col items-start gap-3">
            <div className="w-12 h-12 bg-brand-blue text-white rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base mb-1">練習メニュー ＆ AIコンシェルジュ</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                豊富なデータベースから最適なメニューを検索・投稿。人数・時間・テーマに合わせてAIが専用の練習セットを提案します。今日の練習プランをPDFに出力して共有も可能。
              </p>
            </div>
          </div>

          {/* テニスノート */}
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex flex-col items-start gap-3">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm">
              <BookOpen size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base mb-1">テニスノート ＆ 目標管理</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                日々の気付きや課題をスマホで手軽に記録。自己評価のレーダーチャートや目標管理設定で、選手の自己成長を強力にサポートします。
              </p>
            </div>
          </div>

          {/* コーチ相談 */}
          <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col items-start gap-3">
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Crown size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base mb-1">プロコーチ相談 ＆ 動画添削</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                「このプレー、どうすれば？」にプロが答えます。動画を添付して送れば、認定コーチから的確なアドバイスを受けられます。コイン経済システムで報酬も。
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Nexus Oneとは */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-xs">
            N
          </div>
          Nexus Oneとは
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Nexus Oneは、茨城県つくば市を拠点に活動するソフトテニススクールです。筑波大学で体育・スポーツを専門的に学んだ指導者が、子どもたちが安心して本気でソフトテニスに打ち込める環境を提供しています。初心者から競技志向の選手まで、一人ひとりに合った指導を大切にしています。
        </p>
      </div>

      {/* 活動理念 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <HeartHandshake className="text-brand-blue" />
          活動理念
        </h3>
        <p className="font-bold text-brand-blue text-sm mb-3">
          「ソフトテニスを通じて、子供たちが『本気になれる場所』を作る」
        </p>
        <p className="text-slate-600 leading-relaxed text-sm mb-6">
          近年、思いっきり体を動かせる場所が減りつつある今だからこそ、「安心して本気でスポーツに打ち込める場所」を作りたいと考えました。<br className="mb-2"/>
          うまくいかない日も、楽しかった日も、全部が大事な経験。スポーツに詰まった"成長のタネ"をそばで見守り、応援していきます。ここは、子どもたちが自分らしく、本気になれる場所です。
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-blue-100 text-brand-blue rounded-full flex items-center justify-center mb-2">
              <MapPin size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500 mb-1">拠点</span>
            <span className="text-sm font-bold text-slate-800">茨城県 つくば市</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <Award size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500 mb-1">対象</span>
            <span className="text-sm font-bold text-slate-800">小学3年生〜中学生</span>
          </div>
        </div>
      </div>

      {/* 指導力 */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-800 p-6 rounded-3xl border border-blue-900 shadow-sm text-white">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="text-blue-200" />
          信頼できる指導力
        </h3>
        
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
            <h4 className="font-bold text-lg mb-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <span className="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-black whitespace-nowrap">
                  Certified
                </span>
                <span className="text-sm">日本スポーツ協会公認資格</span>
              </div>
            </h4>
            <p className="text-blue-50 text-sm leading-relaxed mt-2">
              筑波大学で体育・スポーツを専門的に学んだ指導者による指導です。ジュニア育成の専門知識を持つ指導者が在籍し、スポーツ科学・運動指導の理論に基づいた、正しい理論と安全への配慮に基づいた質の高い指導をお約束します。
            </p>
          </div>

          <ul className="space-y-3 px-1">
             <li className="flex gap-3 items-start text-sm text-blue-100">
               <span className="text-yellow-400 mt-0.5">✔</span>
               <span>キッズコーディネーショントレーナー資格保有。運動神経を伸ばす指導</span>
             </li>
             <li className="flex gap-3 items-start text-sm text-blue-100">
               <span className="text-yellow-400 mt-0.5">✔</span>
               <span>高校・大学でキャプテンを務めた監督によるチームワークや礼儀の指導</span>
             </li>
             <li className="flex gap-3 items-start text-sm text-blue-100">
               <span className="text-yellow-400 mt-0.5">✔</span>
               <span>初心者から上級者（本気で勝利を追求するクラス）まで対応</span>
             </li>
          </ul>
        </div>
      </div>

      {/* Official Link */}
      <a 
        href="https://www.jsttsukuba.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-white border border-slate-200 text-slate-800 rounded-full py-4 font-bold transition-all flex justify-center items-center gap-2 hover:bg-slate-50 hover:shadow-sm"
      >
        Nexus One 公式サイトを見る
        <ExternalLink size={18} className="text-slate-400" />
      </a>


      {/* Spacer */}
      <div className="h-6" />
    </div>
  );
};
