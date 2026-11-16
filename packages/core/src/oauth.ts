// The Claude connector's OAuth rules, shared by the API (which enforces them) and the
// web app (whose sign-in and consent pages take part in the flow). Ported from Holocron.

export const MCP_PATH = '/mcp';

/** The one tool scope: read and edit words, grammar and progress. */
export const MCP_TOOL_SCOPES = ['cards'] as const;
export type McpToolScope = (typeof MCP_TOOL_SCOPES)[number];

/** `offline_access` is what makes the OAuth server issue a refresh token. */
export const OAUTH_SCOPES = [...MCP_TOOL_SCOPES, 'offline_access'];

/**
 * The only redirects a dynamically registered client may declare: Claude's hosted
 * callback, on both of Anthropic's domains. Anything else would let whoever registers
 * the client receive the authorization code.
 */
export const OAUTH_ALLOWED_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
];

export const OAUTH_REGISTER_PATH = '/api/auth/oauth2/register';
export const OAUTH_TOKEN_PATH = '/api/auth/oauth2/token';
export const OAUTH_AUTHORIZE_PATH = '/api/auth/oauth2/authorize';
export const OAUTH_CONSENT_PATH = '/api/auth/oauth2/consent';
export const OAUTH_PUBLIC_CLIENT_PATH = '/api/auth/oauth2/public-client';

/** What each scope lets the client do, as the consent screen words it. */
export const OAUTH_SCOPE_LABELS: Record<string, string> = {
  cards: 'Read your words, grammar notes and progress, and add or change words and grammar',
  offline_access: 'Stay connected until you disconnect it',
};

export const OAUTH_ACCESS_TOKEN_TTL_SEC = 60 * 60;
export const OAUTH_REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

/** Must equal, character for character, the URL entered in Claude. */
export function mcpResourceUrl(origin: string): string {
  return `${origin}${MCP_PATH}`;
}

/** better-auth mounts at /api/auth, and the OAuth server takes its base URL as issuer. */
export function oauthIssuerUrl(origin: string): string {
  return `${origin}/api/auth`;
}

type Registration = Record<string, unknown>;

const GRANT_TYPES = ['authorization_code', 'refresh_token'];
const RESPONSE_TYPES = ['code'];

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : null;
}

/**
 * A client registration as this server accepts it, or why it is refused. Only the
 * redirect is a reason to refuse; the rest is corrected (RFC 7591 lets the server
 * replace metadata), because the OAuth plugin rejects a registration outright over
 * details Claude does not always send the way it expects: every client is made public
 * (PKCE, no secret), unknown scopes are dropped, both grants are granted, and empty
 * lists the plugin requires to be non-empty are removed.
 */
export function normalizeClientRegistration(
  body: Registration,
  supportedScopes: readonly string[],
): { body: Registration } | { error: string } {
  const redirects = strings(body.redirect_uris);
  if (
    !redirects ||
    redirects.length === 0 ||
    !redirects.every((uri) => OAUTH_ALLOWED_REDIRECT_URIS.includes(uri))
  ) {
    return { error: 'Only Claude can register a client on this server' };
  }

  const normalized: Registration = { ...body, token_endpoint_auth_method: 'none' };
  delete normalized.type;

  const scopes =
    typeof body.scope === 'string'
      ? body.scope.split(' ').filter((s) => supportedScopes.includes(s))
      : [];
  if (scopes.length) normalized.scope = scopes.join(' ');
  else delete normalized.scope;

  // Without refresh_token the connection would lapse after an hour.
  normalized.grant_types = GRANT_TYPES;

  const responses = (strings(body.response_types) ?? []).filter((v) => RESPONSE_TYPES.includes(v));
  if (responses.length) normalized.response_types = responses;
  else delete normalized.response_types;

  for (const key of ['contacts', 'post_logout_redirect_uris']) {
    if (Array.isArray(body[key]) && (body[key] as unknown[]).length === 0) delete normalized[key];
  }

  return { body: normalized };
}

/**
 * The part of an OAuth redirect's query the server signed: every parameter up to and
 * including `sig`, in their original order. The consent endpoint re-signs exactly this.
 */
export function signedOAuthQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has('sig')) return null;
  const signed = new URLSearchParams();
  for (const [key, value] of params) {
    signed.append(key, value);
    if (key === 'sig') break;
  }
  return signed.toString();
}

/**
 * Where a sign-in continues when the OAuth server sent the browser to /login: back to
 * the authorize endpoint, which checks every parameter again. Always that fixed path,
 * so a crafted /login link cannot redirect anywhere else.
 */
export function oauthResumeUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has('sig') || !params.has('client_id')) return null;
  params.delete('sig');
  params.delete('exp');
  // The login prompt is what sent the browser here; kept, it would loop.
  const prompt = (params.get('prompt') ?? '')
    .split(' ')
    .filter((p) => p && p !== 'login')
    .join(' ');
  if (prompt) params.set('prompt', prompt);
  else params.delete('prompt');
  return `${OAUTH_AUTHORIZE_PATH}?${params}`;
}

/** The host an authorization code will be sent to, for the consent screen to name. */
export function redirectHost(search: string): string | null {
  const uri = new URLSearchParams(search).get('redirect_uri');
  if (!uri || !URL.canParse(uri)) return null;
  return new URL(uri).host;
}

/**
 * A list column the OAuth plugin wrote. better-auth serialises the array before drizzle
 * serialises the column, so the value can arrive as an array or as JSON of one, nested.
 */
export function readStoredList(value: unknown): string[] {
  let current = value;
  for (let depth = 0; depth < 3; depth++) {
    if (typeof current !== 'string') break;
    const text = current;
    try {
      current = JSON.parse(text);
    } catch {
      return text.split(' ').filter(Boolean);
    }
  }
  return Array.isArray(current) ? current.filter((s): s is string => typeof s === 'string') : [];
}

export function toolScopes(value: unknown): McpToolScope[] {
  const granted = readStoredList(value);
  return MCP_TOOL_SCOPES.filter((scope) => granted.includes(scope));
}

/**
 * RFC 6749 codes for the token endpoint. The plugin answers a dead refresh token and a
 * failed PKCE check with `invalid_request`, and a used or expired code with codes of its
 * own; Claude only reads `invalid_grant` as "authorize again".
 */
export function rfc6749TokenError(
  status: number,
  body: unknown,
  grantType: string | null,
): { status: number; body: Record<string, unknown> } | null {
  if (status !== 400 && status !== 401) return null;
  if (!body || typeof body !== 'object' || !('error' in body)) return null;
  const { error } = body as { error: unknown };
  const grantIsBad =
    error === 'invalid_verification' ||
    error === 'invalid_user' ||
    (error === 'invalid_request' && (grantType === 'refresh_token' || status === 401));
  return grantIsBad ? { status: 400, body: { ...body, error: 'invalid_grant' } } : null;
}
