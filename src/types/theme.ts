export interface ResumeThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  sectionSpacing: number;
  pageMargin: number;
  customCss: string;
}

export const DEFAULT_THEME_CONFIG: ResumeThemeConfig = {
  primaryColor: '#d48516',
  secondaryColor: '#404040',
  backgroundColor: '#ffffff',
  fontFamily: 'Geist',
  fontSize: 11,
  lineHeight: 1.4,
  sectionSpacing: 20,
  pageMargin: 12,
  customCss: '',
};
