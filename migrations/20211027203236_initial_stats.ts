import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("mgame_players"))) {
    knex.schema.createTable("mgame_players", (table) => {
      table.increments("player_id");
      table.string("login", 30);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.string("school");
      table.string("class");
    });
  }
  if (!(await knex.schema.hasTable("mgame_stats"))) {
    knex.schema.createTable("mgame_stats", (table) => {
      table.string("game", 15);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.integer("player_id");
      table.integer("time");
      table.integer("score");
      table
        .foreign("player_id")
        .references("player_id")
        .inTable("game_players");
    });
  }
  if (!(await knex.schema.hasTable("mgame_mulitiply_detailed_stats"))) {
    knex.schema.createTable("mgame_mulitiply_detailed_stats", (table) => {
      table.string("question", 15);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.integer("player_id");
      table.integer("time");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("mgame_players");
  await knex.schema.dropTableIfExists("mgame_stats");
  await knex.schema.dropTableIfExists("mgame_mulitiply_detailed_stats");
}
