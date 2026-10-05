/** Injected by build.mjs. */
declare const __VERSION__: string;
/** The page-context script (src/site/page) as a function, emitted by build.mjs above the bundle. */
declare function __ptmPageScript(): void;

declare module '*.css' {
  const css: string;
  export default css;
}

/** Vite `?raw` imports, used by tests to load fixtures as text. */
declare module '*?raw' {
  const text: string;
  export default text;
}
