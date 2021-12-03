import { pathToFileURL } from "url";
import { GameStats } from "./db/GameStats";
import logger from "./logger";

export interface TextResponse {
  text: string;
  variants?: string[];
  parse_mode?: "MarkdownV2";
}
interface Question {
  text: string;
  answer: string;
  variants?: string[];
}
interface FinishGameParams {
  takenTimeMs: number;
  score: number;
  failedQuestions: Record<string, string>;
  playerId: number;
  stats: GameStats;
}

export class GameTextGenerator {
  static AskQuestion(q: Question): TextResponse {
    return {
      text: q.text,
      variants: q.variants,
    };
  }
  static ReAskQuestion(q: Question, tryCount: number): TextResponse {
    const response = GameTextGenerator.AskQuestion(q);
    response.text = `Нет, попоробуйте еще раз\n` + response.text;
    return response;
  }
  static rightAnswerInjection(oldAnswer?: string) {
    if (!oldAnswer) return "";
    return `, правильный ответ ${oldAnswer}`;
  }
  static FailedThenNextQuestion(q: Question, oldAnswer?: string): TextResponse {
    const response = GameTextGenerator.AskQuestion(q);
    let rightAnswer = GameTextGenerator.rightAnswerInjection(oldAnswer);
    response.text =
      `А вот и нет${rightAnswer}\nПереходим к следующему вопросу\n` +
      response.text;
    return response;
  }

  //вот тут ломается вобще все потому что для других методов не требуется async
  //а тут статистика подгружается через него
  //варианты:
  //загрузать статистику снаружи
  //не париться
  static async FailedThenFinishGame(
    params: FinishGameParams
  ): Promise<TextResponse> {
    const response = await GameTextGenerator.FinishGame(params);

    //add? preious.answer
    let rightAnswer = GameTextGenerator.rightAnswerInjection();
    response.text =
      tgEscape(`Нет, Не угадали${rightAnswer}, закругляемся\n`) + response.text;
    return response;
  }
  static async FinishGame(params: FinishGameParams): Promise<TextResponse> {
    const takenTimeMs = params.takenTimeMs;
    const stats = params.stats;
    const score = params.score;
    const playerId = params.playerId;
    const failedQuestions = params.failedQuestions;
    let strTaken = "";
    if (takenTimeMs) {
      strTaken = (takenTimeMs / 1000).toFixed(1);
      strTaken = `\nВаш Результат ${strTaken} секунд`;
    }

    let recordStr = "";
    //record zones: global, personal, group, school, class,
    //вот тут я не могу угадать зону рекорда

    //const player = await stats.getPlayerByTelegramId(telegamId);
    //const playerId = player?.playerId!;

    const recordScopes = stats.getRecordScopes();

    const scopeModifiers: Record<string, string> = {
      global: "общий",
      personal: "личный",
    };
    for (const scope of recordScopes) {
      try {
        const [recordMs, recordScore] = await stats.getRecord(scope, playerId);
        if (!scopeModifiers[recordScore]) {
          continue;
        }

        if (recordScore >= score && recordMs > takenTimeMs) {
          const modifier = scopeModifiers[recordScore];
          recordStr = `\n У вас новый ${modifier} рекорд!`;
          break; //only one record matter
        }
      } catch (e) {
        logger.info({ error: e }, "Record Error");
      }
    }

    let text =
      tgEscape("Поздравляю игра закончена!") +
      tgEscape(strTaken) +
      tgEscape(recordStr) +
      GameTextGenerator.failedQuestionsMarkdownStr(failedQuestions);
    const response: TextResponse = {
      text: text,
      parse_mode: "MarkdownV2", // tgEscape required
    };

    return response;
  }

  static failedQuestionsMarkdownStr(failedQuestions: Record<string, string>) {
    const failedQuestionsStrArr: string[] = [];
    for (const [q, answer] of Object.entries(failedQuestions)) {
      //failed question must have = (3 * 2 = )
      failedQuestionsStrArr.push(q + "" + answer);
    }
    if (!failedQuestionsStrArr.length) {
      return "";
    }
    const failedQuestionsEscapedStr =
      tgEscape("\nПримеры в которых вы ошиблись:\n") +
      "```\n" +
      failedQuestionsStrArr.join("\n") +
      "\n```";

    return failedQuestionsEscapedStr;
  }

  static async FinishSpeedGame(params: FinishGameParams) {
    //const takenTimeMs = params.takenTimeMs;
    const stats = params.stats;
    const score = params.score;
    const playerId = params.playerId;
    const failedQuestions = params.failedQuestions;
    const endGameStr =
      score > 4 ? "Поздравляю игра закончена!" : "Игра закончена.";

    let strScore = "\nВы набрали " + l10nScore(score);
    let recordStr = "";
    let text =
      tgEscape(endGameStr) +
      tgEscape(strScore) +
      tgEscape(recordStr) +
      GameTextGenerator.failedQuestionsMarkdownStr(failedQuestions);
    const response: TextResponse = {
      text: text,
      parse_mode: "MarkdownV2",
    };
    return response;
  }
}

export function tgEscape(text: string) {
  return text.replace(/([\!-\/\\[\\\]\`{\|\}\~])/g, "\\$1");
}

function l10nNumeric(
  value: number = 0,
  str5: string,
  str2: string = "",
  str1: string = ""
): string {
  const rest = value % 10;
  if (rest === 1) {
    return str1 || str5;
  }
  if (rest > 1 && rest < 5) {
    return str2 || str5;
  }
  return str5;
}

export function l10nScore(value: number) {
  const score = l10nNumeric(value, "очков", "очка", "очко");
  return value + " " + score;
}
export function l10nSeconds(value: number) {
  const score = l10nNumeric(value, "секунд", "секунды", "секунда");
  return value + " " + score;
}
