import { Knex } from "knex";
import { stringify } from "querystring";
import { CentralStation, isCentralStation } from "../CentralStation";
import logger from "./logger";

export interface PgMGameStats {
  playerId: number;
  game: string;
  time: number;
  score: number;
  at: Date;
}
export interface PgMGameQuestionStats {
  playerId: number;
  question: string;
  time: number;
  at: Date;
}
export interface PgMGamePlayer {
  playerId: number;
  telegramId: number;
  name: string;
  login?: string;
  at: Date;
  school?: string;
  class?: string;
}

interface Player {
  playerId: number;
  telegamId: number;
  name: string;
  login?: string;
  school?: string;
  schoolClass?: string;
}

export class NoRecordErrorYet extends Error {}

export const SCOPE_GLOBAL = "global";
export const SCOPE_PERSONAL = "personal";
export type SCOPE = typeof SCOPE_GLOBAL | typeof SCOPE_PERSONAL;

export const DEFAULT_GAME_TYPE = "xxx";

type GAME_TYPE = typeof DEFAULT_GAME_TYPE;

export class GameStats {
  protected knex: Knex;
  constructor(options: { knex: Knex }) {
    this.knex = options.knex;
  }

  public getRecordScopes() {
    return [SCOPE_GLOBAL, SCOPE_PERSONAL] as const;
  }

  async saveGameQuestionResult(
    playerId: number,
    question: string,
    timeMs: number
  ) {
    try {
      await this.knex<PgMGameQuestionStats>(
        "mgame_mulitiply_detailed_stats"
      ).insert({
        playerId: playerId,
        question,
        time: timeMs,
      });
    } catch (e: any) {
      logger.error({ error: e }, "SQL INTERCEPTOR");
      throw new Error(e);
    }
  }
  async saveGameResult(
    playerId: number,
    game: string,
    timeMs: number,
    score: number
  ) {
    await this.knex("mgame_stats").insert({
      playerId,
      game,
      time: timeMs,
      score,
    });
  }
  async getPlayer(playerId: number) {
    return await this.knex<PgMGamePlayer>("mgame_players")
      .where({ playerId })
      .first();
  }
  async getPlayerByTelegramId(telegramId: number) {
    return await this.knex<PgMGamePlayer>("mgame_players")
      .where({ telegramId })
      .first();
  }
  async savePlayer(
    telegramId: number,
    name: string,
    login: string | undefined,
    school?: string,
    className?: string
  ) {
    const playerId = await this.knex<PgMGamePlayer>("mgame_players")
      .insert({
        telegramId,
        name,
        login,
        school,
        class: className,
      })
      .onConflict("telegram_id")
      .merge()
      .returning("playerId");
    const player = await this.getPlayer(playerId[0]);
    if (!player) {
      throw new Error("DB Internal error, player not saved? " + playerId[0]);
    }
    return player;
  }
  async deletePlayerByTelegramId(telegramId: number) {
    await this.knex<PgMGamePlayer>("mgame_players")
      .where({ telegramId })
      .delete();
  }

  public async getGameRecord(
    gameType: string = DEFAULT_GAME_TYPE
  ): Promise<[timeMs: number, score: number]> {
    const knex = this.knex;
    const where = { game: gameType };
    //<PgMGameStats> no typescript
    const result = await knex("mgame_stats")
      .debug(true)
      .select("game", "score")
      .min("time as min_time")
      .groupBy("game", "score")
      .where(where)

      .whereRaw("score = (select max(score) from mgame_stats where game = ?)", [
        gameType,
      ])
      .first();
    if (!result) {
      throw new NoRecordErrorYet("No Recored found for game:" + gameType);
    }
    return [result.minTime, result.score];
  }

  public async getPlayerGameRecord(
    playerId: number,
    gameType: string = DEFAULT_GAME_TYPE
  ): Promise<[timeMs: number, score: number]> {
    const knex = this.knex;
    const where = { game: gameType, playerId };
    const result = await knex<PgMGameStats>("mgame_stats")
      .debug(true)
      .select("game", "player_id", "score")
      .groupBy("game", "player_id", "score")
      .where(where)
      .min("time as min_time")
      .whereRaw(
        "score = (select max(score) from mgame_stats where game = ? and player_id = ?)",
        [gameType, playerId]
      )
      .first();
    if (!result) {
      throw new NoRecordErrorYet("Record not set");
    }
    return [result.minTime, result.score];
  }
  /*
  select game, player_id, score, min(time) as min_time from 
mgame_stats s1 
	inner join (
		select game, player_id, max(score) as score from mgame_stats group by game, player_id 
    ) s2 using( game, player_id, score )
where game = 'xxx'
group by game, player_id, score
order by score desc, min_time asc 
limit 5
  */
  public async getGameRating(game: GAME_TYPE = DEFAULT_GAME_TYPE) {
    const knex = this.knex;
    const result = await knex
      .select("game", "player_id", "score")
      .min("time as min_time_ms")
      .from("mgame_stats")
      .joinRaw(
        `inner join (
      select game, player_id, max(score) as score from mgame_stats group by game, player_id 
      ) s2 using( game, player_id, score )`
      )
      .where({ game })
      .groupBy("game", "player_id", "score")
      .orderByRaw("score desc, min_time_ms")
      .limit(5)
      .debug(true);
    logger.info("Raw rating: %o", result);
    return result as {
      game: string;
      playerId: number;
      score: number;
      minTimeMs: number;
    }[];
  }
  public async getPlayerInfo(player_id: number): Promise<Player | undefined> {
    return (await this.getPayersInfo([player_id]))[player_id];
  }
  public async getPayersInfo(players_ids: number[]) {
    const knex = this.knex;
    logger.info("fetch players info for %o", players_ids);
    const result = await knex("mgame_players")
      .select(
        "player_id",
        "login",
        "name",
        //"displayName",
        "school",
        "class as schoolClass"
      )
      .debug(true)
      .whereIn("player_id", players_ids);

    const indexedResponse: Record<number, Player> = {};
    for (const player of result as Player[]) {
      indexedResponse[player.playerId] = player;
    }
    return indexedResponse;
  }

  public async getRecord(scope: SCOPE, playerId: number) {
    if (scope === SCOPE_GLOBAL) {
      return await this.getGameRecord();
    }
    if (scope === SCOPE_PERSONAL) {
      return await this.getPlayerGameRecord(playerId);
    }
    throw new Error("Unexpected Scope: " + scope);
  }
}
