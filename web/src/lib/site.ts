/**
 * Site settings that are easy to change.
 *
 * The API lives on the same origin as the web app (the mini PC serves
 * both), so it is always just "/api". In `npm run dev`, Vite forwards
 * /api to the local server on port 3000 (see vite.config.ts).
 */
export const site = {
  apiBase: "/api",
  // e.g. "https://t.me/UMove_UM_bot" or a Google Form. Empty = apply in Settings.
  runnerSignupUrl: "",
};
