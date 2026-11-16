import {
  intervalFor,
  type Card,
  type CardState,
  type Grade,
  type Language,
  type LevelContent,
  type Side,
} from '@rusky/core';

export function intervalLabel(days: number): string {
  if (days === 1) return 'tomorrow';
  if (days === 7) return 'in a week';
  if (days === 14) return 'in 2 weeks';
  return `in ${days} days`;
}

/** The second line of a grade button: when the card comes back if graded this way. */
export function gradeHint(state: CardState, grade: Grade): string {
  return grade === 'done' ? 'never again' : intervalLabel(intervalFor(state, grade));
}

export function frontSideFor(card: Card, choice: FirstSideChoice, index: number): Side {
  if (card.kind === 'grammar') return card.promptSide;
  if (choice === 'mix') return index % 2 === 0 ? 'target' : 'native';
  return choice;
}

/**
 * Both faces of a card and what shows under it once turned: a word's note, or a grammar
 * card's rule and topic. A word is only its text; a grammar card carries its task as a label.
 */
export function describeCard(card: Card, front: Side, language: Language, level: LevelContent) {
  const langTag = (side: Side) => (side === 'target' ? language.code : language.native);

  if (card.kind === 'word') {
    const back: Side = front === 'target' ? 'native' : 'target';
    const text = (side: Side) => (side === 'target' ? card.target : card.native);
    const details: CardDetail[] = card.note ? [{ key: 'NOTE', value: card.note }] : [];
    return {
      front: { side: front, text: text(front), lang: langTag(front) } satisfies CardFace,
      back: { side: back, text: text(back), lang: langTag(back) } satisfies CardFace,
      details,
    };
  }

  const topic = level.topics.find((t) => t.number === card.topic);
  const details: CardDetail[] = [];
  if (card.note) details.push({ key: 'RULE', value: card.note });
  if (topic) details.push({ key: 'TOPIC', value: topic.title, href: `/grammar/${topic.slug}` });
  return {
    front: {
      side: card.promptSide,
      label: card.label,
      text: card.prompt,
      lang: langTag(card.promptSide),
    } satisfies CardFace,
    back: {
      side: card.answerSide,
      label: 'ANSWER',
      text: card.answer,
      lang: langTag(card.answerSide),
    } satisfies CardFace,
    details,
  };
}
