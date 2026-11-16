import { describe, expect, it } from 'vitest';
import { checkGap, fillGap, normalizeAnswer, parseGap, parseLevelFiles } from './index';

describe('gap sentences', () => {
  it('splits a sentence around its one gap', () => {
    expect(parseGap('Я [чита́ю] кни́гу.')).toEqual({
      before: 'Я ',
      answers: ['чита́ю'],
      after: ' кни́гу.',
    });
    expect(parseGap('[Его́ | Него́] нет.')?.answers).toEqual(['Его́', 'Него́']);
    expect(parseGap('Я [чита́ю|чита́ю] кни́гу.')?.answers).toEqual(['чита́ю']);
    expect(fillGap('Я [чита́ю|чита́ла] кни́гу.')).toBe('Я чита́ю кни́гу.');
  });

  it('refuses no gap, two gaps, an empty gap and a stray bracket', () => {
    expect(parseGap('Я чита́ю кни́гу.')).toBeNull();
    expect(parseGap('Я [чита́ю] [но́вую] кни́гу.')).toBeNull();
    expect(parseGap('Я [ | ] кни́гу.')).toBeNull();
    expect(parseGap('Я [чита́ю] кни́гу]')).toBeNull();
  });

  it('ignores stress marks, case, ё and outer punctuation', () => {
    expect(normalizeAnswer(' Ещё. ')).toBe('еще');
    expect(normalizeAnswer('чита́ю')).toBe('читаю');
    expect(checkGap('читаю', ['чита́ю'])).toBe('right');
    expect(checkGap('Читаю!', ['чита́ю'])).toBe('right');
    expect(checkGap('нового', ['но́вого', 'но́вый'])).toBe('right');
  });

  it('calls one letter off close, and anything else wrong', () => {
    expect(checkGap('читаб', ['чита́ю'])).toBe('close');
    expect(checkGap('читает', ['чита́ю'])).toBe('wrong');
    expect(checkGap('ем', ['ел'])).toBe('wrong');
    expect(checkGap('', ['чита́ю'])).toBe('wrong');
  });

  it('reads gap cards from the content files', () => {
    const files = {
      words: 'id,lesson,category,target,native,english,note\n',
      lessons: 'number,title\n',
      topics: 'number,slug,summary\n5,present-tense,groups\n',
      grammar: '## 5. Present tense\n\nNotes.\n',
      grammarCards:
        'id,topic,label,prompt,prompt_side,answer,answer_side,note,mode,hint,translation\n' +
        'ru-a1-g-05-01,5,PRESENT,знать → ты,target,зна́ешь,target,,,,\n' +
        'ru-a1-g-05-02,5,PRESENT,Я [чита́ю] кни́гу.,target,,target,я → ‑ю,gap,чита́ть,Ја читам књигу.\n',
    };
    const [flip, gap] = parseLevelFiles(files, 'ru', 'a1').grammarCards;
    expect(flip).toMatchObject({ mode: 'flip', hint: '', translation: '' });
    expect(gap).toMatchObject({ mode: 'gap', answer: 'чита́ю', hint: 'чита́ть' });
    const broken = files.grammarCards.replace('[чита́ю]', 'чита́ю');
    expect(() => parseLevelFiles({ ...files, grammarCards: broken }, 'ru', 'a1')).toThrow(
      /one \[gap\]/,
    );
  });
});
