export interface CategoryConfig {
  label: string;
  color: string;
  bg: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'Tümü': {
    label: 'Tümü',
    color: '#C8F135',
    bg: 'rgba(200,241,53,0.1)',
  },
  'Kod & Teknik': {
    label: 'Kod & Teknik',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
  },
  'Tasarım & Görsel': {
    label: 'Tasarım & Görsel',
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.15)',
  },
  'Analiz & Araştırma': {
    label: 'Analiz & Araştırma',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
  },
  'Yazma & İçerik Üretimi': {
    label: 'Yazma & İçerik Üretimi',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
  },
  'Yaratıcılık & Fikir Üretimi': {
    label: 'Yaratıcılık & Fikir Üretimi',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.15)',
  },
  'İş & Strateji': {
    label: 'İş & Strateji',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.15)',
  },
  'Pazarlama & Sosyal Medya': {
    label: 'Pazarlama & Sosyal Medya',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.15)',
  },
  'Eğitim & Öğrenme': {
    label: 'Eğitim & Öğrenme',
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.15)',
  },
  'Sistem Promptları & Persona': {
    label: 'Sistem Promptları & Persona',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)',
  },
  'Verimlilik & Zaman Yönetimi': {
    label: 'Verimlilik & Zaman Yönetimi',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.15)',
  },
  'Kişisel Gelişim': {
    label: 'Kişisel Gelişim',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.15)',
  },
  'Diğer': {
    label: 'Diğer',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.15)',
  },
};

export const ALL_CATEGORIES: string[] = [
  'Tümü',
  'Kod & Teknik',
  'Tasarım & Görsel',
  'Analiz & Araştırma',
  'Yazma & İçerik Üretimi',
  'Yaratıcılık & Fikir Üretimi',
  'İş & Strateji',
  'Pazarlama & Sosyal Medya',
  'Eğitim & Öğrenme',
  'Sistem Promptları & Persona',
  'Verimlilik & Zaman Yönetimi',
  'Kişisel Gelişim',
  'Diğer',
];
