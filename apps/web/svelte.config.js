import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    // A single-page app: nginx answers every unknown path with index.html, and the
    // same static build can later be wrapped as a native app.
    adapter: adapter({ fallback: 'index.html' }),
    typescript: {
      config: (config) => ({
        ...config,
        include: [...config.include, '../content-plugin.ts'],
      }),
    },
  },
};

export default config;
