export function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 2.4 }) {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    back:   <path d="M15 5l-7 7 7 7" {...p} />,
    chevR:  <path d="M9 5l7 7-7 7" {...p} />,
    chevL:  <path d="M15 5l-7 7 7 7" {...p} />,
    chevD:  <path d="M5 9l7 7 7-7" {...p} />,
    gear:   <g {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.5M12 18.5V21M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M3 12h2.5M18.5 12H21M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" /></g>,
    user:   <g {...p}><circle cx="12" cy="8.5" r="3.6" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></g>,
    bulb:   <g {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.8 10.6c.5.4.8 1 .8 1.6v.3h6v-.3c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" /></g>,
    undo:   <path d="M9 7H5V3M5 7a8 8 0 1 1-2 5.3" {...p} />,
    flag:   <g {...p}><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></g>,
    lock:   <g {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></g>,
    check:  <path d="M5 12.5l4.5 4.5L19 7.5" {...p} strokeWidth={3} />,
    star:   <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9z" fill={color} stroke="none" />,
    arrowUp:<path d="M12 19V5M6 11l6-6 6 6" {...p} />,
    search: <g {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6" /></g>,
    retry:  <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M5 3v3.5h3.5" {...p} />,
    grad:   <g {...p}><path d="M12 4L2 9l10 5 10-5-10-5z" /><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" /></g>,
    target: <g {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></g>,
    swords: <g {...p}><path d="M5 4l9 9M4 5l3-1 11 11 1 3-3-1L4 5z" /><path d="M19 4l-5 5" /></g>,
    chart:  <g {...p}><path d="M4 20V4M4 20h16" /><rect x="7" y="12" width="2.8" height="5" rx="1" fill={color} stroke="none" /><rect x="12" y="8" width="2.8" height="9" rx="1" fill={color} stroke="none" /><rect x="17" y="14" width="2.8" height="3" rx="1" fill={color} stroke="none" /></g>,
    play:   <path d="M8 5.5v13l10-6.5-10-6.5z" fill={color} stroke="none" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}
