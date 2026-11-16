import type { Card, Language, LevelContent, Side } from '@rusky/core';

type Labels = { targetCode: string; nativeCode: string };

export function intervalLabel(days: number): string {
  if (days === 1) return 'tomorrow';
  if (days === 7) return 'in a week';
  if (days === 14) return 'in 2 weeks';
  return `in ${days} days`;
}

export function frontSideFor(card: Card, choice: FirstSideChoice, index: number): Side {
  if (card.kind === 'grammar') return card.promptSide;
  if (choice === 'mix') return index % 2 === 0 ? 'target' : 'native';
  return choice;
}

/** Both faces of a card, the strip above the text, and what shows under it once turned. */
export function describeCard(
  card: Card,
  front: Side,
  language: Language,
  level: LevelContent,
  labels: Labels,
  showEnglish: boolean,
) {
  const langTag = (side: Side) => (side === 'target' ? language.code : language.native);
  const code = (side: Side) => (side === 'target' ? labels.targetCode : labels.nativeCode);

  if (card.kind === 'word') {
    const back: Side = front === 'target' ? 'native' : 'target';
    const text = (side: Side) => (side === 'target' ? card.target : card.native);
    const details: CardDetail[] = [];
    if (showEnglish && card.english) details.push({ key: 'EN', value: card.english });
    if (card.note) details.push({ key: 'NOTE', value: card.note });
    details.push({ key: 'FROM', value: `Lesson ${card.lesson} · ${card.category}` });
    return {
      front: {
        side: front,
        label: code(front),
        text: text(front),
        lang: langTag(front),
      } satisfies CardFace,
      back: {
        side: back,
        label: code(back),
        text: text(back),
        lang: langTag(back),
      } satisfies CardFace,
      meta: `L${card.lesson} · ${card.category.toUpperCase()}`,
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
    meta: '',
    details,
  };
}
