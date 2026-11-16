import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  grammarCardId,
  idNumber,
  normalizeClientRegistration,
  OAUTH_SCOPES,
  oauthResumeUrl,
  parseLevelFiles,
  readStoredList,
  redirectHost,
  rfc6749TokenError,
  signedOAuthQuery,
  slugify,
  toolScopes,
  wordId,
} from './index';

const files = {
  words:
    'id,lesson,category,target,native,english,note\nru-a1-w-001,1,Nouns,дом,kuća,house,masc.\n',
  lessons: 'number,title\n1,Greetings\n',
  topics: 'number,slug,summary\n5,present-tense,groups\n',
  grammar:
    '---\ntitle: x\n---\n\n# Notes\n\n## 5. Present tense\n\n| | знать |\n| --- | --- |\n| я | зна**ю** |\n',
  grammarCards:
    'id,topic,label,prompt,prompt_side,answer,answer_side,note\nru-a1-g-05-01,5,PRESENT,знать → ты,target,зна́ешь,target,‑шь\n',
};

describe('content files', () => {
  it('parses a level and renders its grammar notes', () => {
    const src = parseLevelFiles(files, 'ru', 'a1');
    expect(src.words[0]).toMatchObject({ id: 'ru-a1-w-001', lesson: 1, target: 'дом' });
    expect(src.topics[0]).toMatchObject({
      number: 5,
      slug: 'present-tense',
      title: 'Present tense',
    });
    const level = buildLevel(src, (md) => `<table>${md.includes('**ю**') ? 'ok' : ''}</table>`);
    expect(level.topics[0]).toMatchObject({ cardCount: 1 });
    expect(level.topics[0].html).toBe('<div class="table-wrap"><table>ok</table></div>');
    expect(level.lessons[0]).toEqual({ number: 1, title: 'Greetings', wordCount: 1 });
  });

  it('refuses a repeated id and a word in a lesson with no title', () => {
    const twice = files.words + 'ru-a1-w-001,1,Nouns,кот,mačka,cat,\n';
    expect(() => parseLevelFiles({ ...files, words: twice }, 'ru', 'a1')).toThrow(/used twice/);
    const stray = files.words + 'ru-a1-w-002,9,Nouns,кот,mačka,cat,\n';
    expect(() => parseLevelFiles({ ...files, words: stray }, 'ru', 'a1')).toThrow(/lesson 9/);
  });

  it('makes permanent ids and reads their numbers back', () => {
    expect(wordId('ru', 'a1', 170)).toBe('ru-a1-w-170');
    expect(grammarCardId('ru', 'a1', 5, 31)).toBe('ru-a1-g-05-31');
    expect(idNumber('ru-a1-w-170')).toBe(170);
    expect(slugify('"I have"')).toBe('i-have');
  });
});

describe('connector OAuth rules', () => {
  const claude = 'https://claude.ai/api/mcp/auth_callback';

  it('only registers clients that redirect to Claude', () => {
    expect(
      normalizeClientRegistration({ redirect_uris: ['https://evil.example/cb'] }, OAUTH_SCOPES),
    ).toEqual({
      error: 'Only Claude can register a client on this server',
    });
    const ok = normalizeClientRegistration(
      {
        redirect_uris: [claude],
        scope: 'cards unknown',
        contacts: [],
        token_endpoint_auth_method: 'client_secret_post',
      },
      OAUTH_SCOPES,
    );
    expect(ok).toEqual({
      body: {
        redirect_uris: [claude],
        scope: 'cards',
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
      },
    });
  });

  it('resumes sign-in only at the authorize endpoint, without the login prompt', () => {
    const search = '?client_id=c1&scope=cards&prompt=login+consent&exp=1&sig=abc';
    expect(oauthResumeUrl(search)).toBe(
      '/api/auth/oauth2/authorize?client_id=c1&scope=cards&prompt=consent',
    );
    expect(oauthResumeUrl('?next=https://evil.example')).toBeNull();
    expect(signedOAuthQuery('?a=1&sig=x&b=2')).toBe('a=1&sig=x');
    expect(redirectHost(`?redirect_uri=${encodeURIComponent(claude)}`)).toBe('claude.ai');
  });

  it('reads scope lists however they were stored', () => {
    expect(readStoredList(JSON.stringify(JSON.stringify(['cards', 'offline_access'])))).toEqual([
      'cards',
      'offline_access',
    ]);
    expect(toolScopes('cards offline_access')).toEqual(['cards']);
    expect(toolScopes(['offline_access'])).toEqual([]);
  });

  it('turns a dead grant into invalid_grant so Claude reconnects', () => {
    expect(rfc6749TokenError(400, { error: 'invalid_request' }, 'refresh_token')).toEqual({
      status: 400,
      body: { error: 'invalid_grant' },
    });
    expect(rfc6749TokenError(400, { error: 'invalid_request' }, 'authorization_code')).toBeNull();
  });
});
