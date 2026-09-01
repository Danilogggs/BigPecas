/**
 * Icons.jsx
 * SVG Icons reutilizáveis para a aplicação
 */

export function SearchIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function WrenchIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a1.5 1.5 0 1 0 2.1 2.1l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-.4-.4-2.1 2.6-2.2Z"
      />
    </svg>
  );
}

export function BoltIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
      />
    </svg>
  );
}

export function StarIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"
      />
    </svg>
  );
}

export function UserIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function TrashIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

const ICON_PATHS = {
  part: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a1.5 1.5 0 1 0 2.1 2.1l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-.4-.4-2.1 2.6-2.2Z" /></>,
  engine: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>,
  car: <><path d="m3 14 2-5h14l2 5v5h-2v-2H5v2H3v-5Z"/><path d="M5 14h14M7 9l2-3h6l2 3"/><circle cx="7" cy="14" r="1"/><circle cx="17" cy="14" r="1"/></>,
  plug: <><path d="M9 2v6m6-6v6M7 8h10v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V8Zm5 7v7"/></>,
  seat: <><path d="M7 3v9a4 4 0 0 0 4 4h6v5M7 10h5a3 3 0 0 1 3 3v3M4 21h15"/></>,
  wheel: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6M3 12h6m6 0h6"/></>,
  brake: <><circle cx="12" cy="12" r="8"/><path d="M12 4v4m0 8v4M4 12h4m8 0h4"/><circle cx="12" cy="12" r="2"/></>,
  bolt: <path d="M13 2 5 13h6l-1 9 9-13h-6V2Z"/>,
  folder: <path d="M3 6h7l2 2h9v11H3V6Z"/>,
  package: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4m-8 4v10"/></>,
  message: <path d="M4 4h16v12H8l-4 4V4Z"/>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
  receipt: <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6M9 11h6M9 15h4"/>,
  truck: <><path d="M3 5h11v11H3V5Zm11 4h4l3 3v4h-7V9Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  cart: <><path d="M3 4h2l2 11h11l2-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></>,
  heart: <path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z"/>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
};

export function AppIcon({ name, size = 20, className = '', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICON_PATHS[name] || ICON_PATHS.part}
    </svg>
  );
}
