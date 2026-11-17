/// <reference types="vite/client" />

/**
 * Vite types `import.meta.env.VITE_*` as `any`, which strict linting rightly
 * rejects. Declaring the variables this app reads turns the environment into a
 * checked contract: a typo in the name is a compile error, not a silent
 * `undefined` falling through to the default.
 */
interface ImportMetaEnv {
  /** Overrides the dev proxy path. Defaults to `/api` (see vite.config.ts). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
