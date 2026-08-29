/// <reference types="vite/client" />

// CSS Modules
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// CSS imports as side-effects
declare module '*.css' {
  const css: string;
  export default css;
}
