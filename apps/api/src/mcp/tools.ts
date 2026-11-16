import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { localDay, plainText } from '@rusky/core';
import { languages } from '../content/files';
import { levelOverview } from '../content/overview';
import {
  addGrammarCards,
  addWords,
  ContentProblem,
  levelSources,
  removeGrammarCard,
  removeWord,
  saveTopic,
  setLessonTitle,
  updateGrammarCard,
  updateWord,
  type Scope,
} from '../content/store';

const LEVEL_PATTERN = /^[abc][12]$/;

const json = (data: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
});

const problem = (message: string): CallToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

const levelArgs = {
  language: z
    .string()
    .optional()
    .describe(
      `Language code: ${languages.map((l) => l.code).join(', ')}. Defaults to ${languages[0].code}.`,
    ),
  level: z
    .string()
    .optional()
    .describe('CEFR level in lower case: a1, a2, b1… Defaults to the first level.'),
};

const side = z.enum(['target', 'native']);

const wordFields = {
  target: z
    .string()
    .min(1)
    .describe('The word or phrase in the language being learned, with stress marks'),
  native: z
    .string()
    .min(1)
    .describe('The Serbian side, in Cyrillic script and ijekavian (вријеме, not време)'),
  english: z.string().optional().describe('A short English gloss'),
  category: z.string().optional().describe('Greetings, Nouns, Verbs, Numbers, Time, Phrases…'),
  note: z
    .string()
    .optional()
    .describe('A short memory aid: gender, an irregular form, a false friend'),
};

const cardFields = {
  label: z
    .string()
    .min(1)
    .describe(
      'Short kind of drill, shown above the prompt: "PRESENT · GROUP 1", "FIX THE MISTAKE"',
    ),
  prompt: z.string().min(1).describe('The question side: "знать → ты", "Imam auto."'),
  promptSide: side.describe(
    'target if the prompt is in the language being learned, native if Serbian',
  ),
  answer: z.string().min(1).describe('The answer side: "зна́ешь"'),
  answerSide: side,
  note: z.string().optional().describe('The rule, shown after flipping'),
};

function scopeFor(userId: string, language?: string, level?: string): Scope {
  const lang = languages.find((l) => l.code === (language ?? languages[0].code));
  if (!lang) {
    throw new ContentProblem(
      `Unknown language "${language}". Known: ${languages.map((l) => l.code).join(', ')}.`,
    );
  }
  const lvl = (level ?? lang.levels[0]).toLowerCase();
  if (!LEVEL_PATTERN.test(lvl))
    throw new ContentProblem(`Level must look like a1, a2, b1; got "${level}".`);
  return { userId, language: lang.code, level: lvl };
}

/** A tool body whose content errors come back to Claude as a readable message. */
function safely<A>(fn: (args: A) => unknown) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return json(fn(args));
    } catch (e) {
      if (e instanceof ContentProblem) return problem(e.message);
      throw e;
    }
  };
}

const readOnly = { readOnlyHint: true, openWorldHint: false };
const writes = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const removes = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

export function registerCardTools(server: McpServer, userId: string) {
  server.registerTool(
    'get_overview',
    {
      title: 'Overview',
      description:
        "Start here. The level's lessons (with word counts) and grammar topics (with drill-card counts), and how the learner is doing: cards per box, how many they marked done for good, how many are due, practice in the last 7 days, and the cards they missed most in the last 30 days — the ones worth revising in a lesson.",
      inputSchema: {
        ...levelArgs,
        today: z.iso
          .date()
          .optional()
          .describe(
            "The user's local date as YYYY-MM-DD; the server's clock can be a day off near midnight.",
          ),
      },
      annotations: readOnly,
    },
    safely(({ language, level, today }) =>
      levelOverview(scopeFor(userId, language, level), today ?? localDay(Date.now())),
    ),
  );

  server.registerTool(
    'list_words',
    {
      title: 'List words',
      description:
        'Words with their ids, lesson, category, both sides, English and note. Filter by lesson, category or a search (matches either side or the English, ignoring stress marks). Check here before adding words.',
      inputSchema: {
        ...levelArgs,
        lesson: z.number().int().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      },
      annotations: readOnly,
    },
    safely(({ language, level, lesson, category, search }) => {
      const q = search ? plainText(search) : '';
      return levelSources(scopeFor(userId, language, level)).words.filter(
        (w) =>
          (lesson === undefined || w.lesson === lesson) &&
          (!category || w.category.toLowerCase() === category.toLowerCase()) &&
          (!q ||
            plainText(w.target).includes(q) ||
            w.native.toLowerCase().includes(q) ||
            w.english.toLowerCase().includes(q)),
      );
    }),
  );

  server.registerTool(
    'add_words',
    {
      title: 'Add words',
      description:
        'Adds words to a lesson as new flash cards. A word already in the level (same text, ignoring stress marks) is skipped and reported with its id. Pass lessonTitle to create a new lesson or rename one. Each new word gets a permanent id, which its progress is stored against.',
      inputSchema: {
        ...levelArgs,
        lesson: z.number().int().positive(),
        lessonTitle: z.string().optional().describe('Required when the lesson does not exist yet'),
        words: z.array(z.object(wordFields)).min(1).max(200),
      },
      annotations: writes,
    },
    safely(({ language, level, lesson, lessonTitle, words }) =>
      addWords(scopeFor(userId, language, level), lesson, lessonTitle, words),
    ),
  );

  server.registerTool(
    'update_word',
    {
      title: 'Correct a word',
      description:
        'Changes a word in place — a typo, a missing stress mark, a better translation, another lesson. The id and the progress stay. Pass only the fields that change.',
      inputSchema: {
        ...levelArgs,
        id: z.string(),
        target: wordFields.target.optional(),
        native: wordFields.native.optional(),
        english: wordFields.english,
        category: wordFields.category,
        note: wordFields.note,
        lesson: z.number().int().positive().optional(),
      },
      annotations: writes,
    },
    safely(({ language, level, id, ...patch }) =>
      updateWord(scopeFor(userId, language, level), id, patch),
    ),
  );

  server.registerTool(
    'remove_word',
    {
      title: 'Remove a word',
      description:
        'Deletes a word card. Its id is never reused. Only when the user asked for it: say which word first and wait for their confirmation.',
      inputSchema: { ...levelArgs, id: z.string() },
      annotations: removes,
    },
    safely(({ language, level, id }) => removeWord(scopeFor(userId, language, level), id)),
  );

  server.registerTool(
    'set_lesson_title',
    {
      title: 'Name a lesson',
      description: 'Creates a lesson or renames it. The title is what the app shows, e.g. "Café".',
      inputSchema: { ...levelArgs, lesson: z.number().int().positive(), title: z.string().min(1) },
      annotations: writes,
    },
    safely(({ language, level, lesson, title }) =>
      setLessonTitle(scopeFor(userId, language, level), lesson, title),
    ),
  );

  server.registerTool(
    'get_grammar_topic',
    {
      title: 'Grammar topic',
      description: 'One grammar topic: its notes as Markdown, and its drill cards with their ids.',
      inputSchema: {
        ...levelArgs,
        topic: z.string().describe('The topic number ("5") or its slug ("present-tense")'),
      },
      annotations: readOnly,
    },
    safely(({ language, level, topic }) => {
      const src = levelSources(scopeFor(userId, language, level));
      const t = src.topics.find(
        (x) => String(x.number) === topic.trim() || x.slug === topic.trim(),
      );
      if (!t) {
        throw new ContentProblem(
          `No topic "${topic}". Topics: ${src.topics.map((x) => `${x.number} ${x.slug}`).join(', ')}.`,
        );
      }
      return { ...t, cards: src.grammarCards.filter((c) => c.topic === t.number) };
    }),
  );

  server.registerTool(
    'save_grammar_topic',
    {
      title: 'Save grammar notes',
      description:
        "Creates a grammar topic or replaces its notes. The Markdown is the whole topic body (without its '## N. Title' heading): short prose, tables, lists, '### ' subheadings. In tables, bold the part to learn (зна**ю**); it shows in red. Read the topic first when changing one, so nothing the user wrote is lost.",
      inputSchema: {
        ...levelArgs,
        number: z.number().int().positive(),
        title: z.string().min(1),
        summary: z
          .string()
          .optional()
          .describe('One line for the topic list, e.g. "‑л · ‑ла · ‑ло · ‑ли"'),
        markdown: z.string().min(1),
        slug: z.string().optional().describe('URL name; made from the title when omitted'),
      },
      annotations: writes,
    },
    safely(({ language, level, ...topic }) => saveTopic(scopeFor(userId, language, level), topic)),
  );

  server.registerTool(
    'add_grammar_cards',
    {
      title: 'Add grammar drill cards',
      description:
        'Adds flip cards that drill a grammar topic: one prompt and its answer each, like a conjugation (знать → ты / зна́ешь), a case form, a mistake to fix, a false friend or a sentence to say in Russian.',
      inputSchema: {
        ...levelArgs,
        topic: z.number().int().positive(),
        cards: z.array(z.object(cardFields)).min(1).max(100),
      },
      annotations: writes,
    },
    safely(({ language, level, topic, cards }) =>
      addGrammarCards(scopeFor(userId, language, level), topic, cards),
    ),
  );

  server.registerTool(
    'update_grammar_card',
    {
      title: 'Correct a grammar card',
      description:
        'Changes a grammar card in place; its id and progress stay. Pass only the fields that change.',
      inputSchema: {
        ...levelArgs,
        id: z.string(),
        label: cardFields.label.optional(),
        prompt: cardFields.prompt.optional(),
        promptSide: side.optional(),
        answer: cardFields.answer.optional(),
        answerSide: side.optional(),
        note: z.string().optional(),
      },
      annotations: writes,
    },
    safely(({ language, level, id, ...patch }) =>
      updateGrammarCard(scopeFor(userId, language, level), id, patch),
    ),
  );

  server.registerTool(
    'remove_grammar_card',
    {
      title: 'Remove a grammar card',
      description:
        'Deletes a grammar card. Only when the user asked for it: name the card first and wait for confirmation.',
      inputSchema: { ...levelArgs, id: z.string() },
      annotations: removes,
    },
    safely(({ language, level, id }) => removeGrammarCard(scopeFor(userId, language, level), id)),
  );
}
