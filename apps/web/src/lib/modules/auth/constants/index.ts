/** The last signed-in user, so the app knows who it syncs for while offline. */
export const AUTH_USER_KEY = 'rusky.user';

/**
 * The only routes a signed-out visitor reaches. Both take part in the Claude connector's
 * OAuth flow, which arrives signed out.
 */
export const PUBLIC_ROUTES = ['/login', '/consent'];

export const MIN_PASSWORD_LENGTH = 8;
