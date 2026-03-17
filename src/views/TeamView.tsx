import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MessageSquare, Shield, Crown, User, 
  Plus, Check, ChevronLeft, ChevronRight,
  Send, Copy, FileText, X, MapPin, Clock as ClockIcon,
  Trash2, Edit2, CopyPlus, Repeat, Search, Image, Video, Link
} from 'lucide-react';

// ── Types ──
type Role = 'admin' | 'captain' | 'member' | 'parent';

interface TeamMember {
  name: string;
  role: Role;
  avatar: string;
  avatarImage?: string; // Data URL for uploaded avatar
  message?: string; // Short bio or status message
}

interface EventComment {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
}

interface PracticeEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  attendance: Record<string, 'present' | 'absent' | 'late' | null>;
  attendanceTimestamps?: Record<string, string>; // name -> ISO string
  attendanceDeadline?: string; // ISO string
  comments: EventComment[];
  needsAttendance: boolean; // Toggle for voting
  recurrenceGroupId?: string;
}

interface ChatGroup {
  id: string;
  name: string;
  participants: string[];
}

interface ChatAttachment {
  name: string;
  type: 'image' | 'video' | 'pdf' | 'file';
  url: string; // Base64 data URL expected for dummy
  size?: number; // bytes
}

interface ChatMsg {
  id: string;
  sender: string;
  targetId: string; // 'all' or member name or group-id
  text: string;
  time: string;
  mediaUrl?: string; // Legacy simple media
  mediaType?: 'image' | 'video'; // Legacy simple media
  attachments?: ChatAttachment[]; // Rich attachments
}

interface BoardVoteOption {
  id: string;
  text: string;
  voterNames: string[];
  voteTimestamps?: Record<string, string>; // name -> ISO string
}

interface BoardPost {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  voteOptions?: BoardVoteOption[];
  surveyTitle?: string;
  isAnonymousVote?: boolean;
  voteDeadline?: string;
}

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  members: TeamMember[];
  events: PracticeEvent[];
  chats: ChatMsg[];
  groups: ChatGroup[];
  boardPosts: BoardPost[];
}

// ── Config ──
const roleConfig: Record<Role, { label: string; color: string; icon: React.FC<{size?: number}> }> = {
  admin:   { label: '指導者', color: 'text-red-600 bg-red-50 border-red-200', icon: Shield },
  captain: { label: '部長',   color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Crown },
  member:  { label: '生徒',   color: 'text-slate-500 bg-slate-50 border-slate-200', icon: User },
  parent:  { label: '保護者', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: User },
};

// ── Dummy Data ──
const teamName = 'Nexus One つくば';
const inviteCode = 'NX-2026-TSUKUBA';

const initialMembers: TeamMember[] = [
  { name: '上見 宏彰', role: 'admin', avatar: 'N', message: 'Nexus One代表。みんなで楽しく強くなろう！' },
  { name: '鈴木 太郎', role: 'captain', avatar: '鈴', message: '部長の鈴木です。県大会出場目指して頑張ります。' },
  { name: '田中 花子', role: 'member', avatar: '田', message: 'バックハンド強化中！' },
  { name: '佐藤 健',   role: 'member', avatar: '佐', message: 'よろしくお願いします。' },
  { name: '山本 美咲', role: 'member', avatar: '山', message: 'サーブの確率を上げたいです。' },
  { name: '田中 裕子', role: 'parent', avatar: '母', message: '花子の母です。いつもお世話になっております。' },
];

const todayDate = new Date();
const fmtDate = (d: Date) => d.toISOString().split('T')[0];

const initialEvents: PracticeEvent[] = [
  { 
    id: 'ev-1', title: '通常練習', date: fmtDate(todayDate), time: '17:00-19:00', location: '中央公園テニスコート', 
    attendance: { '田中 花子': 'present', '佐藤 健': 'late', '山本 美咲': null },
    comments: [
      { id: 'c1', sender: '田中 花子', avatar: '田', text: 'ラケットのガット張り替え終わりました！楽しみです。', time: '09:30' },
      { id: 'c2', sender: '上見 宏彰', avatar: 'N', text: '道具のメンテナンスは大事ですね！', time: '10:15' }
    ],
    needsAttendance: true
  },
  { id: 'ev-2', title: '日曜練習', date: fmtDate(new Date(todayDate.getTime() + 2 * 86400000)), time: '9:00-12:00', location: '大学コート', attendance: {}, comments: [], needsAttendance: true },
  { id: 'ev-3', title: '夜間練習', date: fmtDate(new Date(todayDate.getTime() + 5 * 86400000)), time: '17:00-19:00', location: '中央公園テニスコート', attendance: {}, comments: [], needsAttendance: false },
];

const initialChats: ChatMsg[] = [
  { id: '1', sender: '上見 宏彰', targetId: 'all', text: '今日の練習のテーマは「ポーチの飛び出し」です。遅刻の人はストレッチ済ませてから合流してね。', time: '16:30' },
  { id: '2', sender: '鈴木 太郎', targetId: 'all', text: '了解です！コートの予約は3番コートです。あと、来月の大会の要項が送られてきました。', time: '16:35', 
    attachments: [{ name: '大会要項_詳細.pdf', type: 'pdf', url: '', size: 1024 * 1024 * 1.5 }] 
  },
  { id: '3', sender: '上見 宏彰', targetId: '鈴木 太郎', text: '鈴木君、今日の練習メニューの確認をお願いします。', time: '16:38' },
];

const initialBoardPosts: BoardPost[] = [
  {
    id: 'bp-1',
    author: '上見 宏彰',
    title: '春季県大会エントリー完了のお知らせと注意事項',
    content: '来月の春季県大会のエントリーが無事完了しました。\n各自、ドロー表を確認し、初戦の対戦相手の分析をしておくようにしてください。今回の大会からユニフォームの規定が厳格化されているため、添付のガイドラインを必ず一読すること！',
    createdAt: '2026-03-12 10:00',
    attachments: [
      { name: '春季県大会ドロー表.pdf', type: 'pdf', url: '', size: 2450000 },
      { name: '新規ユニフォーム規定.pdf', type: 'pdf', url: '', size: 850000 }
    ],
    voteOptions: [
      { id: 'v1', text: '確認した', voterNames: ['鈴木 太郎', '佐藤 健'], voteTimestamps: {'鈴木 太郎': new Date(Date.now() - 3600000).toISOString(), '佐藤 健': new Date(Date.now() - 1800000).toISOString()} }
    ]
  },
  {
    id: 'bp-2',
    author: '鈴木 太郎',
    title: '来週末の合同練習会 参加確認',
    content: '東高校との合同練習会が決定しました。場所は先方のコート（３面）を使用します。配車の関係があるため、早めの出欠入力をお願いします。',
    createdAt: '2026-03-11 18:30',
    voteOptions: [
      { id: 'y', text: '参加（配車可能）', voterNames: ['山田 父'], voteTimestamps: {'山田 父': new Date(Date.now() - 7200000).toISOString()} },
      { id: 'y2', text: '参加（同乗希望）', voterNames: ['田中 花子', '山本 美咲'], voteTimestamps: {'田中 花子': new Date(Date.now() - 86400000).toISOString(), '山本 美咲': new Date(Date.now() - 4000000).toISOString()} },
      { id: 'n', text: '不参加', voterNames: [] }
    ]
  }
];

// ── Component ──
export const TeamView: React.FC = () => {
  const [myRole, setMyRole] = useState<Role>('admin');
  const [subTab, setSubTab] = useState<'team' | 'board' | 'calendar' | 'chat'>('team');
  const [myAttendance, setMyAttendance] = useState<Record<string, string>>({}); // Shared or per-team
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };
  
  // Teams State - Initialized with Dummy Data or LocalStorage
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('softtennis_teams_data');
    if (saved) {
      const parsedTeams = JSON.parse(saved);
      // Migrate existing data to include new properties
      return parsedTeams.map((t: any) => ({
        ...t,
        boardPosts: t.boardPosts || (t.id === 't-1' ? initialBoardPosts : []),
      }));
    }
    return [{
      id: 't-1',
      name: teamName,
      inviteCode: inviteCode,
      members: initialMembers,
      events: initialEvents,
      chats: initialChats,
      groups: [],
      boardPosts: initialBoardPosts
    }];
  });

  const [currentTeamId, setCurrentTeamId] = useState<string>(() => {
    const saved = localStorage.getItem('softtennis_active_team_id');
    return saved || 't-1';
  });

  const currentTeam = teams.find(t => t.id === currentTeamId) || teams[0];

  // Guard: if no team exists at all, show a placeholder
  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-slate-500 text-sm">チームがありません。チームを作成または参加してください。</p>
      </div>
    );
  }

  // Derived States from currentTeam
  const members = currentTeam.members || [];
  const events = currentTeam.events || [];
  const chats = currentTeam.chats || [];
  const groups = currentTeam.groups || [];

  const teamMembersMap = members.reduce((acc, m) => {
    acc[m.name] = m;
    return acc;
  }, {} as Record<string, TeamMember>);

  // Effects for Persistence
  useEffect(() => {
    localStorage.setItem('softtennis_teams_data', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('softtennis_active_team_id', currentTeamId);
  }, [currentTeamId]);

  // Participation Modal State
  const [isJoinTeamMode, setIsJoinTeamMode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreateTeamMode, setIsCreateTeamMode] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState<string>('all'); // 'all' or Name or groupId
  const [chatViewMode, setChatViewMode] = useState<'list' | 'room'>('list');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]); // For group creation
  const [isGroupMode, setIsGroupMode] = useState(false);
  
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [codeCopied, setCodeCopied] = useState(false);

  // Voting & Boards
  const [viewingVoters, setViewingVoters] = useState<{optionText: string, voters: {name: string, timestamp?: string}[]} | null>(null);

  // Modals
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLoc, setNewEventLoc] = useState('');
  const [newEventTime, setNewEventTime] = useState('17:00-19:00');
  const [newEventAttendance, setNewEventAttendance] = useState(true);
  const [newEventDeadline, setNewEventDeadline] = useState('');
  const [newEventRecurrence, setNewEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [viewingStudentNote, setViewingStudentNote] = useState<string | null>(null);
  const [selectedNoteIdx, setSelectedNoteIdx] = useState(0);
  const [coachCommentText, setCoachCommentText] = useState('');
  const [coachCommentUrls, setCoachCommentUrls] = useState<string[]>([]);
  const [coachUrlInput, setCoachUrlInput] = useState('');
  const [eventCommentInput, setEventCommentInput] = useState<Record<string, string>>({});
  const [eventToDelete, setEventToDelete] = useState<PracticeEvent | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'future' | 'all'>('single');
  const [eventFilterQuery, setEventFilterQuery] = useState('');

  // Profile Modal State
  const [viewingProfile, setViewingProfile] = useState<TeamMember | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editAvatarBase64, setEditAvatarBase64] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Role Edit State (Admin Only)
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);

  // Board Post Modal State
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAttachments, setNewPostAttachments] = useState<ChatAttachment[]>([]);
  const [newPostVoteOptions, setNewPostVoteOptions] = useState<{id: string, text: string}[]>([]);
  const [newPostSurveyTitle, setNewPostSurveyTitle] = useState('');
  const [newPostIsAnonymous, setNewPostIsAnonymous] = useState(false);
  const [newPostVoteDeadline, setNewPostVoteDeadline] = useState('');

  const handleVote = (postId: string, optionId: string) => {
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    
    setTeams(prev => prev.map(t => {
      if (t.id !== currentTeamId) return t;
      
      const newPosts = t.boardPosts.map(post => {
        if (post.id !== postId || !post.voteOptions) return post;
        
        // 期限切れチェック
        if (post.voteDeadline && new Date() > new Date(post.voteDeadline)) {
          showToast('このアンケートの投票期限は終了しています');
          return post;
        }

        const newOptions = post.voteOptions.map(opt => {
          // すでに他で投票している場合は外す（単一選択）
          let voters = opt.voterNames.filter(n => n !== myName);
          let voteTimestamps = { ...(opt.voteTimestamps || {}) };
          delete voteTimestamps[myName];
          
          // 今回選んだオプションに追加
          if (opt.id === optionId) {
            voters.push(myName);
            voteTimestamps[myName] = new Date().toISOString();
          }
          return { ...opt, voterNames: voters, voteTimestamps };
        });

        return { ...post, voteOptions: newOptions };
      });
      return { ...t, boardPosts: newPosts };
    }));
  };

  const handleAttendanceVote = (evId: string, status: 'present' | 'absent' | 'late') => {
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    let isExpired = false;
    
    setTeams(prev => prev.map(t => {
      if (t.id !== currentTeamId) return t;
      const newEvents = t.events.map(ev => {
        if (ev.id !== evId) return ev;
        if (ev.attendanceDeadline && new Date() > new Date(ev.attendanceDeadline)) {
          isExpired = true;
          return ev;
        }
        const newAttendance = { ...(ev.attendance || {}) };
        const newTimestamps = { ...(ev.attendanceTimestamps || {}) };
        newAttendance[myName] = status;
        newTimestamps[myName] = new Date().toISOString();
        return { ...ev, attendance: newAttendance, attendanceTimestamps: newTimestamps };
      });
      return { ...t, events: newEvents };
    }));
    
    if (isExpired) {
      showToast('この出欠の回答期限は終了しています');
    } else {
      // ローカルステートも更新（UIの即時反映用）
      const eventDate = events.find(e => e.id === evId)?.date;
      if (eventDate) {
        setMyAttendance(prev => ({ ...prev, [eventDate]: status }));
      }
    }
  };

  const handleAttachmentClick = (att: ChatAttachment) => {
    if (att.url) {
      if (att.url.startsWith('data:')) {
        try {
          const byteString = atob(att.url.split(',')[1]);
          const mimeString = att.url.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], {type: mimeString});
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        } catch (e) {
          window.open(att.url, '_blank');
        }
      } else {
        window.open(att.url, '_blank');
      }
    } else {
      showToast('ダミーファイルのため開けません');
    }
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      showToast('タイトルと本文を入力してください');
      return;
    }
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    
    const newPost: BoardPost = {
      id: `bp-${Date.now()}`,
      author: myName,
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      createdAt: new Date().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      attachments: newPostAttachments.length > 0 ? newPostAttachments : undefined,
      voteOptions: newPostVoteOptions.length > 0 ? newPostVoteOptions.map(opt => ({ id: opt.id, text: opt.text, voterNames: [] })) : undefined,
      surveyTitle: newPostSurveyTitle.trim() || undefined,
      isAnonymousVote: newPostIsAnonymous,
      voteDeadline: newPostVoteDeadline || undefined
    };

    setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, boardPosts: [newPost, ...(t.boardPosts || [])] } : t));
    setIsNewPostModalOpen(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostAttachments([]);
    setNewPostVoteOptions([]);
    setNewPostSurveyTitle('');
    setNewPostIsAnonymous(false);
    setNewPostVoteDeadline('');
    showToast('お知らせを投稿しました');
  };

  const handleSendChat = (mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!chatInput.trim() && !mediaUrl) return;
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    
    const newMsg: ChatMsg = {
      id: `m-${Date.now()}`,
      sender: myName,
      targetId: chatTarget,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      ...(mediaUrl ? { mediaUrl, mediaType } : {}),
    };

    setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, chats: [...t.chats, newMsg] } : t));
    setChatInput('');
  };

  const handleCreateGroup = () => {
    if (selectedGroupMembers.length === 0) return;
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    const participants = [...selectedGroupMembers, myName].sort();
    const gName = participants.join(', ');
    const existing = groups.find(g => JSON.stringify([...g.participants].sort()) === JSON.stringify(participants));
    
    if (existing) {
      setChatTarget(existing.id);
    } else {
      const newG: ChatGroup = {
        id: `g-${Date.now()}`,
        name: gName,
        participants: participants
      };
      setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, groups: [...t.groups, newG] } : t));
      setChatTarget(newG.id);
    }
    setIsGroupMode(false);
    setSelectedGroupMembers([]);
  };

  const handleJoinTeam = () => {
    if (!joinCodeInput.trim()) return;
    // For demo, if code starts with 'JOIN-', create a mock team
    if (joinCodeInput.startsWith('JOIN-')) {
      const newTeam: Team = {
        id: `t-${Date.now()}`,
        name: `新チーム (${joinCodeInput})`,
        inviteCode: joinCodeInput,
        members: [{ name: '自分（加入者）', role: 'member', avatar: '自', message: 'よろしくお願いします。' }],
        events: [],
        chats: [],
        groups: [],
        boardPosts: []
      };
      setTeams(prev => [...prev, newTeam]);
      setCurrentTeamId(newTeam.id);
      setIsJoinTeamMode(false);
      setJoinCodeInput('');
      showToast('チームに参加しました！');
    } else {
      showToast('無効な招待コードです。JOIN- で始まるコードを入力してください');
    }
  };

  const handleAddComment = (evId: string) => {
    const text = eventCommentInput[evId];
    if (!text?.trim()) return;
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    const myAvatar = myRole === 'admin' ? 'N' : '鈴';

    const newComment: EventComment = {
      id: `c-${Date.now()}`,
      sender: myName,
      avatar: myAvatar,
      text: text.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    };

    setTeams(prev => prev.map(t => t.id === currentTeamId ? {
      ...t,
      events: t.events.map(ev => ev.id === evId ? { ...ev, comments: [...ev.comments, newComment] } : ev)
    } : t));
    setEventCommentInput(prev => ({ ...prev, [evId]: '' }));
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(currentTeam.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleAddEvent = () => {
    if (!selectedDateForAdd || !newEventLoc.trim()) return;

    setTeams(prev => prev.map(t => {
      if (t.id === currentTeamId) {
        let newEvents = [...t.events];
        
        if (editingEventId) {
          // Edit existing event
          const updatedEv: PracticeEvent = {
            id: editingEventId,
            title: newEventTitle || '練習予定',
            date: selectedDateForAdd,
            time: newEventTime,
            location: newEventLoc,
            attendance: newEvents.find(e => e.id === editingEventId)?.attendance || {},
            attendanceTimestamps: newEvents.find(e => e.id === editingEventId)?.attendanceTimestamps || {},
            comments: newEvents.find(e => e.id === editingEventId)?.comments || [],
            needsAttendance: newEventAttendance,
            ...(newEventDeadline ? { attendanceDeadline: newEventDeadline } : {})
          };
          newEvents = newEvents.map(ev => ev.id === editingEventId ? updatedEv : ev);
        } else {
          // Add new event(s), handling recurrence up to end date
          let currentDate = new Date(selectedDateForAdd);
          let endDate = recurrenceEndDate && newEventRecurrence !== 'none' 
            ? new Date(recurrenceEndDate) 
            : new Date(selectedDateForAdd);
          
          // Safety fallback: if endDate is before startDate, just add one event
          if (endDate < currentDate) {
            endDate = new Date(currentDate);
          }

          const recGroupId = newEventRecurrence !== 'none' ? `rg-${Date.now()}` : undefined;
          let i = 0;
          while (currentDate <= endDate) {
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const newEv: PracticeEvent = {
              id: `ev-${Date.now()}-${i}`,
              title: newEventTitle || '練習予定',
              date: dateStr,
              time: newEventTime,
              location: newEventLoc,
              attendance: {},
              attendanceTimestamps: {},
              comments: [],
              needsAttendance: newEventAttendance,
              ...(newEventDeadline ? { attendanceDeadline: newEventDeadline } : {}),
              ...(recGroupId ? { recurrenceGroupId: recGroupId } : {})
            };
            newEvents.push(newEv);
            
            // Increment date based on recurrence type
            if (newEventRecurrence === 'none') {
              break; // exit loop after one insertion
            } else if (newEventRecurrence === 'daily') {
              currentDate.setDate(currentDate.getDate() + 1);
            } else if (newEventRecurrence === 'weekly') {
              currentDate.setDate(currentDate.getDate() + 7);
            } else if (newEventRecurrence === 'monthly') {
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
            i++;
            // Failsafe to prevent infinite loops (e.g. extremely far end date)
            if (i > 365) break; 
          }
        }
        
        return { ...t, events: newEvents.sort((a,b) => a.date.localeCompare(b.date)) };
      }
      return t;
    }));
    
    setSelectedDateForAdd(null);
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventLoc('');
    setNewEventAttendance(true);
    setNewEventDeadline('');
    setNewEventRecurrence('none');
    setRecurrenceEndDate('');
  };

  const handleDeleteEvent = (ev: PracticeEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(ev);
    setDeleteMode('single');
  };

  const confirmDeleteEvent = () => {
    if (eventToDelete) {
      setTeams(prev => prev.map(t => t.id === currentTeamId ? { 
        ...t, 
        events: t.events.filter(ev => {
          if (eventToDelete.recurrenceGroupId && ev.recurrenceGroupId === eventToDelete.recurrenceGroupId) {
            if (deleteMode === 'all') return false;
            if (deleteMode === 'future') return ev.date < eventToDelete.date;
          }
          return ev.id !== eventToDelete.id;
        }) 
      } : t));
      setEventToDelete(null);
    }
  };

  const handleEditEventClick = (ev: PracticeEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(ev.id);
    setSelectedDateForAdd(ev.date);
    setNewEventTitle(ev.title);
    setNewEventLoc(ev.location);
    setNewEventTime(ev.time);
    setNewEventAttendance(ev.needsAttendance);
    setNewEventDeadline(ev.attendanceDeadline || '');
    setNewEventRecurrence('none');
  };

  const handleDuplicateEventClick = (ev: PracticeEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(null); // Treat as new event
    setSelectedDateForAdd(ev.date);
    setNewEventTitle(`${ev.title} (複製)`);
    setNewEventLoc(ev.location);
    setNewEventTime(ev.time);
    setNewEventAttendance(ev.needsAttendance);
    setNewEventDeadline(ev.attendanceDeadline || '');
    setNewEventRecurrence('none');
  };

  // ── Profile Handlers ──
  const handleOpenProfile = (m: TeamMember) => {
    setViewingProfile(m);
  };

  const handleEditProfileInit = () => {
    const me = members.find(m => m.name === (myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎'));
    if (me) {
      setEditName(me.name);
      setEditAvatarBase64(me.avatarImage || null);
      setEditMessage(me.message || '');
      setIsEditingProfile(true);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('画像サイズは2MB以下にしてください');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditAvatarBase64(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
    
    setTeams(prev => prev.map(t => {
      if (t.id === currentTeamId) {
        return {
          ...t,
          members: t.members.map(m => m.name === myName ? {
            ...m,
            name: editName,
            avatarImage: editAvatarBase64 || undefined,
            message: editMessage,
            avatar: editAvatarBase64 ? editName.charAt(0) : m.avatar // keep original text logic if no image
          } : m)
        };
      }
      return t;
    }));
    
    setIsEditingProfile(false);
    showToast('プロフィールを更新しました');
    
    // Also update viewing profile if my profile was open
    if (viewingProfile?.name === myName) {
      setViewingProfile(members.find(m => m.name === myName) || null); // Note: members ref is old here, but modal will likely close or re-render
    }
  };

  const handleRoleChange = (targetName: string, newRole: Role) => {
    // Validation: Admin configuration block. Find current admins
    const currentAdmins = members.filter(m => m.role === 'admin');
    const targetMember = members.find(m => m.name === targetName);
    
    if (targetMember?.role === 'admin' && newRole !== 'admin' && currentAdmins.length <= 1) {
      showToast('チームには最低1人の指導者(admin)が必要です。');
      return;
    }

    setTeams(prev => prev.map(t => {
      if (t.id === currentTeamId) {
        return {
          ...t,
          members: t.members.map(m => m.name === targetName ? { ...m, role: newRole } : m)
        };
      }
      return t;
    }));
    setEditingRoleFor(null);
    showToast(`${targetName}の役割を変更しました`);

    // Update viewing profile role if open
    if (viewingProfile?.name === targetName) {
      setViewingProfile(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  // ── Radar Chart Component ──
  const RadarChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const keys = Object.keys(data);
    const size = 180;
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / keys.length;

    // Background polygons
    const bgPolys = [1, 0.75, 0.5, 0.25].map((scale, idx) => {
      const pts = keys.map((_, i) => {
        const x = center + radius * scale * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * scale * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
      }).join(' ');
      return <polygon key={idx} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
    });

    // Data polygon
    const dataPts = keys.map((key, i) => {
      const scale = data[key] / 5; // Assuming max lvl 5
      const x = center + radius * scale * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + radius * scale * Math.sin(i * angleStep - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative flex flex-col items-center">
        <svg width={size} height={size}>
          {bgPolys}
          {keys.map((key, i) => {
            const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
            // Label positions
            const lx = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
            const ly = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
            return (
              <g key={i}>
                <line x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" />
                <text x={lx} y={ly} fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="middle" dominantBaseline="middle">{key}</text>
              </g>
            );
          })}
          <polygon points={dataPts} fill="rgba(37, 99, 235, 0.2)" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    );
  };

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });

  const tabs = [
    { id: 'team' as const, label: 'チーム', icon: Users },
    { id: 'board' as const, label: '掲示板', icon: FileText },
    { id: 'calendar' as const, label: 'カレンダー', icon: Calendar },
    { id: 'chat' as const, label: 'チャット', icon: MessageSquare },
  ];

  const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
  const filteredChats = chats.filter(msg => {
    if (chatTarget === 'all') {
      return msg.targetId === 'all';
    } else if (chatTarget.startsWith('g-')) {
      return msg.targetId === chatTarget;
    } else {
      // DM: show messages in both directions
      return (msg.sender === myName && msg.targetId === chatTarget) ||
             (msg.sender === chatTarget && msg.targetId === myName);
    }
  });

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Team Selector & Join */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {teams.map(team => (
          <button key={team.id} onClick={() => { setCurrentTeamId(team.id); setChatTarget('all'); }}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-black transition-all border-2 ${
              currentTeamId === team.id ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-100 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}>
            {team.name}
          </button>
        ))}
        <button onClick={() => setIsJoinTeamMode(true)}
          className="whitespace-nowrap h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors shrink-0 px-3 text-xs font-bold">
          <Plus size={14}/> 参加
        </button>
        <button onClick={() => setIsCreateTeamMode(true)}
          className="whitespace-nowrap h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors shrink-0 px-3 text-xs font-bold">
          <Plus size={14}/> 作成
        </button>
      </div>

      {/* Role Selector (Demo Utility) */}
      <div className="bg-slate-100 p-2 rounded-xl flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-500 ml-2 uppercase">Role Demo:</span>
        <div className="flex gap-1">
          {(['admin', 'captain', 'member', 'parent'] as const).map(r => (
            <button key={r} onClick={() => setMyRole(r)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                myRole === r ? 'bg-white shadow-sm text-brand-blue' : 'text-slate-400 hover:text-slate-600'
              }`}
            >{roleConfig[r].label}</button>
          ))}
        </div>
      </div>

      {/* Sub Tab */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />{tab.label}
              {tab.id === 'chat' && chats.some(m => m.targetId === 'all' && m.id === '3') && <span className="w-2 h-2 bg-red-400 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* ─── TEAM TAB ─── */}
      {subTab === 'team' && (
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-brand-blue to-blue-900 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-1">{currentTeam.name}</h2>
              <p className="text-sm text-blue-200">{members.length}人のメンバー</p>
              <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <span className="text-xs text-blue-100">招待コード:</span>
                <span className="font-mono font-bold text-sm flex-1">{currentTeam.inviteCode}</span>
                <button onClick={handleCopyCode}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1"
                >
                  {codeCopied ? <><Check size={12}/> 完了</> : <><Copy size={12}/> コピー</>}
                </button>
              </div>
              {myRole === 'admin' && (
                <button onClick={() => {
                  if (teams.length <= 1) { showToast('最後のチームは削除できません'); return; }
                  setShowDeleteTeamConfirm(true);
                }}
                  className="mt-3 text-xs text-white/50 hover:text-red-300 transition-colors flex items-center gap-1 underline underline-offset-2">
                  <Trash2 size={12}/> このチームを削除
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">メンバー一覧</h3>
            </div>
            {members.map(m => {
              const rc = roleConfig[m.role];
              const RIcon = rc.icon;
              return (
                <div key={m.name} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                  <button onClick={() => handleOpenProfile(m)} className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-brand-blue/30 transition-all active:scale-95">
                    {m.avatarImage ? <img src={m.avatarImage} alt={m.name} className="w-full h-full object-cover"/> : m.avatar}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenProfile(m)} className="text-sm font-bold text-slate-800 hover:text-brand-blue hover:underline whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</button>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 whitespace-nowrap ${rc.color}`}>
                        <RIcon size={9}/> {rc.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => { setSubTab('chat'); setChatTarget(m.name); setChatViewMode('room'); }}
                      className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-full transition-all">
                      <MessageSquare size={16}/>
                    </button>
                    {/* Admin can view both Captain and Member notes. */}
                    {(myRole === 'admin' && (m.role === 'member' || m.role === 'captain')) && (
                      <button onClick={() => setViewingStudentNote(m.name)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100 whitespace-nowrap">
                        <FileText size={14}/> ノート閲覧
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── BOARD TAB ─── */}
      {subTab === 'board' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-brand-blue"/> 全体お知らせ</h3>
             {(myRole === 'admin' || myRole === 'captain') && (
               <button onClick={() => setIsNewPostModalOpen(true)} className="bg-brand-blue text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-blue-hover transition-colors flex items-center gap-1 shadow-sm">
                 <Edit2 size={14}/> 投稿する
               </button>
             )}
          </div>

          <div className="space-y-4">
            {currentTeam.boardPosts?.map(post => (
              <div key={post.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-50 flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {members.find(m => m.name === post.author)?.avatarImage ? 
                        <img src={members.find(m => m.name === post.author)?.avatarImage} alt="" className="w-full h-full object-cover rounded-full" /> : 
                        (members.find(m => m.name === post.author)?.avatar || post.author.charAt(0))
                      }
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{post.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-slate-600">{post.author}</span>
                        <span className="text-[10px] text-slate-400">{post.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="p-5">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  
                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                       {post.attachments.map((att, i) => (
                         <div key={i} onClick={() => handleAttachmentClick(att)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl max-w-sm hover:border-brand-blue/30 cursor-pointer transition-colors group">
                           {att.type === 'pdf' ? <FileText size={20} className="text-red-500 shrink-0"/> : 
                            att.type === 'image' ? <Image size={20} className="text-blue-500 shrink-0"/> : 
                            <FileText size={20} className="text-slate-400 shrink-0"/>}
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-700 truncate group-hover:text-brand-blue transition-colors">{att.name}</p>
                             {att.size && <p className="text-[10px] text-slate-400">{Math.round(att.size / 1024)} KB</p>}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}

                  {/* Voting */}
                  {post.voteOptions && post.voteOptions.length > 0 && (
                    <div className="mt-5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                         <div className="flex items-center gap-2">
                           <Check size={16} className="text-brand-blue"/>
                           <h5 className="text-sm font-bold text-slate-800">{post.surveyTitle || '参加アンケート'}</h5>
                           {post.isAnonymousVote && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">匿名</span>}
                         </div>
                         {post.voteDeadline && (
                           <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-md">
                             <span className="opacity-80">期限:</span>
                             {new Date(post.voteDeadline).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                             {new Date() > new Date(post.voteDeadline) && <span className="ml-1 bg-red-500 text-white px-1 py-0.5 rounded">終了</span>}
                           </div>
                         )}
                       </div>
                       
                       <div className="space-y-3">
                          {post.voteOptions.map(opt => {
                            const totalVotes = post.voteOptions!.reduce((sum, o) => sum + o.voterNames.length, 0);
                            const percent = totalVotes === 0 ? 0 : Math.round((opt.voterNames.length / totalVotes) * 100);
                            const isMyVote = opt.voterNames.includes(myName);
                            const isExpired = post.voteDeadline ? new Date() > new Date(post.voteDeadline) : false;

                            return (
                              <div key={opt.id} className="w-full relative flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleVote(post.id, opt.id)}
                                  disabled={isExpired}
                                  className={`w-full text-left relative overflow-hidden rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/30 group ${
                                    isMyVote ? 'border-brand-blue bg-white shadow-sm ring-1 ring-brand-blue/10' : 
                                    isExpired ? 'border-slate-200 bg-slate-50 opacity-80 cursor-not-allowed' : 
                                    'border-slate-200 bg-white hover:border-brand-blue hover:shadow-sm'
                                  }`}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-brand-blue/10 transition-all duration-500" style={{ width: `${percent}%` }} />
                                  <div className="relative px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                         isMyVote ? 'border-brand-blue bg-brand-blue text-white shadow-inner' : 
                                         isExpired ? 'border-slate-300 bg-slate-100' : 
                                         'border-slate-300 group-hover:border-brand-blue bg-white'
                                       }`}>
                                          <Check size={12} className={isMyVote ? "opacity-100" : "opacity-0"} strokeWidth={3} />
                                       </div>
                                       <span className={`text-sm font-bold ${isMyVote ? 'text-brand-blue' : isExpired ? 'text-slate-500' : 'text-slate-700'}`}>{opt.text}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 relative z-10">{opt.voterNames.length}人 <span className="text-[10px] opacity-70">({percent}%)</span></span>
                                  </div>
                                </button>
                                
                                {/* 投票者の表示 (匿名でない場合のみ) */}
                                {!post.isAnonymousVote && opt.voterNames.length > 0 && (
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      const sortedVoters = [...opt.voterNames].map(name => ({
                                        name,
                                        timestamp: opt.voteTimestamps?.[name]
                                      })).sort((a, b) => {
                                        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                                        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                                        return timeA - timeB; // 早い順（昇順）
                                      });
                                      setViewingVoters({ optionText: opt.text, voters: sortedVoters }); 
                                    }} 
                                    className="text-[11px] font-bold text-slate-500 hover:text-brand-blue flex items-center gap-1 self-end px-2 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg hover:border-brand-blue/30 transition-all"
                                  >
                                     <User size={12} className="text-brand-blue"/> 投票者 ({opt.voterNames.length}人) を見る
                                  </button>
                                )}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CALENDAR TAB ─── */}
      {subTab === 'calendar' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); setEventFilterQuery(''); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"><ChevronLeft size={18}/></button>
            <span className="font-bold text-slate-800">{calYear}年 {calMonth+1}月</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); setEventFilterQuery(''); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"><ChevronRight size={18}/></button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] text-slate-400 mb-4 text-center">📅 日付をタップして新規練習予定を追加（指導者・部長のみ）</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
              {['日','月','火','水','木','金','土'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <span key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const hasEv = monthEvents.some(e => e.date === dStr);
                const isT = dStr === fmtDate(todayDate);
                const canAdd = myRole === 'admin' || myRole === 'captain';
                
                return (
                  <button key={day} 
                    disabled={!canAdd}
                    onClick={() => setSelectedDateForAdd(dStr)}
                    className={`w-9 h-9 flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative ${
                    isT ? 'bg-brand-blue text-white' : hasEv ? 'bg-blue-50 text-brand-blue font-black ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                    {day}
                    {hasEv && !isT && <span className="absolute bottom-1.5 w-1 h-1 bg-brand-blue rounded-full" />}
                  </button>
                );
              })}
            </div>

          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="font-bold text-slate-800 text-sm">練習予定</h3>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input type="text" value={eventFilterQuery} onChange={e => setEventFilterQuery(e.target.value)}
                  placeholder="名前で検索..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all" />
              </div>
            </div>
            {monthEvents.filter(ev => !eventFilterQuery || ev.title.toLowerCase().includes(eventFilterQuery.toLowerCase())).map((ev) => {
              const d = new Date(ev.date);
              const dayL = ['日','月','火','水','木','金','土'][d.getDay()];
              const myAtt = myAttendance[ev.date] || null;
              return (
                <div key={ev.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative group animate-in fade-in transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 text-sm">{d.getMonth()+1}/{d.getDate()} ({dayL})</span>
                        <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-lg">{ev.title}</span>
                        {ev.recurrenceGroupId && <Repeat size={10} className="text-slate-400"/>}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ev.time}</span>
                    </div>
                    {ev.date === fmtDate(todayDate) && <span className="text-[9px] font-black bg-brand-blue text-white px-2 py-0.5 rounded-full">TODAY</span>}
                    
                    {/* Admin/Captain controls */}
                    {(myRole === 'admin' || myRole === 'captain') && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleDuplicateEventClick(ev, e)} 
                          className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-slate-100 shadow-sm"
                          title="予定を複製">
                          <CopyPlus size={14}/>
                        </button>
                        <button onClick={(e) => handleEditEventClick(ev, e)} 
                          className="p-2 bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all border border-slate-100 shadow-sm"
                          title="予定を編集">
                          <Edit2 size={14}/>
                        </button>
                        <button onClick={(e) => handleDeleteEvent(ev, e)} 
                          className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 shadow-sm"
                          title="予定を削除">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={12} className="text-slate-400"/> {ev.location}
                  </div>
                  
                  {ev.needsAttendance && (
                  <div className="flex gap-2">
                    {(['present', 'absent', 'late'] as const).map(s => {
                      const cfg = { present: { l: '出席', c: 'bg-green-500 text-white', tc: 'text-green-600' }, absent: { l: '欠席', c: 'bg-red-500 text-white', tc: 'text-red-600' }, late: { l: '遅刻', c: 'bg-yellow-500 text-white', tc: 'text-yellow-600' } };
                      const sel = myAtt === s;
                      const isExpired = ev.attendanceDeadline ? new Date() > new Date(ev.attendanceDeadline) : false;
                      // Extract names for this status
                      const names = Object.entries(ev.attendance)
                        .filter(([_, status]) => status === s)
                        .map(([name]) => name);
                      // Include "Me" if selected
                      const myN = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                      if (myAtt === s && !names.includes(myN)) names.push(myN + ' (自分)');

                      return (
                        <div key={s} className="flex-1 flex flex-col gap-1.5">
                          <button onClick={() => handleAttendanceVote(ev.id, s)} disabled={isExpired}
                            className={`w-full py-1.5 rounded-xl text-[10px] font-bold transition-all border ${sel ? cfg[s].c : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'} ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >{cfg[s].l}</button>
                          {names.length > 0 && (
                            <button onClick={(e) => {
                               e.stopPropagation();
                               const sortedVoters = names.map(name => {
                                  const realName = name.replace(' (自分)', '');
                                  return {
                                    name: realName,
                                    timestamp: ev.attendanceTimestamps?.[realName] || (name.includes('自分') ? new Date().toISOString() : undefined)
                                  };
                               }).sort((a,b) => {
                                  const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                                  const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                                  return timeA - timeB; // 早い順
                               });
                               setViewingVoters({ optionText: `${ev.title} (${cfg[s].l})`, voters: sortedVoters });
                            }} className={`w-full text-[10px] py-1 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm font-bold hover:text-brand-blue hover:border-brand-blue/30 transition-all flex items-center justify-center gap-1 ${cfg[s].tc}`}>
                               <User size={10}/> 投票者 ({names.length}人)
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Event Comments Section */}
                  <div className="pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <MessageSquare size={12} className="text-slate-400"/>
                      <span className="text-[10px] font-bold text-slate-500">コメント ({ev.comments.length})</span>
                    </div>
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto no-scrollbar">
                      {ev.comments.map(c => (
                        <div key={c.id} className="flex gap-2 bg-slate-50/50 p-2 rounded-lg animate-in fade-in">
                          <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0">{c.avatar}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] font-bold text-slate-600">{c.sender}</span>
                              <span className="text-[8px] text-slate-400">{c.time}</span>
                            </div>
                            <p className="text-[10px] text-slate-700 leading-normal">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" 
                        value={eventCommentInput[ev.id] || ''} 
                        onChange={e => setEventCommentInput(prev => ({ ...prev, [ev.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment(ev.id); }}
                        placeholder="予定へのコメント..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-blue" />
                      <button onClick={() => handleAddComment(ev.id)}
                        className="w-8 h-8 bg-brand-blue text-white rounded-lg flex items-center justify-center hover:bg-brand-blue-hover transition-colors">
                        <Plus size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CHAT TAB ─── */}
      {subTab === 'chat' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {chatViewMode === 'list' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-1 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => { setIsGroupMode(true); }}
                className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 shadow-sm flex items-center gap-1.5 hover:text-brand-blue border border-slate-200 transition-all active:scale-95">
                <Plus size={14}/> グループ作成
              </button>
              <div className="w-[1px] h-4 bg-slate-300 mx-1 shrink-0" />
              <button onClick={() => { setChatTarget('all'); setChatViewMode('room'); }}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:bg-slate-50`}>
                チーム全体
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative" style={{ height: '65vh' }}>
            {/* 1. List View (LINE style) */}
            {chatViewMode === 'list' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm">メッセージ</h3>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {/* Groups Section */}
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Groups</p>
                  </div>
                  {/* Team-wide Chat */}
                  {(() => {
                    const teamMsgs = chats.filter(m => m.targetId === 'all');
                    const latestTeamMsg = teamMsgs.slice(-1)[0];
                    return (
                      <div onClick={() => { setChatTarget('all'); setChatViewMode('room'); }}
                        className="flex items-center gap-4 p-4 mx-2 rounded-2xl hover:bg-blue-50 cursor-pointer transition-all active:scale-95 group border border-blue-100 bg-blue-50/30 mb-1">
                        <div className="w-12 h-12 bg-brand-blue text-white rounded-full flex items-center justify-center">
                          <Users size={20}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-bold text-slate-800 text-sm truncate">チーム全体</h4>
                            <span className="text-[10px] text-slate-400">{latestTeamMsg ? latestTeamMsg.time : ''}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {latestTeamMsg ? `${latestTeamMsg.sender}: ${latestTeamMsg.text}` : 'チーム全員とチャット'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  {groups.slice().sort((a, b) => { // Sort by latest message
                    const aMsg = chats.filter(m => m.targetId === a.id).slice(-1)[0];
                    const bMsg = chats.filter(m => m.targetId === b.id).slice(-1)[0];
                    const aTime = aMsg ? new Date(`1970/01/01 ${aMsg.time}`).getTime() : 0;
                    const bTime = bMsg ? new Date(`1970/01/01 ${bMsg.time}`).getTime() : 0;
                    return bTime - aTime;
                  }).map(g => {
                    const latestMsg = chats.filter(m => m.targetId === g.id).slice(-1)[0];
                    return (
                      <div key={g.id} onClick={() => { setChatTarget(g.id); setChatViewMode('room'); }}
                        className="flex items-center gap-4 p-4 mx-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all active:scale-95 group">
                        <div className="w-12 h-12 bg-blue-100 text-brand-blue rounded-full flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                          <Users size={20}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{g.name}</h4>
                            <span className="text-[10px] text-slate-400">{latestMsg ? latestMsg.time : `参加: ${g.participants.length}人`}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {latestMsg ? latestMsg.text : '新しくグループが作成されました'}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Members Section */}
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Friends</p>
                  </div>
                  {members.filter(m => {
                    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                    return m.name !== myName;
                  }).slice().sort((a, b) => { // Sort by latest message
                    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                    const aMsg = chats.filter(msg => (msg.sender === a.name && msg.targetId === myName) || (msg.sender === myName && msg.targetId === a.name)).slice(-1)[0];
                    const bMsg = chats.filter(msg => (msg.sender === b.name && msg.targetId === myName) || (msg.sender === myName && msg.targetId === b.name)).slice(-1)[0];
                    const aTime = aMsg ? new Date(`1970/01/01 ${aMsg.time}`).getTime() : 0;
                    const bTime = bMsg ? new Date(`1970/01/01 ${bMsg.time}`).getTime() : 0;
                    return bTime - aTime;
                  }).map(m => {
                    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                    const latestMsg = chats.filter(msg => (msg.sender === m.name && msg.targetId === myName) || (msg.sender === myName && msg.targetId === m.name)).slice(-1)[0];
                    return (
                      <div key={m.name} onClick={() => { setChatTarget(m.name); setChatViewMode('room'); }}
                        className="flex items-center gap-4 p-4 mx-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all active:scale-95 group">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm relative">
                          {m.avatar}
                          {!latestMsg && <span className="absolute top-0 right-0 w-3 h-3 bg-red-400 border-2 border-white rounded-full"></span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{m.name}</h4>
                            <span className="text-[10px] text-slate-400">{latestMsg ? latestMsg.time : m.role.toUpperCase()}</span>
                          </div>
                          <p className={`text-xs truncate ${!latestMsg ? 'text-brand-blue font-bold opacity-80' : 'text-slate-500'}`}>
                            {latestMsg ? latestMsg.text : 'メッセージを送ってトークを開始'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Chat Room View */}
            {chatViewMode === 'room' && (
              <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
                  <button onClick={() => setChatViewMode('list')} className="p-2 -ml-2 text-slate-400 hover:text-brand-blue transition-colors">
                    <ChevronLeft size={24}/>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 truncate">
                      {chatTarget === 'all' && <Users size={14} className="text-brand-blue"/>}
                      {chatTarget === 'all' ? 'チーム全体チャット' : 
                       chatTarget.startsWith('g-') ? groups.find(g=>g.id===chatTarget)?.name : 
                       chatTarget}
                    </h3>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#7494C0]/20 no-scrollbar">
                  {filteredChats.map(m => {
                    const isMe = m.sender === (myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎');
                    return (
                      <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && (
                          <div className="w-8 h-8 bg-slate-700 shadow-sm rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 self-start mt-1">
                            {m.sender.charAt(0)}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && chatTarget === 'all' && <span className="text-[10px] font-bold text-slate-600 mb-0.5 ml-1 drop-shadow-sm">{m.sender}</span>}
                          <div className={`p-3 text-sm shadow-sm relative ${
                            isMe 
                              ? 'bg-[#8de055] text-slate-900 rounded-3xl rounded-tr-md' 
                              : 'bg-white text-slate-800 rounded-3xl rounded-tl-md'
                          }`}>
                            {m.mediaUrl && m.mediaType === 'image' && (
                              <img src={m.mediaUrl} alt="共有画像" className="rounded-xl mb-2 max-w-full max-h-48 object-cover" />
                            )}
                            {m.mediaUrl && m.mediaType === 'video' && (
                              <video src={m.mediaUrl} controls className="rounded-xl mb-2 max-w-full max-h-48" />
                            )}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="flex flex-col gap-1 mb-2">
                                {m.attachments.map((att, i) => (
                                  <div key={i} onClick={() => handleAttachmentClick(att)} className={`flex items-center gap-2 px-2 py-1.5 rounded bg-white/50 border max-w-xs cursor-pointer hover:bg-white/70 transition-colors ${isMe ? 'border-green-600/20' : 'border-slate-200'}`}>
                                    <FileText size={16} className={att.type === 'pdf' ? 'text-red-500 shrink-0' : 'text-slate-500 shrink-0'}/>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                                      {att.size && <p className="text-[9px] text-slate-500">{Math.round(att.size / 1024)} KB</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {m.text && <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</span>}
                          </div>
                        </div>
                        <span className={`text-[9px] text-slate-500 font-bold self-end mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{m.time}</span>
                      </div>
                    );
                  })}
                  {filteredChats.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                      <MessageSquare size={48} strokeWidth={1}/>
                      <p className="text-xs font-bold">まだメッセージはありません</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex gap-2 items-end">
                    <div className="flex gap-1">
                      <label className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue/30 transition-all cursor-pointer" title="画像を送信">
                        <Image size={18}/>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleSendChat(reader.result as string, 'image');
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }} />
                      </label>
                      <label className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all cursor-pointer" title="動画を送信">
                        <Video size={18}/>
                        <input type="file" accept="video/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleSendChat(reader.result as string, 'video');
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }} />
                      </label>
                      <label className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 transition-all cursor-pointer" title="ファイルを送信">
                        <Plus size={18}/>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const newMsg: ChatMsg = {
                                id: `c-${Date.now()}`,
                                sender: myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎',
                                targetId: chatTarget,
                                text: '',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                attachments: [{
                                  name: file.name,
                                  type: file.name.endsWith('.pdf') ? 'pdf' : 'file',
                                  url: reader.result as string,
                                  size: file.size
                                }]
                              };
                              setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, chats: [...t.chats, newMsg] } : t));
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }} />
                      </label>
                    </div>
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                      placeholder="メッセージを入力..."
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue/30 transition-all outline-none shadow-inner" />
                    <button onClick={() => handleSendChat()} disabled={!chatInput.trim()}
                      className="w-12 h-12 bg-brand-blue text-white rounded-2xl shadow-md flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100">
                      <Send size={18} className="translate-x-[1px] translate-y-[1px]"/>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Group Selection Overlay Panel */}
            {isGroupMode && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 animate-in fade-in slide-in-from-top-4 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">グループメンバーを選択</h3>
                    <p className="text-xs text-slate-500">トークを開始したいメンバーにチェックを入れてください</p>
                  </div>
                  <button onClick={() => setIsGroupMode(false)} className="p-2 text-slate-400"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-6 no-scrollbar">
                  {members.filter(m => {
                    const myName = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                    return m.name !== myName;
                  }).map(m => {
                    const isSel = selectedGroupMembers.includes(m.name);
                    return (
                      <div key={m.name} onClick={() => setSelectedGroupMembers(prev => isSel ? prev.filter(n => n !== m.name) : [...prev, m.name])}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSel ? 'bg-blue-50 border-brand-blue shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-xs">{m.avatar}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{m.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black opacity-60">{m.role}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSel ? 'bg-brand-blue border-brand-blue text-white shadow-inner' : 'border-slate-200'
                        }`}>
                          {isSel && <Check size={14} strokeWidth={4}/>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => { handleCreateGroup(); setChatViewMode('room'); }}
                  disabled={selectedGroupMembers.length < 1}
                  className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">
                  {selectedGroupMembers.length > 0 ? `${selectedGroupMembers.length}人でトークを開始` : 'メンバーを選択してください'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: Add Event ─── */}
      {selectedDateForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setSelectedDateForAdd(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20}/>
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-brand-blue"/> 練習予定を追加
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><FileText size={12}/> 予定名</label>
                <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="例：通常練習、合宿、遠征"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> 日付</label>
                <input type="date" value={selectedDateForAdd} onChange={e => setSelectedDateForAdd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><ClockIcon size={12}/> 時間</label>
                <input type="text" value={newEventTime} onChange={e => setNewEventTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><MapPin size={12}/> 場所</label>
                <input type="text" value={newEventLoc} onChange={e => setNewEventLoc(e.target.value)} placeholder="例：中央テニスコート 3,4番"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>

              {/* Recurrence feature (Only for new events) */}
              {!editingEventId && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Repeat size={12}/> 繰り返し設定</label>
                  <div className="flex flex-col gap-2">
                    <select value={newEventRecurrence} onChange={e => setNewEventRecurrence(e.target.value as 'none'|'daily'|'weekly'|'monthly')}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue">
                      <option value="none">繰り返さない</option>
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                    </select>
                    {newEventRecurrence !== 'none' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-slate-500 w-12 text-right">終了日:</span>
                        <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)}
                          min={selectedDateForAdd}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    )}
                  </div>
                  {newEventRecurrence !== 'none' && recurrenceEndDate && (
                    <p className="text-[10px] text-brand-blue px-1">{recurrenceEndDate} まで、指定の頻度で繰り返し予定を作成します。</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 cursor-pointer">
                <div className="flex items-center justify-between" onClick={() => setNewEventAttendance(!newEventAttendance)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${newEventAttendance ? 'bg-brand-blue border-brand-blue text-white' : 'bg-white border-slate-200'}`}>
                      {newEventAttendance && <Check size={14} strokeWidth={4}/>}
                    </div>
                    <span className="text-xs font-bold text-slate-700">出欠投票を行う</span>
                  </div>
                  <Users size={16} className="text-brand-blue opacity-50"/>
                </div>
                {newEventAttendance && (
                  <div className="pt-2 border-t border-blue-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><ClockIcon size={12}/> 出欠回答期限</span>
                    <input type="datetime-local" value={newEventDeadline} onChange={e => setNewEventDeadline(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                )}
              </div>

              <button onClick={handleAddEvent}
                className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover transition-all mt-2 shadow-sm active:scale-95">
                {editingEventId ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Student Note View (指導者のみ) ─── */}
      {viewingStudentNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-50 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative h-[80vh] flex flex-col animate-in slide-in-from-bottom-4">
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-black">{viewingStudentNote.charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-slate-800">{viewingStudentNote} のテニスノート</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Student Progress View</p>
                </div>
              </div>
              <button onClick={() => setViewingStudentNote(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const sampleNotes = [
                  { id: 'sn-1', date: '2026-03-13', keep: '今日はサーブの確率が上がった。トスの位置を意識した。', problem: 'リターンの構えが遅い。', tryItem: 'リターンの足の運びを意識する' },
                  { id: 'sn-2', date: '2026-03-12', keep: 'ポーチの飛び出しが早くなった。打点が前で捉えられている。', problem: 'バックでの展開球が浅くなりがち。', tryItem: 'バックの体重移動を意識する' },
                  { id: 'sn-3', date: '2026-03-10', keep: 'フットワークが安定してきた。', problem: 'サーブのトスが安定しない。', tryItem: '左手のリリースポイントを固定する' },
                ];
                const selectedNote = sampleNotes[selectedNoteIdx] || sampleNotes[0];

                return (
                  <>
                    {/* Note Date Tabs */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ノートを選択</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {sampleNotes.map((n, i) => (
                          <button key={n.id} onClick={() => setSelectedNoteIdx(i)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                              selectedNoteIdx === i
                                ? 'bg-brand-blue text-white shadow-md'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}>
                            {n.date}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Student Goals */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">🎯 目標管理</p>
                      {[
                        { label: '短期目標', goal: 'サーブの確率を80%以上にする', achievement: 3 },
                        { label: '中期目標', goal: '県大会ベスト8入り', achievement: 2 },
                        { label: '長期目標', goal: 'インターハイ出場', achievement: 1 },
                      ].map((g, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{g.label}</span>
                            <span className="text-[10px] font-bold text-slate-500">{g.achievement}/5</span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{g.goal}</p>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= g.achievement ? 'bg-brand-blue' : 'bg-slate-100'}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Radar Chart */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <p className="text-xs font-bold text-slate-600 mb-4 self-start">技術レーダーチャート</p>
                      <RadarChart data={{
                        'フォア': 4, 'バック': 3, 'ボレー': 4,
                        'サーブ': 2, 'フット': 5, '戦術': 3
                      }} />
                    </div>

                    {/* Selected Note Content */}
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-2xl border-l-4 border-green-400 shadow-sm">
                        <p className="text-[10px] font-bold text-green-600 mb-1 uppercase">✅ Keep ({selectedNote.date})</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{selectedNote.keep}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border-l-4 border-red-400 shadow-sm">
                        <p className="text-[10px] font-bold text-red-500 mb-1 uppercase">⚠️ Problem</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{selectedNote.problem}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border-l-4 border-blue-400 shadow-sm">
                        <p className="text-[10px] font-bold text-brand-blue mb-1 uppercase">🚀 Try</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{selectedNote.tryItem}</p>
                      </div>
                    </div>

                    {/* Coach Comment Section */}
                    <div className="bg-white p-4 rounded-3xl border border-blue-100 space-y-3">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Shield size={14} className="text-brand-blue"/> 指導コメントを入力</p>
                      <textarea
                        value={coachCommentText}
                        onChange={e => setCoachCommentText(e.target.value)}
                        placeholder="フィードバックやアドバイスを入力してください..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs h-20 resize-none focus:outline-none focus:border-blue-300" />

                      {/* URL Attachments */}
                      {coachCommentUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {coachCommentUrls.map((url, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1.5 rounded-lg text-[10px] font-medium">
                              <Link size={10} />
                              <span className="max-w-[150px] truncate">{(() => { try { return new URL(url).hostname; } catch { return url; } })()}</span>
                              <button onClick={() => setCoachCommentUrls(prev => prev.filter((_, j) => j !== i))} className="text-indigo-400 hover:text-red-500"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* URL Input */}
                      <div className="flex gap-2">
                        <input
                          value={coachUrlInput}
                          onChange={e => setCoachUrlInput(e.target.value)}
                          placeholder="YouTube・InstagramのURLを添付"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-indigo-300"
                        />
                        <button
                          onClick={() => {
                            if (!coachUrlInput.trim()) return;
                            setCoachCommentUrls(prev => [...prev, coachUrlInput.trim()]);
                            setCoachUrlInput('');
                          }}
                          className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-600 transition-colors flex items-center gap-1"
                        >
                          <Link size={10} /> URL追加
                        </button>
                      </div>

                      <button className="w-full py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue-hover transition-colors"
                        onClick={() => {
                          alert(`${viewingStudentNote}の ${selectedNote.date} のノートにコメントを送信しました${coachCommentUrls.length > 0 ? `（URL ${coachCommentUrls.length}件添付）` : ''}`);
                          setCoachCommentText('');
                          setCoachCommentUrls([]);
                        }}>コメントを送信（フィードバック）</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}


      {/* ─── MODAL: Join Team ─── */}
      {isJoinTeamMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setIsJoinTeamMode(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20}/>
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Users size={20} className="text-brand-blue"/> チームに参加
            </h3>
            <p className="text-xs text-slate-500 mb-6">指導者から配布された招待コードを入力してください。</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invitation Code</label>
                <input type="text" value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="NX-XXXX-XXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
              <button onClick={handleJoinTeam}
                className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover shadow-lg shadow-blue-100 active:scale-95 transition-all">
                参加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Create Team ─── */}
      {isCreateTeamMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setIsCreateTeamMode(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20}/>
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Plus size={20} className="text-brand-blue"/> チームを作成
            </h3>
            <p className="text-xs text-slate-500 mb-6">新しいチームを作成し、メンバーを招待しましょう。</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Name</label>
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="例: ○○中学校ソフトテニス部"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
              <button onClick={() => {
                if (!newTeamName.trim()) return;
                const newId = `team-${Date.now()}`;
                const myN = myRole === 'admin' ? '上見 宏彰' : '鈴木 太郎';
                const myAv = myRole === 'admin' ? 'N' : '鈴';
                setTeams(prev => [...prev, { id: newId, name: newTeamName.trim(), inviteCode: `NX-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, members: [{ name: myN, role: 'admin', avatar: myAv }], events: [], chats: [], groups: [], boardPosts: [] }]);
                setCurrentTeamId(newId);
                setNewTeamName('');
                setIsCreateTeamMode(false);
                showToast(`チーム「${newTeamName.trim()}」を作成しました！`);
              }}
                disabled={!newTeamName.trim()}
                className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50">
                チームを作成する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Team Confirm ─── */}
      {showDeleteTeamConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={24} className="text-red-500"/>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">チームを削除</h3>
            <p className="text-sm text-slate-500 mb-6">チーム「{currentTeam.name}」を削除しますか？<br/>この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteTeamConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                const remaining = teams.filter(t => t.id !== currentTeamId);
                setTeams(remaining);
                setCurrentTeamId(remaining[0]?.id || '');
                setShowDeleteTeamConfirm(false);
                showToast('チームを削除しました');
              }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Event Confirm ─── */}
      {eventToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={24} className="text-red-500"/>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">予定イベントの削除</h3>
            {eventToDelete.recurrenceGroupId ? (
              <div className="mb-6 space-y-4">
                <p className="text-sm text-slate-500">この予定は繰り返しの設定がされています。削除方法を選択してください。</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="deleteMode" value="single" className="w-4 h-4 text-brand-blue"
                      checked={deleteMode === 'single'} onChange={() => setDeleteMode('single')} />
                    <span className="text-sm font-bold text-slate-700">この予定のみ削除</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="deleteMode" value="future" className="w-4 h-4 text-brand-blue"
                      checked={deleteMode === 'future'} onChange={() => setDeleteMode('future')} />
                    <span className="text-sm font-bold text-slate-700">これ以降の繰り返し予定を削除</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="deleteMode" value="all" className="w-4 h-4 text-brand-blue"
                      checked={deleteMode === 'all'} onChange={() => setDeleteMode('all')} />
                    <span className="text-sm font-bold text-slate-700">すべての繰り返し予定を削除</span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-6">本当にこの練習予定を削除しますか？<br/>この操作は取り消すことができません。</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setEventToDelete(null)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">キャンセル</button>
              <button onClick={confirmDeleteEvent}
                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Profile View ─── */}
      {viewingProfile && !isEditingProfile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => { setViewingProfile(null); setEditingRoleFor(null); }}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="h-24 bg-gradient-to-br from-brand-blue flex items-center justify-center to-blue-900 relative">
               <button onClick={() => { setViewingProfile(null); setEditingRoleFor(null); }} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 rounded-full p-1"><X size={20}/></button>
            </div>
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-12 left-6 w-24 h-24 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-3xl text-white font-black overflow-hidden shadow-sm">
                 {viewingProfile.avatarImage ? <img src={viewingProfile.avatarImage} alt={viewingProfile.name} className="w-full h-full object-cover"/> : viewingProfile.avatar}
              </div>
              
              <div className="mt-14 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{viewingProfile.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleConfig[viewingProfile.role].color}`}>
                    {React.createElement(roleConfig[viewingProfile.role].icon, { size: 10 })} {roleConfig[viewingProfile.role].label}
                  </span>
                </div>
              </div>

              {viewingProfile.message ? (
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 relative">
                   <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{viewingProfile.message}</p>
                </div>
              ) : (
                <div className="mb-6"/>
              )}

              <div className="space-y-3 mt-2">
                {viewingProfile.name !== myName ? (
                  <button onClick={() => { setSubTab('chat'); setChatTarget(viewingProfile.name); setChatViewMode('room'); setViewingProfile(null); }}
                    className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover transition-all shadow-sm flex items-center justify-center gap-2">
                    <MessageSquare size={18}/> メッセージを送る
                  </button>
                ) : (
                  <button onClick={handleEditProfileInit}
                    className="w-full bg-slate-100 text-slate-700 rounded-xl py-3.5 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Edit2 size={18}/> プロフィールを編集
                  </button>
                )}
                
                {/* Admin Role Editor */}
                {myRole === 'admin' && viewingProfile.name !== myName && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Shield size={12}/> 管理者メニュー</p>
                    {editingRoleFor === viewingProfile.name ? (
                      <div className="flex gap-2">
                         {(['admin', 'captain', 'member', 'parent'] as const).map(r => (
                           <button key={r} onClick={() => handleRoleChange(viewingProfile.name, r)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${viewingProfile.role === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                              {roleConfig[r].label}
                           </button>
                         ))}
                      </div>
                    ) : (
                      <button onClick={() => setEditingRoleFor(viewingProfile.name)}
                        className="w-full bg-white border border-slate-200 text-slate-600 rounded-xl py-2.5 text-xs font-bold hover:bg-slate-50 transition-all">
                        役職を変更する
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Edit Profile ─── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsEditingProfile(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">プロフィール編集</h3>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-slate-100 border text-3xl font-black text-slate-400 flex items-center justify-center overflow-hidden relative group">
                   {editAvatarBase64 ? <img src={editAvatarBase64} alt="Avatar" className="w-full h-full object-cover"/> : <span className="group-hover:opacity-0 group-active:opacity-0 transition-opacity">{editName.charAt(0) || <User size={40}/>}</span>}
                   
                   <label className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 cursor-pointer transition-all">
                      <Image size={32} className="mb-1 drop-shadow-md"/>
                      <span className="text-xs font-bold drop-shadow-md">画像を変更</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                   </label>
                </div>
                {editAvatarBase64 && (
                  <button onClick={() => setEditAvatarBase64(null)} className="text-[10px] text-red-500 mt-2 hover:underline">画像を削除</button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1">名前</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1 flex items-center justify-between">
                  ひとこと・自己紹介
                  <span className={`text-[10px] ${editMessage.length > 50 ? 'text-red-500' : 'text-slate-400'}`}>{editMessage.length}/50</span>
                </label>
                <textarea value={editMessage} onChange={e => setEditMessage(e.target.value.slice(0, 50))}
                  placeholder="目標やプレースタイルなどを入力"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>

              <button onClick={handleSaveProfile} disabled={!editName.trim()}
                className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2">
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />

      {/* ─── MODAL: Board Post ─── */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsNewPostModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800">全体お知らせを投稿</h3>
              <button onClick={() => setIsNewPostModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 no-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1">タイトル</label>
                <input type="text" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)}
                  placeholder="タイトルを入力"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 ml-1">本文</label>
                <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                  placeholder="お知らせの詳しい内容を入力"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-600">添付ファイル</label>
                  <label className="text-[10px] font-bold text-brand-blue bg-blue-50 px-2 py-1 rounded-md cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1">
                    <Plus size={12}/> 追加
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => {
                       const files = Array.from(e.target.files || []);
                       files.forEach(f => {
                         const reader = new FileReader();
                         reader.onload = () => {
                           setNewPostAttachments(prev => [...prev, { name: f.name, type: f.name.endsWith('.pdf') ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'file', url: reader.result as string, size: f.size }]);
                         };
                         reader.readAsDataURL(f);
                       });
                       e.target.value = '';
                    }} />
                  </label>
                </div>
                {newPostAttachments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {newPostAttachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 border rounded-xl">
                         <div className="flex items-center gap-2 min-w-0">
                           <FileText size={16} className="text-slate-400 shrink-0"/>
                           <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                         </div>
                         <button onClick={() => setNewPostAttachments(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-red-500"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between ml-1 mb-2">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-brand-blue"/>
                    <label className="text-xs font-bold text-slate-800">参加アンケート・投票 (任意)</label>
                  </div>
                  <button onClick={() => setNewPostVoteOptions(prev => [...prev, { id: `vo-${Date.now()}-${prev.length}`, text: '' }])} className="text-[10px] font-bold text-brand-blue bg-blue-50 px-2 py-1.5 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1">
                    <Plus size={12}/> 選択肢を追加
                  </button>
                </div>

                {newPostVoteOptions.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 ml-1">アンケート名</label>
                      <input type="text" value={newPostSurveyTitle} onChange={e => setNewPostSurveyTitle(e.target.value)}
                        placeholder="例：週末の合同練習会について"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">投票期限</label>
                        <input type="datetime-local" value={newPostVoteDeadline} onChange={e => setNewPostVoteDeadline(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                      </div>
                      <div className="flex items-center justify-end pt-5">
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <div className={`w-10 h-6 rounded-full transition-colors relative ${newPostIsAnonymous ? 'bg-brand-blue' : 'bg-slate-300'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${newPostIsAnonymous ? 'left-5' : 'left-1'}`} />
                           </div>
                           <span className="text-sm font-bold text-slate-700 group-hover:text-brand-blue transition-colors">匿名投票にする</span>
                           <input type="checkbox" checked={newPostIsAnonymous} onChange={e => setNewPostIsAnonymous(e.target.checked)} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <label className="text-xs font-bold text-slate-600 ml-1">選択肢</label>
                      {newPostVoteOptions.map((opt, i) => (
                         <div key={opt.id} className="flex items-center gap-2">
                           <input type="text" value={opt.text} onChange={e => setNewPostVoteOptions(prev => prev.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o))}
                             placeholder={`選択肢 ${i + 1} (例：参加する)`} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" />
                           <button onClick={() => setNewPostVoteOptions(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={16}/></button>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0">
              <button onClick={handleCreatePost} disabled={!newPostTitle.trim() || !newPostContent.trim()}
                className="w-full bg-brand-blue text-white rounded-xl py-3.5 font-bold hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                投稿する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Voters Modal */}
      {viewingVoters && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Check size={16} className="text-brand-blue"/>「{viewingVoters.optionText}」の投票者
              </h3>
              <button onClick={() => setViewingVoters(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto no-scrollbar pb-4 space-y-1">
              {viewingVoters.voters.map((voterObj, index) => {
                const voter = voterObj.name;
                const voterMember = teamMembersMap[voter];
                const initialLabel = voterMember?.avatar || voter.charAt(0);
                const timeStr = voterObj.timestamp ? new Date(voterObj.timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={voter} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer" onClick={() => {
                    if (voterMember) {
                      setViewingProfile(voterMember);
                      setViewingVoters(null);
                    }
                  }}>
                    <div className="w-5 text-center shrink-0">
                      <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shadow-inner shrink-0 leading-none">
                      {initialLabel}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{voter}</p>
                      {voterMember && <p className="text-[10px] text-brand-blue font-bold">{roleConfig[voterMember.role].label}</p>}
                    </div>
                    {timeStr && (
                      <div className="ml-auto text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {timeStr}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
