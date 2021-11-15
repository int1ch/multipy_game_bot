import { KnexConnector } from "./knexConnector";
import { Knex } from "knex";

import * as config from "./config";
import logger from "./logger";

export const connector = new KnexConnector<Knex, Knex.Config>(
  {
    client: "pg",
    connection: {
      host: config.PG_HOST,
      port: config.PG_PORT,
      user: config.PG_USERNAME,
      password: config.PG_PASSWORD,
      database: config.PG_DATABASE,
    },
    log: {
      warn(message) {
        logger.warn(message);
      },
      error(message) {
        logger.error(message);
      },
      deprecate(message) {
        logger.warn("deprecate %s", message);
      },
      debug(message) {
        logger.debug(message);
      },
    },
  },
  {
    pool: config.PG_POOL_SIZE,
  }
);

const connection = connector.connection();
export default connection;
