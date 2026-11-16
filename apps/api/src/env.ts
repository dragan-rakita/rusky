import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  origin: required('ORIGIN'),
  secret: required('BETTER_AUTH_SECRET'),
  port: Number(process.env.PORT ?? 1390),
  registrationOpen: process.env.REGISTRATION_OPEN === 'true',
};
