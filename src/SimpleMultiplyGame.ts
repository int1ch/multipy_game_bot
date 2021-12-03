import { normalizedAB } from "./GamesCommon";
import { Game, Question } from "./Game/Interfaces";

export function generateSimpleGame(
  questionsCount: number = 9,
  max: number = 9
): Game {
  const used: Record<string, boolean> = {};
  const questions = [];
  let iterationConunter = 0;
  while (iterationConunter < 100 && questions.length < questionsCount) {
    iterationConunter++;
    const first = randomInt(2, max);
    const second = randomInt(2, 9);
    const normilized = normalizedAB(first, second);
    if (used[normilized]) {
      continue;
    }
    used[normilized] = true;

    const answer = first * second;
    const question: Question = {
      text: `${first} x ${second} = `,
      answer: String(answer),
      variants: generateVariants(answer),
    };
    questions.push(question);
  }
  return {
    questions,
    type: "SIMPLE",
  };
}

function randomInt(from: number, to: number) {
  const range = to - from;
  return from + Math.round(Math.random() * range);
}

const points: Record<number, number[]> = {
  0: [6, 8, 9, 12],
  1: [12, 15, 16, 18],
  2: [21, 24, 27, 28],
  3: [32, 36, 35],
  4: [42, 46, 48, 49],
  5: [52, 54, 56, 51],
  6: [63, 64, 56, 71],
  7: [72, 64, 56, 81],
  8: [72, 64, 56, 81],
};
export function generateVariants(answer: number): string[] | undefined {
  //
  const dec = Math.floor(answer / 10);
  if (!points[dec]) {
    return undefined;
  }
  const variants = [...points[dec]];

  if (!variants.includes(answer)) {
    variants.push(answer);
  }
  return variants.sort((a, b) => a - b).map((x) => x.toFixed());
}
