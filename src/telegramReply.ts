import {
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from "@grammyjs/types";
import { AnyAaaaRecord } from "dns";

import { Context, Keyboard } from "grammy";
import { GameResponse } from "./GameProcessor";

type ReplyMethodParams = Parameters<Context["reply"]>;
type ReplyReturnType = ReturnType<Context["reply"]>;
type ReplyMethod = (...args: ReplyMethodParams) => ReplyReturnType;

interface ContextWithReply {
  reply: ReplyMethod;
}

//output
export async function telegramReply(
  ctx: ContextWithReply,
  response: GameResponse
) {
  //const ctx = this.ctx;
  const text = response.text;

  const otherOptions: Parameters<typeof ctx["reply"]>[1] = {};
  if (response.variants) {
    otherOptions.reply_markup = {
      one_time_keyboard: true,
      keyboard: telegramReplyKeyboard(response.variants),
    };
  }
  if (response.parse_mode) {
    otherOptions.parse_mode = response.parse_mode;
  }
  if (response.removeKeyboard) {
    otherOptions.reply_markup = { remove_keyboard: true };
  }
  return await ctx.reply(text, otherOptions);
}

export function telegramReplyKeyboard(variants: string[]) {
  const keyboard = new Keyboard();
  for (const variant of variants) {
    keyboard.text(variant);
  }
  return keyboard.build();
}
