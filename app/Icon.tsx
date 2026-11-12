// Una sola familia de iconos: trazo de 2 px sobre una rejilla de 24, decorativos por defecto.
const PATHS = {
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  copy: "M9 9h10v11H9zM5 15V4h10",
  chevron: "M6 9l6 6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  external: "M14 5h5v5M19 5l-8 8M11 7H6v11h11v-5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  shuffle: "M4 7h3c5 0 5 10 10 10h3M4 17h3c1.6 0 2.7-1 3.6-2.3M20 7h-3c-1.6 0-2.7 1-3.6 2.3M17 4l3 3-3 3M17 14l3 3-3 3",
  // tipos de pregunta
  short: "M4 9h16v6H4zM7 12h4",
  long: "M4 5h16v14H4zM7 9h10M7 12h10M7 15h6",
  number: "M9 4L7 20M17 4l-2 16M4 9h16M3.5 15h16",
  single: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  multi: "M4 4h16v16H4zM8 12.5l3 3 5-6",
  select: "M4 6h16v12H4zM9 11l3 3 3-3",
  scale: "M3 12h18M6 9v6M12 8v8M18 9v6",
  matrix: "M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon-svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
