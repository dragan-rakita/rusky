import type { auth } from './auth';

type Session = typeof auth.$Infer.Session;

export type AppEnv = {
  Variables: {
    user: Session['user'] | null;
    session: Session['session'] | null;
  };
};
