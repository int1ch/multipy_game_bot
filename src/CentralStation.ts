import * as config from "./config";
import knex from "./knexConnection";
import { Knex } from "knex";
import { GameStats } from "./db/GameStats";
//import axios, { AxiosInstance } from "axios";
//import { Mailer } from "./mailer";
/*
 идея в том что пусть и фэйково оставить один почти глобальный класс?
 но чем это мне мешает?
 те для супер проектов наверно для 
 мне же надо просто обкатать
*/
export class CentralStation {
  public readonly name = "centralStation";
  //private _axios: AxiosInstance | undefined;
  //private _mailer: Mailer | undefined;
  protected _gameStats: GameStats | undefined;
  constructor() {}
  public config() {
    return config;
  }
  public get knex(): Knex {
    return knex;
  }
  public get gameStats(): GameStats {
    if (!this._gameStats) {
      this._gameStats = new GameStats(this);
    }
    return this._gameStats!;
  }
  /*public axios(): AxiosInstance {
    if (!this._axios) {
      this._axios = axios.create();
    }
    return this._axios;
  }
  public mailer(): Mailer {
    if (!this._mailer) {
      this._mailer = new Mailer();
    }
    return this._mailer;
  }*/
  public close(): void {
    this.knex.destroy();
  }
}
export function isCentralStation(object: any): object is CentralStation {
  return object.name === "centralStation";
}

const central = new CentralStation();
export default central;
