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
  authorId?: string;
  favoritesCount?: number;
  createdAt: string; // "YYYY-MM-DD"形式
  tags?: string[];
  youtubeUrl?: string;
  instagramUrl?: string;
}
