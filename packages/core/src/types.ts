/** Which side of a card: the language being learned, or the one you already speak. */
export type Side = 'target' | 'native';

export type Grade = 'again' | 'almost' | 'knew';

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

export type GrammarCard = {
  kind: 'grammar';
  id: string;
  topic: number;
  label: string;
  prompt: string;
  promptSide: Side;
  answer: string;
  answerSide: Side;
  note: string;
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
  /** BCP 47 tag of the language on the other side of the card, e.g. sr-Latn. */
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
