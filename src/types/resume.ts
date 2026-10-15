export interface ResumeFrontmatter {
  name: string;
  title: string;
  contact: string;
  image?: string;
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
