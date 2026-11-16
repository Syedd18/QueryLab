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

export const quick = { duration: 0.12, ease: easeOut };
export const normal = { duration: 0.16, ease: easeOut };
export const slow = { duration: 0.2, ease: easeOut };
