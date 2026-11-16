/** Which side of a card: the language being learned, or the one you already speak. */
export type Side = 'target' | 'native';

/** `done` retires a card: it never comes back until it is graded again. */
export type Grade = 'again' | 'almost' | 'knew' | 'done';

/** The grades that keep a card in the boxes. */
export type BoxGrade = Exclude<Grade, 'done'>;

export type WordCard = {
  kind: 'word';
  id: string;
  lesson: number;
  category: string;
  target: string;
  native: string;
  english: string;
  note: string;
};

/** `flip`: turn the card over and grade yourself. `gap`: type the missing part of a sentence. */
export type GrammarMode = 'flip' | 'gap';

export type GrammarCard = {
  kind: 'grammar';
  id: string;
  topic: number;
  label: string;
  /** For a gap card, the whole sentence with the part to type in brackets: `Я [чита́ю] кни́гу.` */
  prompt: string;
  promptSide: Side;
  /** For a gap card, the first answer in the brackets. */
  answer: string;
  answerSide: Side;
  note: string;
  mode: GrammarMode;
  /** Gap cards: what to change, shown in the gap (`чита́ть`), or empty. */
  hint: string;
  /** Gap cards: the whole sentence in the native language. */
  translation: string;
};

export type Card = WordCard | GrammarCard;

export type Lesson = {
  number: number;
  title: string;
  wordCount: number;
};

export type GrammarTopic = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  html: string;
  cardCount: number;
};

export type LevelContent = {
  language: string;
  level: string;
  lessons: Lesson[];
  words: WordCard[];
  topics: GrammarTopic[];
  grammarCards: GrammarCard[];
};

export type Language = {
  code: string;
  name: string;
  english: string;
  /** BCP 47 tag of the language on the other side of the card, e.g. sr-Cyrl. */
  native: string;
  nativeName: string;
  /** Weekday names starting on Sunday, with stress marks. */
  weekdays: string[];
  levels: string[];
};

export type ReviewEvent = {
  id: string;
  cardId: string;
  grade: Grade;
  /** Epoch milliseconds on the device that graded the card. */
  reviewedAt: number;
  firstSide: Side;
};

export type CardState = {
  box: number;
  /** Local calendar day (YYYY-MM-DD) the card comes back, or null before its first review. */
  due: string | null;
  reviews: number;
  introduced: string | null;
  lastGrade: Grade | null;
  /** Retired with `done`: out of every review and every stack. */
  done: boolean;
};

export type SyncRequest = {
  since: number;
  events: ReviewEvent[];
};

export type SyncResponse = {
  cursor: number;
  events: ReviewEvent[];
  /** Bumped by every change to the account's words or grammar; a new value means refetch. */
  contentVersion: number;
};

/** An app the account let in through the connector, as the profile screen lists it. */
export type Connection = {
  clientId: string;
  name: string;
  /** Epoch milliseconds of the consent, or null when the server did not record it. */
  connectedAt: number | null;
};

export type ConnectionsResponse = {
  connections: Connection[];
};

/** A grammar topic as written: Markdown, before it is rendered for the app. */
export type GrammarTopicSource = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  markdown: string;
};

/** One level's content as stored, before the grammar notes are rendered. */
export type LevelSources = {
  language: string;
  level: string;
  lessons: { number: number; title: string }[];
  words: WordCard[];
  topics: GrammarTopicSource[];
  grammarCards: GrammarCard[];
};

export type ContentResponse = {
  version: number;
  levels: Record<string, LevelContent>;
};
