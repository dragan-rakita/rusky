import { count } from 'drizzle-orm';
import { betterAuth } from 'better-auth/minimal';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oauthProvider } from '@better-auth/oauth-provider';
import {
  mcpResourceUrl,
  OAUTH_ACCESS_TOKEN_TTL_SEC,
  OAUTH_REFRESH_TOKEN_TTL_SEC,
  OAUTH_SCOPES,
} from '@rusky/core';
import { db } from './db';
import * as schema from './db/schema';
import { env } from './env';
import { claudeOnlyRegistration } from './oauth/registration-gate';
import { hashOAuthToken } from './oauth/token-hash';

export async function isRegistrationOpen(): Promise<boolean> {
  if (env.registrationOpen) return true;
  const [row] = await db.select({ n: count() }).from(schema.user);
  return row.n === 0;
}

export const auth = betterAuth({
  baseURL: env.origin,
  basePath: '/api/auth',
  secret: env.secret,
  trustedOrigins: [env.origin],
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  emailAndPassword: { enabled: true },
  session: {
    // A phone that is opened every few days should never be signed out.
    expiresIn: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
    // The OAuth plugin refuses to start whenever `session` is set without this, even with
    // no secondary storage. Sessions are in the database either way.
    storeSessionInDatabase: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!(await isRegistrationOpen())) {
            throw new APIError('FORBIDDEN', { message: 'Registration is closed' });
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [
    // The authorization server for the Claude connector at /mcp, as in Holocron.
    claudeOnlyRegistration(),
    oauthProvider({
      loginPage: '/login',
      consentPage: '/consent',
      scopes: OAUTH_SCOPES,
      validAudiences: [mcpResourceUrl(env.origin)],
      grantTypes: ['authorization_code', 'refresh_token'],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // Opaque tokens are rows, so revoking a connection stops its next call.
      disableJwtPlugin: true,
      storeTokens: { hash: hashOAuthToken },
      accessTokenExpiresIn: OAUTH_ACCESS_TOKEN_TTL_SEC,
      refreshTokenExpiresIn: OAUTH_REFRESH_TOKEN_TTL_SEC,
    }),
  ],
});
