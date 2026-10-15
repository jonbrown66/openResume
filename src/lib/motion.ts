import type { Variants } from "framer-motion";

export const uiTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };
export const overlayTransition = { ...uiTransition, duration: 0.12 };

export const springTransition = {
  type: "spring",
  stiffness: 500,
  damping: 38,
} as const;

export const easeOutTransition = {
  ...uiTransition,
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOutTransition },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeOutTransition },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: easeOutTransition },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeOutTransition },
};

export const buttonHoverVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: springTransition },
  tap: { scale: 0.98, transition: springTransition },
};

export const cardHoverVariants: Variants = {
  initial: { y: 0 },
  hover: { y: -2, transition: springTransition },
};

// ── Dynamic Island 风格动画预设 ──────────────────────────
// 源自 cult-ui Dynamic Island: stiffness=400, damping=30
export const dynamicIslandSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 38,
};

// Toast 专用 — 胶囊弹入/模糊退出
export const toastMotionProps = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: uiTransition,
};

// 弹出面板 — 弹簧入场
export const popoverSpringProps = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -2, scale: 0.98 },
  transition: uiTransition,
};
