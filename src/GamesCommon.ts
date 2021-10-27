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

export function normalizedAB(a: number, b: number) {
  if (a > b) {
    return `${b}x${a}`;
  }
  return `${a}x${b}`;
}
