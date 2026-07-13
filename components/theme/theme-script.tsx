// Inline, pre-hydration class setter so the correct palette is painted on first
// frame (no flash). Must stay in sync with theme-provider's STORAGE_KEY + logic.
const STORAGE_KEY = "nightchannel-theme";

export function ThemeScript() {
  const code = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'auto';var d=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
