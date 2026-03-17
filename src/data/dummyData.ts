export interface MenuData {
  id: string;
  title: string;
  category: string;
  level: string;
  duration?: number; // minutes
  minPlayers?: number;
  maxPlayers?: number;
  description: string;
  steps?: string[];
  advice?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  author?: string;
  authorAvatar?: string;
  favoritesCount?: number;
  createdAt: string; // "YYYY-MM-DD"形式
  tags?: string[];
  youtubeUrl?: string;
  instagramUrl?: string;
}

export const dummyMenus: MenuData[] = [
  {
    id: "m-1",
    title: "ベースライン 振り回し（フォア主体）",
    category: "フォアハンド",
    level: "中級",
    duration: 15,
    minPlayers: 2,
    maxPlayers: 4,
    description: "半面を使い、球出しが左右にボールを振り分け、プレイヤーが走り込みながらフォアハンドを打つ練習。回り込みのフットワーク向上を目的とします。",
    steps: [
      "球出しはネットの向こう側、センターマーク付近に立つ。",
      "プレイヤーはベースライン中央からスタート。",
      "球出しがバック側に緩め、フォア側に厳しめにボールを出す。",
      "プレイヤーはバック側も回り込んでフォアで打ち、必ずセンターに戻る。",
      "10球1セットで交代。"
    ],
    advice: "【Nexus One コーチより】\nただ球に追いつくことよりも、「打った後の戻りの一歩」をどれだけ速く出せるかが試合で差を生みます。打点が後ろにならないよう、前で捉えることを意識しましょう！",
    rating: 4.8,
    reviewCount: 124,
    imageUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800",
    createdAt: "2023-11-01",
    tags: ["フットワーク", "基礎練習"],
    youtubeUrl: "https://www.youtube.com/watch?v=F_Yv2y50iuk" // 動作確認用のダミーURL
  },
  {
    id: "m-1-b",
    title: "バックハンド 押し込み練習",
    category: "バックハンド",
    level: "中級",
    duration: 10,
    minPlayers: 2,
    maxPlayers: 4,
    description: "バックハンドの打点を前にし、体重を乗せて深くコントロールする練習。",
    steps: [
      "球出しは浅めのボールをバック側に送る。",
      "プレイヤーは左足（右利きの場合）をしっかり踏み込み、体重移動を使って打つ。",
      "クロス深くを狙ってコントロールする。"
    ],
    advice: "【Nexus One コーチより】\n手打ちにならず、下半身の主導でラケットを振るよう意識してください。スイングの軌道はレベルスイング（地面と平行）を心がけましょう。",
    rating: 4.6,
    reviewCount: 82,
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800",
    createdAt: "2023-12-15",
    tags: ["深いボール", "体重移動"]
  },
  {
    id: "m-2",
    title: "V字ボレー・スマッシュ",
    category: "ボレー",
    level: "上級",
    duration: 20,
    minPlayers: 3,
    maxPlayers: 6,
    description: "前衛の基本となるV字の動きを身につける練習。ボレー、ポーチ、スマッシュの連続動作で実戦的なポジション移動を強化します。",
    steps: [
      "プレイヤーはサービスラインとネットの中間、サイド寄りに立つ。",
      "正面から来るボールをフォアボレー。",
      "斜め前に踏み込みながらセンターのボールをポーチボレー（V字移動）。",
      "球出しがロブを上げ、後退してスマッシュを決める。",
      "連続で1セット、ミスなく終えるまで。"
    ],
    advice: "【Nexus One コーチより】\nボレーはラケットを振るのではなく、「足で運ぶ」イメージです。特にポーチの時は斜め前への鋭い踏み込みを意識し、打った後はすぐに次の構えを作りましょう。",
    rating: 4.5,
    reviewCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800",
    createdAt: "2023-12-25",
    tags: ["前衛特化", "V字移動", "ポーチ"]
  },
  {
    id: "m-3",
    title: "確率重視・ターゲットサーブ",
    category: "サーブ",
    level: "初級〜中級",
    duration: 10,
    minPlayers: 1,
    maxPlayers: 8,
    description: "スピードよりも「狙ったコースに確実に入れる」ことを主眼に置いたサーブ練習。コーンを的として配置します。",
    steps: [
      "サービスエリア内、センターとワイドにコーンまたはタオルを置く。",
      "それぞれに狙いを定めてファーストサーブを打つ。",
      "外れた場合は、セカンドサーブを想定して確実に入る回転量の多いサーブを打つ。",
      "的に当たるまで、あるいは10球連続で入るまで続ける。"
    ],
    advice: "【Nexus One コーチより】\nトスの位置が毎回同じになるよう注意してください。コースを狙う前に、まずはリラックスして同じリズムで打てるフォームを固めることが最も重要です。",
    rating: 4.2,
    reviewCount: 56,
    imageUrl: "https://images.unsplash.com/photo-1530915534664-4ac6423816b7?auto=format&fit=crop&q=80&w=800",
    createdAt: "2024-01-10",
  },
  {
    id: "m-4",
    title: "ロブチェイス＆スマッシュ決める",
    category: "スマッシュ",
    level: "中級〜上級",
    duration: 15,
    minPlayers: 3,
    maxPlayers: 6,
    description: "後方に上げられた深いロブを追いかけ、ポジションを立て直してスマッシュを決める練習。",
    steps: [
      "プレイヤーはネット寄りにポジションをとる。",
      "球出しがベースライン深くへ高いロブを上げる。",
      "プレイヤーは素早く下がり、半身の姿勢を作りながら落下点に入る。",
      "踏み込んで力強くスマッシュを打ち込む。"
    ],
    advice: "【Nexus One コーチより】\n下がる時はボールから目を離さず、サイドステップやクロスステップを使い分けましょう。落下点に入るのが遅れると威力が半減します。",
    rating: 4.4,
    reviewCount: 45,
    imageUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800",
    createdAt: "2024-02-05",
  },
  {
    id: "m-5",
    title: "前衛・後衛 2対2 ポイント練習",
    category: "実戦形式",
    level: "上級",
    duration: 30,
    minPlayers: 4,
    maxPlayers: 8,
    description: "サーブから始まり、ポイントごとの陣形移動や戦術の確認を行う本格的な実戦練習。クロス展開からストレート展開への切り替えを意識します。",
    steps: [
      "通常の試合同様、サーバー側とレシーバー側に分かれる。",
      "ノーアドの4ポイント先取でゲームを進行。",
      "ポイント間に「今のはどう動くべきだったか」をペア同士で確認し合う時間を数秒取る。",
      "後衛は相手前衛を意識した配球、前衛はポーチのタイミングを測る。"
    ],
    advice: "【Nexus One コーチより】\n単にポイントを取り合うだけでなく、「なぜそのコースに打ったのか」「なぜそのタイミングで動いたのか」を常に意識することが上達の近道です。",
    rating: 4.9,
    reviewCount: 215,
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800",
    createdAt: "2024-03-01",
    tags: ["実戦", "陣形", "ペア練習"]
  }
];
