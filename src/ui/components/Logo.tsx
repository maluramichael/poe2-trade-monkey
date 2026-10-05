/** Monkey-free placeholder mark: a gold coin with the initials, drawn as SVG (no external asset). */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg class="ptm-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#5a3806" stroke="#c59a50" stroke-width="2" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="#8a5609" stroke-width="1.5" />
      <text x="16" y="20.5" text-anchor="middle" font-family="FontinSmallCaps, serif" font-size="12" fill="#f3d278">
        TM
      </text>
    </svg>
  );
}
