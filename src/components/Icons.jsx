// Simple line icons. They inherit the text colour.

const Svg = ({ size = 20, sw = 2, children, fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const Back = (p) => <Svg size={18} {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Svg>;
export const Next = (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const Prev = (p) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const Check = (p) => <Svg sw={2.4} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const ListCheck = (p) => <Svg size={18} sw={1.9} {...p}><path d="M11 6h9M11 12h9M11 18h9M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" /></Svg>;
export const Pencil = (p) => <Svg size={18} sw={1.8} {...p}><path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3zM14 7l3 3" /></Svg>;
export const Plus = (p) => <Svg size={16} sw={2.2} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const History = (p) => <Svg size={18} sw={1.9} {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4" /><path d="M12 8v4l3 2" /></Svg>;
export const Clock = (p) => <Svg size={14} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Svg>;
export const List = (p) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Svg>;
export const Cards = (p) => <Svg sw={1.8} {...p}><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8 10h8M8 14h5" /></Svg>;
export const Sliders = (p) => <Svg sw={1.8} {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Svg>;
export const Users = (p) => <Svg sw={1.9} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 010 7M21 20c0-2.6-1.6-4.9-4-5.7" /></Svg>;
export const Building = (p) => <Svg sw={1.9} {...p}><path d="M4 21V7l8-4 8 4v14M4 21h16M9 21v-5h6v5M9 10h.01M15 10h.01" /></Svg>;
export const Search = (p) => <Svg size={18} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>;
export const Chevron = (p) => <Svg size={16} {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const Trash = (p) => <Svg size={17} sw={1.9} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const Download = (p) => <Svg sw={1.8} {...p}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" /></Svg>;
export const Upload = (p) => <Svg sw={1.8} {...p}><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19h14" /></Svg>;
export const Close = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const Grip = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}
  </svg>
);
export const Sun = (p) => <Svg sw={1.8} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const Help = (p) => <Svg sw={1.8} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 014.8 1c0 1.7-2.3 2-2.3 3.5M12 17h.01" /></Svg>;
export const Cog = (p) => (
  <Svg sw={1.8} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Svg>
);
export const Lock = (p) => <Svg sw={1.8} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></Svg>;
