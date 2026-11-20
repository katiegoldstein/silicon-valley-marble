import { defineConfig } from 'vite';

// GitHub Pages serves the site from /silicon-valley-marble/, so the build (and
// `vite preview` of it) need that prefix. The dev server keeps using /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/silicon-valley-marble/' : '/',
}));
