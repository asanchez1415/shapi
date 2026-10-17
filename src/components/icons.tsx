import type { ReactNode } from "react";
import type { SportSlug, Status } from "@/lib/types";

// Iconos del sistema de diseño: trazo de 1,5 px sobre una grilla de 24.

function Svg({ size, label, children }: { size: number; label?: string; children: ReactNode }) {
  return (
    <svg
      className="sh-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

function Paths({ d }: { d: string[] }) {
  return (
    <>
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </>
  );
}

// Color del glifo sobre el círculo relleno de cada estado.
const ON_FILL = "#fff";

export const STATUS_META: Record<Status, { label: string; color: string; draw: () => ReactNode }> = {
  pendiente: {
    label: "Pendiente",
    color: "var(--estado-pendiente)",
    draw: () => <circle cx={12} cy={12} r={9} />,
  },
  hecha: {
    label: "Hecha",
    color: "var(--estado-hecha)",
    draw: () => (
      <>
        <circle cx={12} cy={12} r={10} fill="currentColor" stroke="none" />
        <path d="M7.6 12.4l3 3 5.8-6.2" stroke={ON_FILL} strokeWidth={2} />
      </>
    ),
  },
  dificultad: {
    label: "Hecha con dificultad",
    color: "var(--estado-dificultad)",
    draw: () => (
      <>
        <circle cx={12} cy={12} r={10} fill="currentColor" stroke="none" />
        <path d="M6.4 12.6l2.6 2.6 4.4-4.8" stroke={ON_FILL} strokeWidth={2} />
        <path d="M17.6 7.2v3.2" stroke={ON_FILL} strokeWidth={2} />
        <circle cx={17.6} cy={13.4} r={0.5} fill={ON_FILL} stroke={ON_FILL} strokeWidth={1} />
      </>
    ),
  },
  movida: {
    label: "Movida",
    color: "var(--estado-movida)",
    draw: () => (
      <>
        <circle cx={12} cy={12} r={10} fill="currentColor" stroke="none" />
        <path d="M7.5 16.5v-2a3 3 0 0 1 3-3h6" stroke={ON_FILL} strokeWidth={2} />
        <path d="M13.8 8.8l2.9 2.7-2.9 2.7" stroke={ON_FILL} strokeWidth={2} />
      </>
    ),
  },
  omitida: {
    label: "Omitida",
    color: "var(--estado-omitida)",
    draw: () => (
      <>
        <circle cx={12} cy={12} r={10} fill="currentColor" stroke="none" />
        <path d="M7.8 16.2L16.2 7.8" stroke={ON_FILL} strokeWidth={2} />
      </>
    ),
  },
};

export function StatusIcon({
  status,
  size = 20,
  decorative,
}: {
  status: Status;
  size?: number;
  decorative?: boolean;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  return (
    <span style={{ color: meta.color, display: "inline-flex" }}>
      <Svg size={size} label={decorative ? undefined : meta.label}>
        {meta.draw()}
      </Svg>
    </span>
  );
}

export const SPORT_META: Record<SportSlug, { label: string; color: string; d: string[] }> = {
  running: {
    label: "Running",
    color: "var(--deporte-running)",
    d: ["M3 16.5h14.5a3 3 0 0 0 3-3v-.5l-6-1.5-2-4.5H8l-.8 3L3 11z", "M3 19.5h17"],
  },
  ciclismo: {
    label: "Ciclismo",
    color: "var(--deporte-ciclismo)",
    d: [
      "M6 16m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
      "M18 16m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
      "M6 16l3.5-7h6L18 16",
      "M9.5 9L12 16h-6",
      "M8 6.5h3",
    ],
  },
  calistenia: {
    label: "Calistenia",
    color: "var(--deporte-calistenia)",
    d: ["M3 4h18", "M8 4v3.5a4 4 0 0 0 8 0V4", "M12 11.5v6", "M9.5 21l2.5-3.5 2.5 3.5"],
  },
  gimnasio: {
    label: "Gimnasio",
    color: "var(--deporte-gimnasio)",
    d: ["M6.5 7v10", "M17.5 7v10", "M3.5 9.5v5", "M20.5 9.5v5", "M6.5 12h11"],
  },
  plyo: {
    label: "Plyo y fútbol",
    color: "var(--deporte-plyo)",
    d: [
      "M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0",
      "M12 8.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9z",
      "M12 8.5V3.5",
      "M15.3 10.9l4.5-1.5",
      "M14 14.8l2.8 3.9",
      "M10 14.8l-2.8 3.9",
      "M8.7 10.9L4.2 9.4",
    ],
  },
  handstand: {
    label: "Handstand",
    color: "var(--deporte-handstand)",
    d: [
      "M12 18.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
      "M12 16.5V9",
      "M12 9L9 3",
      "M12 9l3-6",
      "M12 14.5l-4 4.5",
      "M12 14.5l4 4.5",
      "M6 21h12",
    ],
  },
  movilidad: {
    label: "Movilidad",
    color: "var(--deporte-movilidad)",
    d: [
      "M12 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
      "M12 7v6",
      "M5 9.5l7 1.5 7-1.5",
      "M12 13l-5 7",
      "M12 13l5 7",
    ],
  },
};

export function SportIcon({ sport, size = 20 }: { sport: SportSlug; size?: number }) {
  const meta = SPORT_META[sport] ?? SPORT_META.running;
  return (
    <Svg size={size}>
      <Paths d={meta.d} />
    </Svg>
  );
}

const NAV: Record<string, string[]> = {
  hoy: [
    "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
    "M12 2.5v2",
    "M12 19.5v2",
    "M2.5 12h2",
    "M19.5 12h2",
    "M5.3 5.3l1.4 1.4",
    "M17.3 17.3l1.4 1.4",
    "M5.3 18.7l1.4-1.4",
    "M17.3 6.7l1.4-1.4",
  ],
  semana: ["M4 5.5h16v14H4z", "M4 9.5h16", "M8.5 3v4", "M15.5 3v4"],
  progreso: ["M4 20h16", "M7 16.5v-4", "M12 16.5V7", "M17 16.5v-7"],
  ajustes: [
    "M4 7h10",
    "M18 7h2",
    "M16 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
    "M4 17h4",
    "M12 17h8",
    "M10 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ],
  nueva: ["M12 5v14", "M5 12h14"],
  back: ["M15 5l-7 7 7 7"],
  // Iconos de las filas de la tarjeta
  distance: ["M6 20m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0", "M18 4m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0", "M8 20h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"],
  time: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3 2"],
  schedule: ["M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0", "M12 9.5V13l2.5 1.5", "M4.5 5.5l3-2.5", "M19.5 5.5l-3-2.5"],
  user: ["M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0", "M4.5 20.5a7.5 7.5 0 0 1 15 0"],
  logout: ["M10 4H5.5v16H10", "M15 8l4 4-4 4", "M19 12H9"],
  heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  pace: ["M4 18a8 8 0 1 1 16 0", "M12 18l4-5", "M12 18h.01"],
  count: ["M9 6h11", "M9 12h11", "M9 18h11", "M4.5 6h.01", "M4.5 12h.01", "M4.5 18h.01"],
  next: ["M9 5l7 7-7 7"],
  grip: ["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"],
};

export function NavIcon({ name, size = 24 }: { name: keyof typeof NAV; size?: number }) {
  return (
    <Svg size={size}>
      <Paths d={NAV[name] ?? NAV.nueva} />
    </Svg>
  );
}
