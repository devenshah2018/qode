import { Icon } from './Icon';
export function Header({ page }: { page: 'workbench' | 'docs' }) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.setAttribute('tabindex', '-1');
          main?.focus({ preventScroll: true });
          main?.scrollIntoView({ block: 'start' });
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href={base}>
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="15" cy="15" r="8" stroke="currentColor" strokeWidth="3" />
              <path d="m19 20 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="15" cy="15" r="2" fill="currentColor" />
            </svg>
          </span>
          qode<span className="version">v1.0</span>
        </a>
        <nav aria-label="Main navigation" className="main-nav">
          <a href={base} aria-current={page === 'workbench' ? 'page' : undefined}>
            <Icon name="code" />
            Workbench
          </a>
          <a href={`${base}docs/`} aria-current={page === 'docs' ? 'page' : undefined}>
            <Icon name="book" />
            <span className="nav-doc-long">Documentation</span>
            <span className="nav-doc-short">Docs</span>
          </a>
        </nav>
        <a
          className="github"
          aria-label="Source on GitHub (opens in a new tab)"
          href="https://github.com/devenshah2018/qode"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="github" />
          <span className="source-label">Source</span>
          <span className="sr-only"> on GitHub (opens in a new tab)</span>
        </a>
      </header>
    </>
  );
}
