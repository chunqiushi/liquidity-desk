export function ThemeScript() {
  // Runs before paint to avoid a flash; defaults to light (规范浅色优先), respects saved choice.
  const code = `(function(){try{var t=localStorage.getItem('liquidity-desk-research');var theme='dark';if(t){var p=JSON.parse(t);if(p&&p.state&&p.state.theme){theme=p.state.theme;}}var el=document.documentElement;if(theme==='dark'){el.classList.add('dark');}else{el.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
