import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

/**
 * Google sign-in with the authorization-code flow, PKCE (S256), state and
 * nonce. The ID token is verified against Google's published keys: issuer,
 * audience, expiry, nonce, and a verified email are all required.
 */
const google = config.google;
const jwks = google ? createRemoteJWKSet(new URL(google.jwksUrl), { timeoutDuration: 5000 }) : null;

export type GoogleProfile = { sub: string; email: string; name: string };

export function authorizationUrl(p: { state: string; nonce: string; verifier: string }): string {
  if (!google) throw new Error("Google sign-in is not configured");
  const challenge = createHash("sha256").update(p.verifier).digest("base64url");
  const url = new URL(google.authUrl);
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export async function exchangeCode(code: string, verifier: string, nonce: string): Promise<GoogleProfile> {
  if (!google || !jwks) throw new Error("Google sign-in is not configured");

  const res = await fetch(google.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: google.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  const body = (await res.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string") throw new Error("no id_token in response");

  const { payload } = await jwtVerify(body.id_token, jwks, {
    issuer: google.issuers,
    audience: google.clientId,
    algorithms: ["RS256"],
    maxTokenAge: "10m",
  });

  if (payload.nonce !== nonce) throw new Error("nonce mismatch");
  if (payload.email_verified !== true) throw new Error("email not verified");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("missing claims");

  const name = typeof payload.name === "string" ? payload.name : "";
  return { sub: payload.sub, email: payload.email.toLowerCase(), name };
}
