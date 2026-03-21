import type { ResumeDraft } from './resume';
import type { ResumeThemeConfig } from './theme';
import type { ResumeTemplate } from '@/config/ui';

export interface ResumeProject {
  id: string;
  name: string;
  data: ResumeDraft;
  theme: ResumeThemeConfig;
  layout: LayoutConfig;
  templateId: ResumeTemplate;
  createdAt: number;
  updatedAt: number;
}

export interface LayoutConfig {
}

export interface StorageSchema {
  projects: ResumeProject[];
  currentProjectId: string | null;
}

export const STORAGE_KEY = 'resume_projects';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
