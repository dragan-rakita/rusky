/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:rusky/content' {
  export const languages: import('@rusky/core').Language[];
  export const levels: Record<string, import('@rusky/core').LevelContent>;
}
