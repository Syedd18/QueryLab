/**
 * Motion presets. Functional only: fast fades and 2–4px slides, no springs.
 */
export const easeOut = [0.25, 1, 0.5, 1] as const;

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeUp = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};

export const fadeDown = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const expand = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

/** Overlay entrance: a slight lift and scale that settles without overshoot. */
export const pop = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.985 },
};

export const quick = { duration: 0.14, ease: [0.22, 1, 0.36, 1] as const };
export const normal = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
export const slow = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
