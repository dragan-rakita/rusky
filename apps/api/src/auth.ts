import { count } from 'drizzle-orm';
import { betterAuth } from 'better-auth/minimal';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';
import { env } from './env';

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
});
