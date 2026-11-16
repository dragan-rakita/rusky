import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpGrant } from '../oauth/access-token';
import { registerCardTools } from './tools';

/** Sent to Claude when it connects: how the tools are meant to be used together. */
const INSTRUCTIONS = [
  "Rusky holds the user's flash cards and grammar notes for the language they are learning (Russian, level A1 first), with Serbian in Cyrillic script on the other side of each card. They practise them on their phone with a box system.",
  'Call get_overview first: it lists the lessons and grammar topics, and the cards the user keeps missing. Revise those in a lesson.',
  'When a lesson introduces words, add them with add_words at the end of the lesson, in that lesson; list_words first if unsure what is there. Duplicates are skipped and reported.',
  'Write Russian with stress marks: a combining acute accent (U+0301) right after the stressed vowel, as in хорошо́ or Здра́вствуйте. ё needs none. The app colours the stressed vowel red.',
  'Serbian goes in Cyrillic script (ћирилица), in the ijekavian form the user speaks in Republika Srpska: вријеме, дјевојка, лијеп, видјети, гдје, не разумијем, never the ekavian време, девојка, леп or Latin script. If you find Serbian still in Latin script or ekavian, offer to fix it with update_word or update_grammar_card.',
  'English is a short gloss. A note is a short memory aid: gender, an irregular form, a false friend.',
  'Grammar: keep one topic per grammar point, notes in Markdown with tables, and add drill cards for it with add_grammar_cards. Read a topic with get_grammar_topic before replacing its notes.',
  'Fill-the-gap drills (add_gap_drills) are where most grammar practice happens: many short example sentences per topic, each with one part to type. get_overview shows gapDrills per topic; topics with few need more.',
  'Fix a mistake with update_word or update_grammar_card, which keep the card id and its progress. Never remove anything unless the user asks; name what you will remove and wait for them to confirm.',
  'After saving, tell the user briefly what was added or changed. The app picks it up on its next sync.',
].join('\n');

export function createMcpServer(grant: McpGrant): McpServer {
  const server = new McpServer(
    { name: 'rusky', title: 'Rusky', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );
  if (grant.scopes.includes('cards')) registerCardTools(server, grant.userId);
  return server;
}
