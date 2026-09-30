import http from "node:http";
import { createHash } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const ISS = "http://localhost:9900", AUD = "test-client.apps.googleusercontent.com";
http.createServer(async (req, res) => {
  if (req.url.startsWith("/auth")) {
    const u = new URL(req.url, "http://x"); const who = /who=(\w+)/.exec(req.headers.cookie ?? "")?.[1] ?? "b";
    const people = { a: ["a", "admin@x.com", "Ali Admin"], b: ["b", "b@x.com", "Budi Runner"], c: ["c", "c@x.com", "Citra Runner"] };
    const [sub, email, name] = people[who];
    const code = Buffer.from(JSON.stringify({ nonce: u.searchParams.get("nonce"), challenge: u.searchParams.get("code_challenge"), sub, email, name })).toString("base64url");
    res.writeHead(302, { location: `${u.searchParams.get("redirect_uri")}?code=${code}&state=${u.searchParams.get("state")}` }); return res.end();
  }
  if (req.url === "/certs") { res.writeHead(200, {"content-type":"application/json"}); return res.end(JSON.stringify({ keys: [jwk] })); }
  if (req.url === "/token" && req.method === "POST") {
    let body = ""; for await (const ch of req) body += ch;
    const p = new URLSearchParams(body);
    const info = JSON.parse(Buffer.from(p.get("code"), "base64url").toString());
    const ok = createHash("sha256").update(p.get("code_verifier")).digest("base64url") === info.challenge
      && p.get("client_secret") === "test-secret-1234" && p.get("client_id") === AUD;
    if (!ok) { res.writeHead(400); return res.end("{}"); }
    const token = await new SignJWT({ nonce: info.nonce, email: info.email, email_verified: info.verified ?? true, name: info.name })
      .setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(ISS).setAudience(info.aud ?? AUD).setSubject(info.sub)
      .setIssuedAt().setExpirationTime("5m").sign(privateKey);
    res.writeHead(200, {"content-type":"application/json"}); return res.end(JSON.stringify({ id_token: token }));
  }
  res.writeHead(404); res.end();
}).listen(9900);
