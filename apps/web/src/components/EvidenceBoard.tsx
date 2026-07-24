/** Original SVG "evidence board" hero composition. No external/stock assets. */
export function EvidenceBoard() {
  return (
    <div className="evidence-board" role="img" aria-label="لوحة أدلة: قصاصات مربوطة بخيط وتواريخ التحقيق">
      <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="var(--line)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />

        {/* thread */}
        <path
          d="M70 70 C 150 40, 250 120, 330 90"
          fill="none"
          stroke="var(--evidence-600)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M90 210 C 180 240, 240 160, 320 200"
          fill="none"
          stroke="var(--metal-500)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        {/* note 1 */}
        <g transform="rotate(-4 80 70)">
          <rect x="40" y="45" width="110" height="70" rx="3" fill="var(--card)" stroke="var(--line)" />
          <rect x="52" y="58" width="70" height="7" rx="2" fill="var(--ink-950)" />
          <rect x="52" y="72" width="86" height="6" rx="2" fill="var(--metal-300)" />
          <rect x="52" y="84" width="50" height="6" rx="2" fill="var(--metal-300)" />
          <text x="52" y="106" fontFamily="monospace" fontSize="8" fill="var(--evidence-700)">
            23:46
          </text>
        </g>

        {/* note 2 (redacted) */}
        <g transform="rotate(3 300 90)">
          <rect x="250" y="60" width="110" height="66" rx="3" fill="var(--card)" stroke="var(--evidence-600)" />
          <rect x="262" y="74" width="60" height="8" rx="2" fill="var(--ink-950)" />
          <rect x="262" y="88" width="82" height="6" rx="2" fill="var(--metal-300)" />
          <rect x="262" y="100" width="40" height="6" rx="2" fill="var(--ink-950)" />
          <text x="262" y="120" fontFamily="monospace" fontSize="8" fill="var(--evidence-700)">
            WIFI · 23:48
          </text>
        </g>

        {/* note 3 */}
        <g transform="rotate(-2 110 220)">
          <rect x="60" y="185" width="120" height="72" rx="3" fill="var(--card)" stroke="var(--line)" />
          <rect x="72" y="200" width="80" height="7" rx="2" fill="var(--ink-950)" />
          <rect x="72" y="214" width="94" height="6" rx="2" fill="var(--metal-300)" />
          <rect x="72" y="226" width="60" height="6" rx="2" fill="var(--metal-300)" />
          <text x="72" y="248" fontFamily="monospace" fontSize="8" fill="var(--evidence-700)">
            00:01 · CAR OUT
          </text>
        </g>

        {/* pin dots */}
        {[
          [70, 70],
          [330, 90],
          [110, 210],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="var(--evidence-600)" />
        ))}
      </svg>
    </div>
  );
}
