import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

/**
 * Every grade ever given, append-only. Card boxes are never stored: each device
 * replays these, so reviews made offline on two phones merge without conflicts.
 * `seq` is the sync cursor; `id` is made by the device, so a retried upload is a no-op.
 */
export const review = sqliteTable(
  'review',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    id: text('id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    grade: text('grade', { enum: ['again', 'almost', 'knew', 'done'] }).notNull(),
    firstSide: text('first_side', { enum: ['target', 'native'] }).notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
    receivedAt: integer('received_at').default(now).notNull(),
  },
  (table) => [
    uniqueIndex('review_user_id_idx').on(table.userId, table.id),
    index('review_user_seq_idx').on(table.userId, table.seq),
  ],
);

// ─── OAuth server (@better-auth/oauth-provider) for the Claude connector ───
// The `json` columns hold what better-auth writes: on SQLite the adapter serialises
// arrays itself before drizzle serialises them again, so read them with readStoredList.

export const oauthClient = sqliteTable('oauth_client', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'),
  disabled: integer('disabled', { mode: 'boolean' }).default(false),
  skipConsent: integer('skip_consent', { mode: 'boolean' }),
  enableEndSession: integer('enable_end_session', { mode: 'boolean' }),
  scopes: text('scopes', { mode: 'json' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  name: text('name'),
  uri: text('uri'),
  icon: text('icon'),
  contacts: text('contacts', { mode: 'json' }),
  tos: text('tos'),
  policy: text('policy'),
  softwareId: text('software_id'),
  softwareVersion: text('software_version'),
  softwareStatement: text('software_statement'),
  redirectUris: text('redirect_uris', { mode: 'json' }).notNull(),
  postLogoutRedirectUris: text('post_logout_redirect_uris', { mode: 'json' }),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
  grantTypes: text('grant_types', { mode: 'json' }),
  responseTypes: text('response_types', { mode: 'json' }),
  public: integer('public', { mode: 'boolean' }),
  type: text('type'),
  referenceId: text('reference_id'),
  metadata: text('metadata', { mode: 'json' }),
});

export const oauthRefreshToken = sqliteTable('oauth_refresh_token', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  clientId: text('client_id')
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => session.id, { onDelete: 'set null' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  revoked: integer('revoked', { mode: 'timestamp_ms' }),
  scopes: text('scopes', { mode: 'json' }).notNull(),
});

export const oauthAccessToken = sqliteTable('oauth_access_token', {
  id: text('id').primaryKey(),
  token: text('token').unique(),
  clientId: text('client_id')
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => session.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  refreshId: text('refresh_id').references(() => oauthRefreshToken.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  scopes: text('scopes', { mode: 'json' }).notNull(),
});

export const oauthConsent = sqliteTable('oauth_consent', {
  id: text('id').primaryKey(),
  clientId: text('client_id')
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  scopes: text('scopes', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  oauthClients: many(oauthClient),
  oauthRefreshTokens: many(oauthRefreshToken),
  oauthAccessTokens: many(oauthAccessToken),
  oauthConsents: many(oauthConsent),
}));

export const sessionRelations = relations(session, ({ one, many }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
  oauthRefreshTokens: many(oauthRefreshToken),
  oauthAccessTokens: many(oauthAccessToken),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const oauthClientRelations = relations(oauthClient, ({ one, many }) => ({
  user: one(user, { fields: [oauthClient.userId], references: [user.id] }),
  oauthRefreshTokens: many(oauthRefreshToken),
  oauthAccessTokens: many(oauthAccessToken),
  oauthConsents: many(oauthConsent),
}));

export const oauthRefreshTokenRelations = relations(oauthRefreshToken, ({ one, many }) => ({
  oauthClient: one(oauthClient, {
    fields: [oauthRefreshToken.clientId],
    references: [oauthClient.clientId],
  }),
  session: one(session, { fields: [oauthRefreshToken.sessionId], references: [session.id] }),
  user: one(user, { fields: [oauthRefreshToken.userId], references: [user.id] }),
  oauthAccessTokens: many(oauthAccessToken),
}));

export const oauthAccessTokenRelations = relations(oauthAccessToken, ({ one }) => ({
  oauthClient: one(oauthClient, {
    fields: [oauthAccessToken.clientId],
    references: [oauthClient.clientId],
  }),
  session: one(session, { fields: [oauthAccessToken.sessionId], references: [session.id] }),
  user: one(user, { fields: [oauthAccessToken.userId], references: [user.id] }),
  oauthRefreshToken: one(oauthRefreshToken, {
    fields: [oauthAccessToken.refreshId],
    references: [oauthRefreshToken.id],
  }),
}));

export const oauthConsentRelations = relations(oauthConsent, ({ one }) => ({
  oauthClient: one(oauthClient, {
    fields: [oauthConsent.clientId],
    references: [oauthClient.clientId],
  }),
  user: one(user, { fields: [oauthConsent.userId], references: [user.id] }),
}));

// ─── Learning content, per account ───
// Seeded from the repo's content/ folder the first time an account is used; after that
// these rows are the truth, edited by the Claude connector. Card ids are permanent:
// reviews point at them.

/** One row per account: bumped by every content change, so devices know to refetch. */
export const contentState = sqliteTable('content_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  seededAt: integer('seeded_at', { mode: 'timestamp_ms' }).default(now).notNull(),
});

export const lesson = sqliteTable(
  'lesson',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    level: text('level').notNull(),
    number: integer('number').notNull(),
    title: text('title').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.language, t.level, t.number] })],
);

export const word = sqliteTable(
  'word',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    language: text('language').notNull(),
    level: text('level').notNull(),
    lesson: integer('lesson').notNull(),
    category: text('category').notNull().default(''),
    target: text('target').notNull(),
    native: text('native').notNull(),
    english: text('english').notNull().default(''),
    note: text('note').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('word_level_idx').on(t.userId, t.language, t.level),
  ],
);

export const grammarTopic = sqliteTable(
  'grammar_topic',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    level: text('level').notNull(),
    number: integer('number').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    markdown: text('markdown').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.language, t.level, t.number] })],
);

export const grammarCard = sqliteTable(
  'grammar_card',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    language: text('language').notNull(),
    level: text('level').notNull(),
    topic: integer('topic').notNull(),
    label: text('label').notNull(),
    prompt: text('prompt').notNull(),
    promptSide: text('prompt_side', { enum: ['target', 'native'] }).notNull(),
    answer: text('answer').notNull(),
    answerSide: text('answer_side', { enum: ['target', 'native'] }).notNull(),
    note: text('note').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(now).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('grammar_card_level_idx').on(t.userId, t.language, t.level),
  ],
);
