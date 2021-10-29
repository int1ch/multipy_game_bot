import { Knex } from "knex";

export interface PgMGameStats {
  playerId: number;
  game: string;
  time: number;
  score: number;
  at: Date;
}

export class GameStats {
  protected knex: Knex;
  constructor(options: { knex: Knex }) {
    this.knex = options.knex;
  }
  saveGameResult(
    player_id: number,
    game: string,
    timeMs: number,
    score: number
  ) {
    this.knex("mgame_stats").insert({
      player_id,
      game,
      time: timeMs,
      score,
    });
  }
}
