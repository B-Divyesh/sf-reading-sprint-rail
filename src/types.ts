export type Note = { id: string; paragraph: number; text: string; createdAt: number };

export type ReadingDocument = {
  id: string;
  title: string;
  source: 'paste' | 'epub';
  paragraphs: string[];
  currentIndex: number;
  notes: Note[];
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  contrast: boolean;
  reduceMotion: boolean;
  font: 'hyperlegible' | 'serif' | 'sans';
  fontSize: number;
  lineHeight: number;
  wordCue: boolean;
  wpm: number;
  sprintMinutes: number;
  breakMinutes: number;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', contrast: false, reduceMotion: false,
  font: 'hyperlegible', fontSize: 22, lineHeight: 1.65,
  wordCue: false, wpm: 180, sprintMinutes: 15, breakMinutes: 5,
};
