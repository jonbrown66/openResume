export type ResumeSectionType = 'experience' | 'education' | 'project' | 'skill' | 'custom';

export interface ResumeFrontmatter {
  name: string;
  title: string;
  contact: string;
  image?: string;
  /** Opaque source lines; never evaluated as YAML or assigned as object keys. */
  sourceLines?: string[];
}

export interface ResumeEntry {
  id?: string;
  heading: string;
  meta: string;
  organization: string;
  content: string;
}

export interface ResumeSection {
  id?: string;
  type?: ResumeSectionType;
  title: string;
  content: string;
  entries: ResumeEntry[];
}

export interface ResumeDraft {
  frontmatter: ResumeFrontmatter;
  summary: string;
  summaryTitle?: string;
  sections: ResumeSection[];
}
