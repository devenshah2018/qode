import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { workspaceLink } from '../workspace';
import { articles, headings, slug } from './catalog';
function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child),
    )
    .join('');
}
function CodeBlock({ children }: { children?: ReactNode }) {
  const code = Children.toArray(children).find((child) => isValidElement(child));
  const props = isValidElement<{ className?: string; children?: ReactNode }>(code)
    ? code.props
    : {};
  const language = props.className?.replace('language-', '') ?? 'text';
  const source = textOf(props.children ?? children).replace(/\n$/, '');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <div className="doc-code">
      <div className="doc-code-toolbar">
        <span>
          {language === 'qode' ? 'QODE' : language === 'sh' ? 'TERMINAL' : language.toUpperCase()}
        </span>
        <div>
          {language === 'qode' && (
            <a className="code-run" href={workspaceLink({ source, seed: '42', shots: 1024 })}>
              <Icon name="play" />
              Open in workbench
            </a>
          )}
          <button
            aria-label={message === 'Copied' ? 'Copied code' : 'Copy code'}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(source);
                setMessage('Copied');
              } catch {
                setMessage('Clipboard unavailable. Select the code to copy.');
              }
            }}
          >
            <Icon name={message === 'Copied' ? 'check' : 'copy'} />
            {message === 'Copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre tabIndex={0}>{children}</pre>
      {message && (
        <span className="copy-message" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
function currentRoute() {
  const [id, section] = location.hash.slice(1).split('/');
  return { id: id || 'getting-started', section: section || '' };
}
export default function Docs() {
  const [route, setRoute] = useState(currentRoute),
    [query, setQuery] = useState(''),
    [contents, setContents] = useState(false);
  const search = useRef<HTMLInputElement>(null),
    navigation = useRef(false);
  const article = articles.find((a) => a.id === route.id);
  const toc = article ? headings(article.body) : [];
  const index = articles.findIndex((a) => a.id === route.id);
  const results = query.trim()
    ? articles.filter((a) =>
        `${a.title} ${a.description} ${a.body}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];
  useEffect(() => {
    const change = () => {
      navigation.current = true;
      setRoute(currentRoute());
      setQuery('');
      setContents(false);
    };
    const keys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !target.closest('input,textarea,[contenteditable="true"]')) {
        event.preventDefault();
        if (window.innerWidth <= 760) setContents(true);
        requestAnimationFrame(() => search.current?.focus());
      }
      if (event.key === 'Escape') {
        setContents(false);
        setQuery('');
      }
    };
    window.addEventListener('hashchange', change);
    window.addEventListener('keydown', keys);
    return () => {
      window.removeEventListener('hashchange', change);
      window.removeEventListener('keydown', keys);
    };
  }, []);
  useEffect(() => {
    document.title = `${article?.title ?? 'Page not found'} · Qode documentation`;
    if (navigation.current || route.section)
      requestAnimationFrame(() => {
        const target = document.getElementById(
          route.section ? `doc-${route.section}` : 'doc-title',
        );
        target?.scrollIntoView({ block: 'start' });
        target?.focus({ preventScroll: true });
      });
  }, [article, route]);
  function link(href: string) {
    if (href.startsWith('#')) return `#${route.id}/${href.slice(1)}`;
    const [file, anchor] = href.split('#');
    const found = articles.find((a) => a.file === file || a.file.split('/').at(-1) === file);
    if (found) return `#${found.id}${anchor ? `/${anchor}` : ''}`;
    if (!/^(https?:|mailto:|\/)/.test(href))
      return `https://github.com/devenshah2018/qode/blob/main/docs/${href}`;
    return href;
  }
  return (
    <div
      className="docs-shell"
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const anchor = (event.target as Element).closest('a[href^="#"]');
        if (anchor?.getAttribute('href') === location.hash) {
          event.preventDefault();
          navigation.current = true;
          setRoute(currentRoute());
          setQuery('');
          setContents(false);
        }
      }}
    >
      <Header page="docs" />
      <div className="docs-mobile-bar">
        <button
          aria-expanded={contents}
          aria-controls="docs-sidebar"
          onClick={() => setContents(!contents)}
        >
          <Icon name={contents ? 'close' : 'menu'} />
          Contents
        </button>
        <span>{article?.title ?? 'Documentation'}</span>
      </div>
      <div className="docs-layout">
        <aside
          id="docs-sidebar"
          className={`docs-sidebar ${contents ? 'is-open' : ''}`}
          aria-label="Documentation navigation"
        >
          <div className="docs-sidebar-heading">
            <span className="eyebrow">THE QODE HANDBOOK</span>
            <h2>Documentation.</h2>
          </div>
          <label className="doc-search">
            <Icon name="search" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation"
              aria-label="Search documentation"
            />
            <kbd>/</kbd>
          </label>
          {query.trim() ? (
            <div className="doc-search-results">
              <p className="caption" role="status">
                {results.length} {results.length === 1 ? 'chapter' : 'chapters'} found
              </p>
              {results.map((a) => (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  onClick={() => {
                    setQuery('');
                    setContents(false);
                  }}
                >
                  <strong>{a.title}</strong>
                  <span>{a.description}</span>
                </a>
              ))}
              {!results.length && (
                <p className="caption">
                  No chapters match “{query}”. Try gate names, measurement, or architecture.
                </p>
              )}
            </div>
          ) : (
            <nav aria-label="Documentation chapters">
              {['Start here', 'Language', 'Build with Qode', 'Reference'].map((group) => (
                <div className="docs-nav-group" key={group}>
                  <h3>{group}</h3>
                  {articles
                    .filter((a) => a.group === group)
                    .map((a) => (
                      <a
                        key={a.id}
                        href={`#${a.id}`}
                        aria-current={a.id === route.id ? 'page' : undefined}
                        onClick={() => setContents(false)}
                      >
                        {a.title}
                      </a>
                    ))}
                </div>
              ))}
            </nav>
          )}
          <div className="docs-sidebar-foot">
            <Icon name="code" />
            <span>
              Qode 1.0
              <br />
              <small>Small language. Visible mechanics.</small>
            </span>
          </div>
        </aside>
        <main className="doc-main" id="main-content">
          {article ? (
            <>
              <div className="doc-breadcrumb">
                <a href={`${import.meta.env.BASE_URL}docs/`}>Documentation</a>
                <Icon name="chevron" />
                <span>{article.group}</span>
              </div>
              <div className="doc-reading-meta">
                <span>GUIDE</span>
                <span>
                  {Math.max(1, Math.ceil(article.body.split(/\s+/).length / 200))} min read
                </span>
              </div>
              <div className="doc-article" key={article.id}>
                <Markdown
                  skipHtml
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <>
                        <h1 id="doc-title" tabIndex={-1}>
                          {children}
                        </h1>
                        <p className="doc-description">{article.description}</p>
                      </>
                    ),
                    h2: ({ children }) => (
                      <h2 id={`doc-${slug(textOf(children))}`} tabIndex={-1}>
                        <a href={`#${article.id}/${slug(textOf(children))}`}>
                          {children}
                          <span className="heading-anchor" aria-hidden="true">
                            #
                          </span>
                        </a>
                      </h2>
                    ),
                    h3: ({ children }) => <h3>{children}</h3>,
                    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                    table: ({ children }) => (
                      <div className="doc-table" tabIndex={0}>
                        <table>{children}</table>
                      </div>
                    ),
                    a: ({ href = '', children }) => {
                      const url = link(href);
                      const external = /^https?:/.test(url);
                      return (
                        <a
                          href={url}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {article.body}
                </Markdown>
              </div>
              <nav className="doc-pagination" aria-label="Adjacent chapters">
                {index > 0 ? (
                  <a href={`#${articles[index - 1].id}`}>
                    <span>Previous chapter</span>
                    <strong>{articles[index - 1].title}</strong>
                  </a>
                ) : (
                  <span />
                )}
                {index < articles.length - 1 && (
                  <a href={`#${articles[index + 1].id}`}>
                    <span>Continue reading</span>
                    <strong>{articles[index + 1].title}</strong>
                  </a>
                )}
              </nav>
              <footer className="doc-footer">
                Qode reference / Version 1.0
                <a
                  href="https://github.com/devenshah2018/qode"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source on GitHub
                </a>
              </footer>
            </>
          ) : (
            <section className="doc-not-found">
              <span className="eyebrow">CHAPTER NOT FOUND</span>
              <h1 id="doc-title" tabIndex={-1}>
                Let's find your place.
              </h1>
              <p>That documentation chapter does not exist.</p>
              <a className="primary button-link" href="#getting-started">
                Start with the basics
              </a>
            </section>
          )}
        </main>
        <aside className="doc-toc" aria-label="On this page">
          <span className="eyebrow">ON THIS PAGE</span>
          <nav>
            {toc.map((h) => (
              <a
                key={h.id}
                href={`#${route.id}/${h.id}`}
                aria-current={route.section === h.id ? 'location' : undefined}
              >
                {h.title}
              </a>
            ))}
          </nav>
          <a className="docs-workbench-card" href={import.meta.env.BASE_URL}>
            <Icon name="orbit" />
            <strong>Put it into practice.</strong>
            <span>Run the examples and inspect each operation.</span>
            <span className="docs-card-action">Open workbench</span>
          </a>
        </aside>
      </div>
    </div>
  );
}
