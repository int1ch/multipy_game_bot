import {
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from "@grammyjs/types";
import { AnyAaaaRecord } from "dns";

import { Api, Context, Keyboard, RawApi } from "grammy";
import { GameResponse } from "./GameProcessor";
import logger from "./logger";

type ReplyMethodParams = Parameters<Context["reply"]>;
type ReplyReturnType = ReturnType<Context["reply"]>;
type ReplyMethod = (...args: ReplyMethodParams) => ReplyReturnType;

interface ContextWithReply {
  reply: ReplyMethod;
}

function telegramTextAndOptions(
  response: GameResponse
): [string, ReplyMethodParams[1]] {
  const text = response.text;
  const otherOptions: ReplyMethodParams[1] = {};
  if (response.variants) {
    otherOptions.reply_markup = {
      one_time_keyboard: true,
      keyboard: telegramReplyKeyboard(response.variants),
    };
  } else {
    otherOptions.reply_markup = { remove_keyboard: true };
  }
  if (response.removeKeyboard) {
    otherOptions.reply_markup = { remove_keyboard: true };
  }
  if (response.parse_mode) {
    otherOptions.parse_mode = response.parse_mode;
  }
  return [text, otherOptions];
}

//output
export async function telegramSendMessage(
  api: Api<RawApi>,
  chatId: number | string,
  response: GameResponse
) {
  const [text, otherOptions] = telegramTextAndOptions(response);
  const tgResponse = await api.sendMessage(chatId, text, otherOptions);
  //logger.debug({ text, options: otherOptions, tgResponse }, "tg reply:");
  return tgResponse;
}
export async function telegramReply(
  ctx: ContextWithReply,
  response: GameResponse
) {
  //const ctx = this.ctx;
  const [text, otherOptions] = telegramTextAndOptions(response);
  const tgResponse = await ctx.reply(text, otherOptions);
  //logger.debug({ text, options: otherOptions, tgResponse }, "tg reply:");
  return tgResponse;
  //return await ctx.reply(text, otherOptions);
}

export function telegramReplyKeyboard(variants: string[]) {
  const keyboard = new Keyboard();
  for (const variant of variants) {
    keyboard.text(variant);
  }
  return keyboard.build();
}
