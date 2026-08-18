export type StageVisual = {
  accent: string;
  glow: string;
  wash: string;
  border: string;
};

const DEFAULT: StageVisual = {
  accent: "#64748B",
  glow: "rgba(100, 116, 139, 0.12)",
  wash: "rgba(100, 116, 139, 0.07)",
  border: "rgba(100, 116, 139, 0.2)",
};

const STAGES: Record<string, StageVisual> = {
  NEW: {
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.16)",
    wash: "rgba(56, 189, 248, 0.09)",
    border: "rgba(56, 189, 248, 0.28)",
  },
  CONTACTED: {
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.16)",
    wash: "rgba(34, 211, 238, 0.09)",
    border: "rgba(34, 211, 238, 0.28)",
  },
  CALC: {
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.16)",
    wash: "rgba(129, 140, 248, 0.09)",
    border: "rgba(129, 140, 248, 0.28)",
  },
  OFFER: {
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.18)",
    wash: "rgba(251, 191, 36, 0.1)",
    border: "rgba(251, 191, 36, 0.3)",
  },
  THINKING: {
    accent: "#c084fc",
    glow: "rgba(192, 132, 252, 0.16)",
    wash: "rgba(192, 132, 252, 0.09)",
    border: "rgba(192, 132, 252, 0.28)",
  },
  ORDER: {
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.16)",
    wash: "rgba(52, 211, 153, 0.09)",
    border: "rgba(52, 211, 153, 0.28)",
  },
  PAYMENT: {
    accent: "#d4af37",
    glow: "rgba(212, 175, 55, 0.2)",
    wash: "rgba(212, 175, 55, 0.1)",
    border: "rgba(212, 175, 55, 0.32)",
  },
  WON: {
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.18)",
    wash: "rgba(74, 222, 128, 0.1)",
    border: "rgba(74, 222, 128, 0.3)",
  },
  LOST: {
    accent: "#f87171",
    glow: "rgba(248, 113, 113, 0.16)",
    wash: "rgba(248, 113, 113, 0.09)",
    border: "rgba(248, 113, 113, 0.28)",
  },
};

export function pipelineStageStyle(code: string): StageVisual {
  return STAGES[code] ?? DEFAULT;
}
