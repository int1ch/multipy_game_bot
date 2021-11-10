import knexConnection from "./knexConnection";

const knex = knexConnection;
afterAll(() => {
  knexConnection.destroy();
});

it("sql test", async () => {
  const now = await knex.raw("SELECT now()");
  //console.log("NOW", now);
  expect(now.rowCount).toEqual(1);
});
