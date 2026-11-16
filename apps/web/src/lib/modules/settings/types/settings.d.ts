type ThemeMode = 'system' | 'light' | 'dark';

type FirstSideChoice = 'target' | 'native' | 'mix';

type PracticeDeck = 'words' | 'grammar' | 'traps';

type SetupChoice = {
  deck: PracticeDeck;
  lessons: number[];
  topics: number[];
  firstSide: FirstSideChoice;
  size: string;
};

type Settings = {
  language: string;
  level: string;
  firstSide: FirstSideChoice;
  newPerDay: number;
  lastSetup: SetupChoice | null;
};
