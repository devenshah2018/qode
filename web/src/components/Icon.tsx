import type { SVGProps } from 'react';
const paths: Record<string, string> = {
  play: 'm9 5 10 7-10 7Z',
  step: 'm5 5 10 7-10 7Z M19 5v14',
  back: 'M5 5v14 M19 5 9 12l10 7Z',
  reset: 'M3 11a9 9 0 1 1 2.5 7 M3 4v7h7',
  stop: 'M6 6h12v12H6Z',
  code: 'm8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4Z M13 7a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 2',
  github:
    'M9 19c-5 1-5-2-7-2 M15 22v-4a3 3 0 0 0-1-2c3-.3 6-1.5 6-6a5 5 0 0 0-1.4-3.5A5 5 0 0 0 18.5 3S17 2.5 15 4a13 13 0 0 0-6 0C7 2.5 5.5 3 5.5 3a5 5 0 0 0-.1 3.5A5 5 0 0 0 4 10c0 4.5 3 5.7 6 6a3 3 0 0 0-1 2v4',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v4h16v-4',
  upload: 'M12 16V4 m-5 5 5-5 5 5 M4 16v4h16v-4',
  share:
    'M16 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M2 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M16 19a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M8 11l8-5 M8 13l8 5',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  cpu: 'M6 6h12v12H6Z M9 1v5 M15 1v5 M9 18v5 M15 18v5 M1 9h5 M1 15h5 M18 9h5 M18 15h5 M10 10h4v4h-4Z',
  layers: 'm12 3 10 5-10 5L2 8Z M2 12l10 5 10-5 M2 16l10 5 10-5',
  link: 'm10 13 4-4 M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M14 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  orbit: 'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M3 4c7-7 24 10 17 17S-4 11 3 4Z',
  wave: 'M2 12c3-15 7 15 10 0s7 15 10 0',
  spark: 'm12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z',
  chevron: 'm9 6 6 6-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  check: 'm4 12 5 5L20 6',
  copy: 'M9 9h12v12H9Z M15 5V2H2v13h3',
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.code} />
    </svg>
  );
}
