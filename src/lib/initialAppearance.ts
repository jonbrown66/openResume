// Runs before React. Browser-dependent <html> attributes are owned by this
// bootstrap and the appearance hooks; the server-rendered page shell stays deterministic.
export const initialAppearanceScript = `(() => {
  let settings;
  try { settings = JSON.parse(localStorage.getItem('myresume-settings-v1') || 'null'); } catch {}
  let systemDark = false;
  try { systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch {}
  const dark = settings?.theme === 'dark' || (settings?.theme !== 'light' && systemDark);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.lang = settings?.language === 'en' ? 'en' : 'zh-CN';
})();`;
