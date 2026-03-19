export interface PromptMeta {
  id: string;
  title_tr: string;
  title_original: string;
  category: string;
  tags: string[];
  description_tr: string;
  use_case_tr: string;
  quality_score: number;
  votes: number;
  author: string;
}

export type PromptTexts = Record<string, string>;
export type SortOption = 'default' | 'az' | 'quality' | 'votes';
export type QualityFilter = 'all' | '7plus' | '8plus';
