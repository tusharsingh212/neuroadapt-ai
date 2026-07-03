const DEV = import.meta.env.DEV === true;

export const logger = {
  debug: (...args: unknown[]): void => {
    if (DEV) console.debug("[NeuroAdapt]", ...args);
  },
  info: (...args: unknown[]): void => {
    if (DEV) console.info("[NeuroAdapt]", ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn("[NeuroAdapt]", ...args);
  },
  error: (...args: unknown[]): void => {
    console.error("[NeuroAdapt]", ...args);
  },
};
