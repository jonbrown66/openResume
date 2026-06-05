export interface ResumeThemeConfig {
  primaryColor: string;
  secondaryColor: string;
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
  fontFamily: 'Geist',
  fontSize: 10,
  lineHeight: 1.5,
  sectionSpacing: 16,
  pageMargin: 20,
  customCss: '',
};
