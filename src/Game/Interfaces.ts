export interface Question {
  text: string;
  answer: string;
  variants?: string[];
  wrongTimeout?: number;
  score?: number;
}

export interface Game {
  questions: Question[];
}

export interface GameStat {
  timeMs: number;
  score: number;
}
export interface QuestionStat {
  text: string;
  timeMs: number;
  failed?: boolean;
}

export interface PlainGameState {
  questionN: number;
  questions: Question[];
  failedQuestions: Record<string, string>;
  score: number;
  try: 0;
  startTs: number;
  startQuestionTs: number;
  gameType: GameType;
}

export interface QuestionStat {
  text: string;
  timeMs: number;
}
export interface GameStat {
  timeMs: number;
  score: number;
}

export const GAME_SIMPLE = "SIMPLE" as const;
export const GAME_SPEED = "SPEED" as const;
export type GameType = typeof GAME_SIMPLE | typeof GAME_SPEED;

export interface Game {
  questions: Question[];
  type: GameType;
}
