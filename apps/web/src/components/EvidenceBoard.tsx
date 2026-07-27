/** Original fracture composition: one shared statement splitting into incompatible testimony. */
export function EvidenceBoard() {
  return (
    <div
      className="evidence-board"
      role="img"
      aria-label="رواية واحدة تتشقق إلى شهادتين متعارضتين عند الساعة ٢٣:٤٨"
    >
      <svg viewBox="0 0 560 640" xmlns="http://www.w3.org/2000/svg">
        <rect width="560" height="640" fill="var(--black-soft)" />
        <g className="evidence-board__grid" stroke="rgba(247,247,245,.09)">
          <path d="M0 80h560M0 160h560M0 240h560M0 320h560M0 400h560M0 480h560M0 560h560" />
          <path d="M80 0v640M160 0v640M240 0v640M320 0v640M400 0v640M480 0v640" />
        </g>
        <text x="40" y="56" fill="var(--steel)" fontFamily="var(--font-mono)" fontSize="13">
          CASE / 001
        </text>
        <text
          x="520"
          y="56"
          textAnchor="end"
          fill="var(--white)"
          fontFamily="var(--font-mono)"
          fontSize="13"
        >
          23:48
        </text>

        <path
          className="evidence-board__fracture"
          d="M300 78 263 172l38 42-66 80 48 55-84 84 54 55-41 78"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="5"
        />
        <path d="M301 214 388 176" stroke="var(--signal)" strokeWidth="2" />
        <path d="m284 350 111 66" stroke="var(--signal)" strokeWidth="2" />
        <path d="m253 488-96 42" stroke="var(--signal)" strokeWidth="2" />

        <g fill="var(--white)" fontFamily="var(--font-display)" fontWeight="700">
          <text x="40" y="142" fontSize="28">
            قال: كنت في
          </text>
          <text x="40" y="177" fontSize="28">
            غرفة السيرفر.
          </text>
          <text x="520" y="282" textAnchor="end" fontSize="28">
            وقال: شفته
          </text>
          <text x="520" y="317" textAnchor="end" fontSize="28">
            عند المستودع.
          </text>
        </g>

        <g fontFamily="var(--font-mono)" fontSize="12">
          <text x="40" y="210" fill="var(--steel)">
            شهادة / أ
          </text>
          <text x="520" y="350" textAnchor="end" fill="var(--steel)">
            شهادة / ب
          </text>
          <text x="40" y="596" fill="#a9baff">
            لا يمكن أن يكون الجوابان صحيحين في اللحظة نفسها.
          </text>
        </g>

        <circle cx="301" cy="214" r="8" fill="var(--signal)" />
        <circle cx="284" cy="350" r="8" fill="var(--signal)" />
        <circle cx="253" cy="488" r="8" fill="var(--signal)" />
      </svg>
      <span className="evidence-board__caption mono">إشارة ٠١ / أول شرخ</span>
    </div>
  );
}
