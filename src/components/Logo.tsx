
const CHECK_KEY = "M18.9 23.5A5.5 5.5 0 1 0 17.7 28L23.5 33.5 36 15";
const WORDMARK = "M45.9 0 28.6 -25.6H20.9L43.2 -54.8H60L39 -27.6L39.2 -35.4L63.9 0ZM7.3 0V-73H23.3V0ZM89.7 1.9Q82.7 1.9 77.35 -0.5Q72 -2.9 68.45 -6.95Q64.9 -11 63.05 -16.05Q61.2 -21.1 61.2 -26.4V-28.4Q61.2 -33.9 63.05 -38.95Q64.9 -44 68.4 -48Q71.9 -52 77.15 -54.35Q82.4 -56.7 89.1 -56.7Q97.9 -56.7 103.95 -52.75Q110 -48.8 113.2 -42.45Q116.4 -36.1 116.4 -28.6V-23.2H67.9V-32.3H106.7L101.5 -28.1Q101.5 -33 100.1 -36.5Q98.7 -40 95.95 -41.85Q93.2 -43.7 89.1 -43.7Q84.9 -43.7 82 -41.8Q79.1 -39.9 77.6 -36.25Q76.1 -32.6 76.1 -27.3Q76.1 -22.4 77.5 -18.75Q78.9 -15.1 81.9 -13.1Q84.9 -11.1 89.7 -11.1Q94.1 -11.1 96.9 -12.8Q99.7 -14.5 100.7 -17H115.4Q114.2 -11.5 110.7 -7.2Q107.2 -2.9 101.9 -0.5Q96.6 1.9 89.7 1.9ZM121.4 21.7V8.1H132.8Q135.4 8.1 137.2 7.45Q139 6.8 140.1 5.3Q141.2 3.8 141.9 1.2L155.4 -54.8H170.6L155.3 4.4Q153.7 10.8 150.85 14.6Q148 18.4 143.25 20.05Q138.5 21.7 131.2 21.7ZM138.6 -1.2V-13.7H150.2V-1.2ZM132 -1.2 115.2 -54.8H131.3L147.2 -1.2ZM175.6 0V-54.3Q175.6 -63.8 180.95 -68.4Q186.3 -73 196.8 -73H201.7V-61.1H196.1Q193.4 -61.1 191.95 -59.6Q190.5 -58.1 190.5 -55.4V0ZM169.2 -41.6V-53.3H202.1V-41.6ZM212.1 0V-73H228.1V0ZM206.2 -61.2V-73H228.1V-61.2ZM237.7 21.7V8.1H249.1Q251.7 8.1 253.5 7.45Q255.3 6.8 256.4 5.3Q257.5 3.8 258.2 1.2L271.7 -54.8H286.9L271.6 4.4Q270 10.8 267.15 14.6Q264.3 18.4 259.55 20.05Q254.8 21.7 247.5 21.7ZM254.9 -1.2V-13.7H266.5V-1.2ZM248.3 -1.2 231.5 -54.8H247.6L263.5 -1.2Z";

/** Keyfly mark: green circle with a lime check-key (G1 approval badge). */
export function LogoMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={light ? "#C9F27B" : "#0E5A43"} />
      <path
        d={CHECK_KEY}
        transform="translate(50 50) scale(2.08) translate(-21.6 -24.3)"
        fill="none"
        stroke={light ? "#0C1F19" : "#C9F27B"}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Horizontal Keyfly logo (Sora wordmark + approval badge), outlined so it renders without the font. */
export function LogoFull({ height = 34, light = false }: { height?: number; light?: boolean }) {
  return (
    <svg height={height} width={(height * 344.6) / 96.7} viewBox="0 0 344.6 96.7" aria-hidden="true">
      <g transform="translate(-7.3 75)">
        <path d={WORDMARK} fill={light ? "#FFFFFF" : "#0C1F19"} />
        <circle cx="321.9" cy="-45" r="30" fill={light ? "#C9F27B" : "#0E5A43"} />
        <path
          d={CHECK_KEY}
          transform="translate(321.9 -45) scale(1.25) translate(-21.6 -24.3)"
          fill="none"
          stroke={light ? "#0C1F19" : "#C9F27B"}
          strokeWidth="5.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
