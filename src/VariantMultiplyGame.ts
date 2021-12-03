import { normalizedAB } from "./GamesCommon";
import { Game, GAME_SPEED, Question } from "./Game/Interfaces";

const samples = [
  {
    ab: [4, 4],
    variants: [
      [16, 12, 18, 20],
      [10, 16, 12, 15],
    ],
  },
  {
    ab: [5, 5],
    variant: [15, 20, 21, 24, 25, 30],
  },
  {
    ab: [6, 3],
    variants: [
      [16, 12, 18, 20],
      [18, 21, 24, 25],
    ],
  },
  {
    ab: [6, 4],
    variant: [24, 32, 18, 21, 28, 25, 12],
  },
  {
    ab: [6, 6],
    variants: [
      [36, 40, 42, 48, 44],
      [36, 32, 30, 24, 28],
      [36, 32, 42, 28],
      [36, 38, 30, 27, 28],
    ],
  },

  {
    ab: [7, 3],
    variant: [21, 24, 18, 20, 23, 27],
  },
  {
    ab: [7, 4],
    variant: [21, 24, 18, 20, 23, 27, 28],
  },
  {
    ab: [7, 6],
    variant: [41, 49, 54, 42, 45, 56],
  },
  {
    ab: [7, 7],
    variant: [49, 54, 42, 56, 63],
  },
  {
    ab: [8, 3],
    variant: [24, 32, 18, 21, 28, 25, 12],
  },
  {
    ab: [8, 4],
    variant: [24, 32, 18, 21, 28, 25, 12],
  },
  {
    ab: [8, 6],
    variant: [48, 52, 42, 44],
  },
  {
    ab: [8, 7],
    variant: [64, 32, 16, 54, 56],
  },
  {
    ab: [8, 8],
    variant: [64, 32, 16, 54, 56],
  },
  {
    ab: [9, 3],
    variant: [21, 24, 27, 28],
  },
  {
    ab: [9, 4],
    variant: [32, 36, 38, 27],
  },
  {
    ab: [9, 6],
    variant: [54, 56, 63, 72, 81],
  },
  {
    ab: [9, 7],
    variant: [56, 63, 72, 81],
  },
  {
    ab: [9, 8],
    variant: [56, 63, 72, 81],
  },
  {
    ab: [9, 9],
    variant: [56, 63, 72, 81],
  },
];

export function generateVariantGame(questionsCount: number = 5): Game {
  const used: Record<string, boolean> = {};
  const questions = [];
  let iterationConunter = 0;
  while (iterationConunter < 100 && questions.length < questionsCount) {
    iterationConunter++;

    const sample = samples[Math.round(Math.random() * (samples.length - 1))];
    const ab = sample.ab;
    if (Math.random() > 0.5) {
      ab.reverse();
    }
    const first = sample.ab[0];
    const second = sample.ab[1];
    const normilized = normalizedAB(first, second);
    if (used[normilized]) {
      continue;
    }
    used[normilized] = true;

    const answer = first * second;
    let numVariants: number[] | undefined;
    let variants: string[] | undefined;
    if (sample.variants) {
      numVariants =
        sample.variants[Math.floor(Math.random() * sample.variants.length)];
    } else if (sample.variant) {
      numVariants = sample.variant;
    }
    if (numVariants) {
      if (!numVariants.includes(answer)) {
        numVariants.push(answer);
      }
      variants = numVariants.sort((a, b) => a - b).map((x) => x.toFixed());
    }

    const question: Question = {
      text: `${first} x ${second} = `,
      answer: String(answer),
      variants,
    };
    questions.push(question);
  }
  return {
    questions,
    type: "SIMPLE",
  };
}

export function generateSpeedGame(questionsCount?: number | undefined) {
  const game = generateVariantGame(questionsCount);
  game.type = GAME_SPEED;
  return game;
}
