import crypto from 'crypto';
import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';

/**
 * Minimal OAuth 2.1 authorization server for the remote MCP endpoint (ChatGPT / Claude connectors).
 *
 * Stateless (works on serverless): authorization codes, refresh tokens and dynamically registered
 * client ids are signed JWTs, so nothing is stored in the database.
 *
 * Access tokens are regular portal JWTs ({ userId, role }) so the MCP endpoint acts as the admin who signed in.
 *
 * Env:
 *   OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET  static client for manual setup (optional; dynamic registration also works)
 *   OAUTH_REDIRECT_URIS                    comma-separated allowed redirect URIs for the static client; trailing * = prefix
 *   OAUTH_ISSUER                           public base URL, e.g. https://project.svrtechgroups.com (default: from request)
 */

const SCOPE = 'mcp';
const ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TTL = '30d';
const CODE_TTL = '5m';
const DEFAULT_REDIRECTS = ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/api/mcp/auth_callback'];

const portalSecret = () => process.env.JWT_SECRET || 'secret';
// Separate key so codes / refresh tokens / client ids can never be used as portal or MCP access tokens.
const oauthSecret = () => crypto.createHash('sha256').update(`${portalSecret()}:oauth`).digest('hex');

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export const baseUrl = (req: Request) => {
  if (process.env.OAUTH_ISSUER) return process.env.OAUTH_ISSUER.replace(/\/+$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0].trim();
  return `${proto}://${host}`;
};

export const resourceMetadataUrl = (req: Request) => `${baseUrl(req)}/.well-known/oauth-protected-resource`;

class OAuthError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

// ------------------------------------------------------------------ clients
type Client = { clientId: string; redirectUris: string[]; authMethod: 'none' | 'client_secret_post' | 'client_secret_basic'; secret?: string };

const dcrSecretFor = (clientId: string) => crypto.createHmac('sha256', oauthSecret()).update(`client:${clientId}`).digest('hex');

const getClient = (clientId: string): Client => {
  if (!clientId) throw new OAuthError('invalid_client', 'client_id is required', 401);
  const staticId = process.env.OAUTH_CLIENT_ID;
  if (staticId && safeEqual(clientId, staticId)) {
    const uris = (process.env.OAUTH_REDIRECT_URIS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return {
      clientId,
      redirectUris: uris.length ? uris : DEFAULT_REDIRECTS,
      authMethod: process.env.OAUTH_CLIENT_SECRET ? 'client_secret_post' : 'none',
      secret: process.env.OAUTH_CLIENT_SECRET,
    };
  }
  try {
    const d = jwt.verify(clientId, oauthSecret()) as { typ: string; r: string[]; m: Client['authMethod'] };
    if (d.typ !== 'client') throw new Error('wrong type');
    return { clientId, redirectUris: d.r, authMethod: d.m, secret: d.m === 'none' ? undefined : dcrSecretFor(clientId) };
  } catch {
    throw new OAuthError('invalid_client', 'Unknown client_id', 401);
  }
};

const redirectAllowed = (client: Client, uri: string) =>
  client.redirectUris.some((allowed) => (allowed.endsWith('*') ? uri.startsWith(allowed.slice(0, -1)) : allowed === uri));

const authenticateClient = (req: Request, client: Client) => {
  if (client.authMethod === 'none' || !client.secret) return;
  let presented: string | undefined = req.body?.client_secret;
  const basic = req.headers.authorization?.match(/^Basic\s+(.+)$/i);
  if (basic) presented = decodeURIComponent(Buffer.from(basic[1], 'base64').toString().split(':').slice(1).join(':'));
  if (!presented || !safeEqual(presented, client.secret)) throw new OAuthError('invalid_client', 'Client authentication failed', 401);
};

const clientIdFromRequest = (req: Request): string => {
  const basic = req.headers.authorization?.match(/^Basic\s+(.+)$/i);
  if (basic) return decodeURIComponent(Buffer.from(basic[1], 'base64').toString().split(':')[0]);
  return String(req.body?.client_id || '');
};

// ------------------------------------------------------------------ tokens
const issueTokens = async (adminId: string, clientId: string) => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new OAuthError('invalid_grant', 'User no longer exists');
  const cid = crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 32);
  return {
    access_token: jwt.sign({ userId: admin.id, role: admin.role, scope: SCOPE }, portalSecret(), { expiresIn: ACCESS_TTL_SECONDS }),
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: jwt.sign({ typ: 'refresh', sub: admin.id, cid }, oauthSecret(), { expiresIn: REFRESH_TTL }),
    scope: SCOPE,
  };
};

const pkceOk = (verifier: string | undefined, challenge: string) =>
  !!verifier && safeEqual(crypto.createHash('sha256').update(verifier).digest('base64url'), challenge);

// ------------------------------------------------------------------ login page
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const AUTH_PARAMS = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'response_type', 'resource'];

const loginPage = (params: Record<string, string>, clientName: string, error?: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · SVR Project Portal</title>
<style>
  :root{color-scheme:light dark;--bg:#f5f6f8;--card:#fff;--fg:#111827;--muted:#6b7280;--border:#d1d5db;--accent:#2563eb;--err:#b91c1c}
  @media (prefers-color-scheme:dark){:root{--bg:#0b0f17;--card:#151b26;--fg:#e5e7eb;--muted:#9ca3af;--border:#374151;--accent:#3b82f6;--err:#f87171}}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,sans-serif;padding:16px}
  .card{width:100%;max-width:380px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:28px}
  h1{font-size:20px;margin:0 0 4px}p{margin:0 0 20px;color:var(--muted)}label{display:block;font-size:13px;margin:14px 0 6px}
  input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--fg);font:inherit}
  .row{display:flex;gap:10px;margin-top:22px}button{flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);font:inherit;cursor:pointer;background:transparent;color:var(--fg)}
  button.primary{background:var(--accent);border-color:var(--accent);color:#fff}.err{color:var(--err);font-size:14px;margin-top:12px}
</style></head><body>
<form class="card" method="post" action="/api/oauth/authorize">
  <h1>SVR Project Portal</h1>
  <p><strong>${esc(clientName)}</strong> wants to manage your projects, students and payments as you.</p>
  ${AUTH_PARAMS.map((k) => `<input type="hidden" name="${k}" value="${esc(params[k])}">`).join('')}
  <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required value="${esc(params.email)}">
  <label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
  ${error ? `<div class="err">${esc(error)}</div>` : ''}
  <div class="row"><button type="submit" name="decision" value="deny" formnovalidate>Cancel</button><button class="primary" type="submit" name="decision" value="allow">Sign in &amp; allow</button></div>
</form></body></html>`;

const redirectWith = (res: Response, redirectUri: string, params: Record<string, string | undefined>) => {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  res.redirect(302, url.toString());
};

/** Validates the authorize request; throws (shown to the user, never redirected) if client/redirect are bad. */
const validateAuthorize = (p: Record<string, string>) => {
  const client = getClient(p.client_id);
  if (!p.redirect_uri || !redirectAllowed(client, p.redirect_uri)) throw new OAuthError('invalid_request', 'redirect_uri is not allowed for this client');
  return client;
};

const authorizeProblem = (p: Record<string, string>, client: Client): string | null => {
  if (p.response_type !== 'code') return 'unsupported_response_type';
  if (p.code_challenge && (p.code_challenge_method || 'plain') !== 'S256') return 'invalid_request';
  if (client.authMethod === 'none' && !p.code_challenge) return 'invalid_request'; // public clients must use PKCE
  return null;
};

const pick = (src: any): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of [...AUTH_PARAMS, 'email', 'password', 'decision']) if (src?.[k] != null) out[k] = String(src[k]);
  return out;
};

// ------------------------------------------------------------------ routes
export const wellKnownRouter = Router();

const authServerMetadata = (req: Request) => {
  const base = baseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    scopes_supported: [SCOPE],
  };
};

const protectedResourceMetadata = (req: Request) => ({
  resource: `${baseUrl(req)}/api/mcp`,
  authorization_servers: [baseUrl(req)],
  scopes_supported: [SCOPE],
  bearer_methods_supported: ['header'],
  resource_name: 'SVR Project Portal',
});

wellKnownRouter.get(['/oauth-authorization-server', '/oauth-authorization-server/*', '/openid-configuration'], (req, res) =>
  res.json(authServerMetadata(req))
);
wellKnownRouter.get(['/oauth-protected-resource', '/oauth-protected-resource/*'], (req, res) => res.json(protectedResourceMetadata(req)));

export const oauthRouter = Router();
oauthRouter.use(express.urlencoded({ extended: false }));

oauthRouter.get('/authorize', async (req, res) => {
  const p = pick(req.query);
  let client: Client;
  try {
    client = validateAuthorize(p);
  } catch (e: any) {
    return res.status(400).type('text/plain').send(`OAuth error: ${e.message}`);
  }
  const problem = authorizeProblem(p, client);
  if (problem) return redirectWith(res, p.redirect_uri, { error: problem, state: p.state });
  res.type('html').send(loginPage(p, 'ChatGPT / AI assistant'));
});

oauthRouter.post('/authorize', async (req, res) => {
  const p = pick(req.body);
  let client: Client;
  try {
    client = validateAuthorize(p);
  } catch (e: any) {
    return res.status(400).type('text/plain').send(`OAuth error: ${e.message}`);
  }
  const problem = authorizeProblem(p, client);
  if (problem) return redirectWith(res, p.redirect_uri, { error: problem, state: p.state });
  if (p.decision !== 'allow') return redirectWith(res, p.redirect_uri, { error: 'access_denied', state: p.state });

  const email = (p.email || '').trim().toLowerCase();
  const admin = email ? await prisma.admin.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }) : null;
  if (!admin || !admin.password || !(await bcrypt.compare(p.password || '', admin.password))) {
    return res.status(401).type('html').send(loginPage({ ...p, password: '' }, 'ChatGPT / AI assistant', 'Invalid email or password.'));
  }

  const code = jwt.sign(
    { typ: 'code', sub: admin.id, cid: p.client_id, ru: p.redirect_uri, cc: p.code_challenge || null },
    oauthSecret(),
    { expiresIn: CODE_TTL }
  );
  redirectWith(res, p.redirect_uri, { code, state: p.state });
});

oauthRouter.post('/token', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const clientId = clientIdFromRequest(req);
    const client = getClient(clientId);
    authenticateClient(req, client);
    const grant = String(req.body?.grant_type || '');

    if (grant === 'authorization_code') {
      let d: { typ: string; sub: string; cid: string; ru: string; cc: string | null };
      try {
        d = jwt.verify(String(req.body.code || ''), oauthSecret()) as typeof d;
      } catch {
        throw new OAuthError('invalid_grant', 'Authorization code is invalid or expired');
      }
      if (d.typ !== 'code' || d.cid !== clientId) throw new OAuthError('invalid_grant', 'Code was not issued to this client');
      if (req.body.redirect_uri && req.body.redirect_uri !== d.ru) throw new OAuthError('invalid_grant', 'redirect_uri mismatch');
      if (d.cc && !pkceOk(req.body.code_verifier, d.cc)) throw new OAuthError('invalid_grant', 'PKCE verification failed');
      return res.json(await issueTokens(d.sub, clientId));
    }

    if (grant === 'refresh_token') {
      let d: { typ: string; sub: string; cid: string };
      try {
        d = jwt.verify(String(req.body.refresh_token || ''), oauthSecret()) as typeof d;
      } catch {
        throw new OAuthError('invalid_grant', 'Refresh token is invalid or expired');
      }
      const cid = crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 32);
      if (d.typ !== 'refresh' || d.cid !== cid) throw new OAuthError('invalid_grant', 'Refresh token was not issued to this client');
      return res.json(await issueTokens(d.sub, clientId));
    }

    throw new OAuthError('unsupported_grant_type', `grant_type "${grant}" is not supported`);
  } catch (e: any) {
    if (e instanceof OAuthError) return res.status(e.status).json({ error: e.code, error_description: e.message });
    console.error('OAuth token error:', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/** RFC 7591 dynamic client registration (stateless: the client_id itself is a signed record). */
oauthRouter.post('/register', (req, res) => {
  const body = req.body || {};
  const redirectUris: string[] = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  const valid = redirectUris.length > 0 && redirectUris.every((u) => {
    try {
      const url = new URL(u);
      return url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname);
    } catch {
      return false;
    }
  });
  if (!valid) return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris must be https URLs' });

  const requested = String(body.token_endpoint_auth_method || 'client_secret_post');
  const method: Client['authMethod'] = ['none', 'client_secret_post', 'client_secret_basic'].includes(requested)
    ? (requested as Client['authMethod'])
    : 'client_secret_post';
  const clientId = jwt.sign({ typ: 'client', r: redirectUris, m: method }, oauthSecret());

  res.status(201).json({
    client_id: clientId,
    ...(method === 'none' ? {} : { client_secret: dcrSecretFor(clientId), client_secret_expires_at: 0 }),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: body.client_name,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: method,
    scope: SCOPE,
  });
});
