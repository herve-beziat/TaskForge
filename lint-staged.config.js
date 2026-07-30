module.exports = {
  'backend/**/*.{ts,js,mjs,json}': () => [
    'npm --prefix backend run format:check',
    'npm --prefix backend run lint:check',
  ],
  'frontend/**/*.{ts,vue,js,mjs,json,css}': () => [
    'npm --prefix frontend run format:check',
    'npm --prefix frontend run lint:check',
  ],
}