import { knex, Knex } from "knex";
import { KnexConvertor } from "mk_utils";

interface KnexConnectorOptions {
  debug?: boolean;
  dump?: boolean;
  pool?: number;
}

interface KnexReducedConfig<SV extends {} = any> {
  debug?: boolean;
  client?: string | any;
  dialect?: string;
  version?: string;
  connection?:
    | string
    | Knex.StaticConnectionConfig
    | Knex.ConnectionConfigProvider;
  pool?: Knex.PoolConfig;

  postProcessResponse?: (result: any, queryContext: any) => any;
  wrapIdentifier?: (
    value: string,
    origImpl: (value: string) => string,
    queryContext: any
  ) => string;

  acquireConnectionTimeout?: number;
  useNullAsDefault?: boolean;

  asyncStackTraces?: boolean;
  log?: Knex.Logger;
}

//export class KnexConnector<K extends Knex, C extends Knex.Config> {
export class KnexConnector<K extends any, C extends KnexReducedConfig> {
  protected config: C;
  protected DEBUG = false;
  protected _connection: K | undefined;
  protected convertor: KnexConvertor;

  constructor(config: C, options?: KnexConnectorOptions) {
    this.config = config;
    if (options) {
      this.injectOptions(options);
    }
    const dump = options?.dump || false;
    this.convertor = new KnexConvertor(dump);
    this.setDefault();
  }
  protected injectOptions(options: KnexConnectorOptions) {
    if (options.debug) {
      this.DEBUG = true;
      this.config.debug = true;
    }
    if (options.pool) {
      //do smth
    }
  }
  protected setDefault() {
    if (!this.config.pool) {
      this.config.pool = {
        min: 2,
        max: 2,
      };
    }
    if (this.config.client === "pg") {
      const converted = this.convertor;
      this.config.wrapIdentifier = (...args: any) =>
        this.convertor.snakeWrapper.apply(this.convertor, args);

      this.config.postProcessResponse = (...args: [any, any]) =>
        this.convertor.postConverter.apply(this.convertor, args); //FIXME
    }
  }

  public connection(): K {
    if (!this._connection) {
      this._connection = this.openConnection();
    }
    return this._connection;
  }
  public openConnection(): K {
    const connection = knex(this.config);
    return connection as K;
  }
}

export default KnexConnector;
