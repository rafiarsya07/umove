import { secureHeaders } from "hono/secure-headers";

/**
 * Security headers for every response.
 *
 * The Content Security Policy only allows code, styles, fonts and images
 * from UMove itself. There is no inline script anywhere in the web app, so
 * `script-src 'self'` needs no exception. The page cannot be framed,
 * cannot submit forms elsewhere, and cannot load plugins.
 */
export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
  strictTransportSecurity: "max-age=63072000; includeSubDomains",
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
  crossOriginEmbedderPolicy: false,
  originAgentCluster: "?1",
  xDnsPrefetchControl: "off",
  xPermittedCrossDomainPolicies: "none",
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
  },
});

/** Set on a response to serve it with a locked-down, sandboxed CSP (see app.ts). */
export const SANDBOX_HEADER = "x-umove-sandbox";
