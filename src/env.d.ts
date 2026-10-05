/** Injected by build.mjs. */
declare const __VERSION__: string;
/** Source of the page-context script (src/site/page), bundled separately by build.mjs. */
declare const __PAGE_SCRIPT__: string;

declare module '*.css' {
  const css: string;
  export default css;
}
