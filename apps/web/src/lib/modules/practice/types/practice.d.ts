type CardFace = {
  side: import('@rusky/core').Side;
  label: string;
  text: string;
  lang: string;
};

type CardDetail = {
  key: string;
  value: string;
  href?: string;
};

type SessionParams = {
  mode: 'review' | 'custom';
  deck: PracticeDeck;
  lessons: number[];
  topics: number[];
  firstSide: FirstSideChoice | null;
  size: number | 'all';
};
