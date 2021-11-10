import { GameStats } from "./db/GameStats";

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

export class GameTextGenerator {
  static AskQuestion(q: Question): TextResponse {
    return {
      text: q.text,
      variants: q.variants,
    };
  }
  static FailedThenFinishGame(oldQ: Question, q: Question): TextResponse {
    const response = GameTextGenerator.AskQuestion(q);
    //fix me
    response.text =
      `Нет, Не угадали, правильный ответ ${oldQ.answer}\n` + response.text;
    return response;
  }
  static FailedThenNextQuestion(oldQ: Question, q: Question): TextResponse {
    const response = GameTextGenerator.AskQuestion(q);
    response.text =
      `А вот и нет, правильный ответ ${oldQ.answer}\nПереходим к следующему вопросу\n` +
      response.text;
    return response;
  }
  static ReAskQuestion(q: Question, tryCount: number): TextResponse {
    const response = GameTextGenerator.AskQuestion(q);
    response.text = `Нет, попоробуйте еще раз\n` + response.text;
    return response;
  }
  //вот тут ломается вобще все потому что для других методов не требуется async
  //а тут статистика подгружается через него
  //варианты:
  //загрузать статистику снаружи
  //не париться
  static async FinishGame(
    takenTimeMs: number,
    score: number,
    failedQuestions: Record<string, string>,
    playerId: number,
    stats: GameStats
  ): Promise<TextResponse> {
    let taken = 0;
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
        console.info(e);
      }
    }

    let failedQuestionsStr = "";
    const failedQuestionsStrArr: string[] = [];
    for (const [q, answer] of Object.entries(failedQuestions)) {
      failedQuestionsStrArr.push(q + " = " + answer);
    }
    if (failedQuestionsStrArr.length) {
      failedQuestionsStr =
        "Примеры в котрых вы ошиблись\n```\n" +
        failedQuestionsStrArr.join("\n") +
        "\n```";
    }

    let text =
      "Поздравляю игра закончена!" + strTaken + recordStr + failedQuestionsStr;
    const response: TextResponse = {
      text: text,
      parse_mode: "MarkdownV2",
    };

    return response;
  }
}
