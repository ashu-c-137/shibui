import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function I(props: P & { children: ReactNode }) {
  const { children, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16.5 20 20.5" />
  </I>
);

export const IconPower = (p: P) => (
  <I {...p}>
    <path d="M12 3v8" />
    <path d="M7.2 6.3a7 7 0 1 0 9.6 0" />
  </I>
);

export const IconGear = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.6 6.5l1.6 1.6M17.8 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.6 17.5l1.6-1.6M17.8 8.1l1.6-1.6" />
  </I>
);

export const IconWifi = ({ bars = 3 }: { bars?: number }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4.5 10.2c4.2-4 10.8-4 15 0" opacity={bars >= 3 ? 1 : 0.22} />
    <path d="M7.2 13.2c2.8-2.6 6.8-2.6 9.6 0" opacity={bars >= 2 ? 1 : 0.22} />
    <path d="M10 16.2c1.2-1.1 2.8-1.1 4 0" opacity={bars >= 1 ? 1 : 0.22} />
    <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconEthernet = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 4h8v5H8zM10 9v3H6v4h3v4M14 9v3h4v4h-3v4" />
  </svg>
);

export const IconSpeaker = ({ level = 2 }: { level?: 0 | 1 | 2 | 3 }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 10.5v3h3.2L12 18V6L7.2 10.5H4z" />
    {level >= 1 && <path d="M15.2 10.2a3 3 0 0 1 0 3.6" />}
    {level >= 2 && <path d="M17.4 8.2a5.4 5.4 0 0 1 0 7.6" />}
    {level === 0 && <path d="M15 9.5 20 16.5M20 9.5 15 16.5" />}
  </svg>
);

export const IconBattery = ({ percent = 80, charging = false }: { percent?: number; charging?: boolean }) => (
  <svg viewBox="0 0 28 14" width="22" height="11" aria-hidden>
    <rect x="0.7" y="1.2" width="23.5" height="11.6" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <rect x="25.2" y="4.6" width="2" height="4.8" rx="0.7" fill="currentColor" />
    <rect x="2.4" y="3.1" width={Math.max(1.2, (percent / 100) * 20)} height="7.8" rx="1.2" fill="currentColor" />
    {charging && (
      <path d="M13 2.6 10.4 8h3.1L12 11.5 16.2 6.1h-3.1z" fill="var(--bar-bg, #1c1c1e)" stroke="none" />
    )}
  </svg>
);

export const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const IconPause = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
    <rect x="7" y="5.5" width="3.4" height="13" rx="0.6" />
    <rect x="13.6" y="5.5" width="3.4" height="13" rx="0.6" />
  </svg>
);

export const IconSkip = ({ dir = 1 }: { dir?: 1 | -1 }) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden style={{ transform: dir < 0 ? "scaleX(-1)" : undefined }}>
    <path d="M6 6v12l8.5-6z" />
    <rect x="16.2" y="6" width="2.2" height="12" rx="0.4" />
  </svg>
);

export const IconClose = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2.2" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconLock = () => (
  <I>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </I>
);

export const IconSleep = () => (
  <I>
    <path d="M14.5 4.2A8 8 0 1 0 20 13.8 6.4 6.4 0 0 1 14.5 4.2z" />
  </I>
);
