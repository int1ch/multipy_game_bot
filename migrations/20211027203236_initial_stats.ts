import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("mgame_players"))) {
    await knex.schema.createTable("mgame_players", (table) => {
      table.increments("player_id");
      table.integer("telegram_id");
      table.string("login", 30).nullable();
      table.string("name", 30);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.string("school").nullable();
      table.string("class").nullable();
      //table.unique(["login"]); //формально уникален но за уникальность отвечает телеграм
      table.unique(["telegram_id"]);
    });
  }
  if (!(await knex.schema.hasTable("mgame_stats"))) {
    await knex.schema.createTable("mgame_stats", (table) => {
      table.string("game", 15);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.integer("player_id");
      table.integer("time");
      table.integer("score").defaultTo(0);
      table
        .foreign("player_id")
        .references("player_id")
        .inTable("mgame_players")
        .onDelete("CASCADE");
    });
  }
  if (!(await knex.schema.hasTable("mgame_mulitiply_detailed_stats"))) {
    await knex.schema.createTable("mgame_mulitiply_detailed_stats", (table) => {
      table.string("question", 15);
      table.timestamp("at").defaultTo(knex.fn.now());
      table.integer("player_id");
      table.integer("time");
      table
        .foreign("player_id")
        .references("player_id")
        .inTable("mgame_players")
        .onDelete("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("mgame_stats");
  await knex.schema.dropTableIfExists("mgame_mulitiply_detailed_stats");
  await knex.schema.dropTableIfExists("mgame_players");
}
