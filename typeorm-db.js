// TypeORM >= 0.3 uses DataSource (createConnection/getConnection are removed)
const { DataSource, EntitySchema } = require("typeorm");

const Users = require("./entity/Users");

const UsersEntitySchema = new EntitySchema(Users);

// NOTE: In TypeORM 0.3+ MySQL sets extra.stringifyObjects=true by default.
// We explicitly disable it to avoid object -> SQL stringification surprises.
const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "root",
  database: "acme",
  synchronize: true,
  logging: true,
  extra: {
    stringifyObjects: false,
  },
  entities: [UsersEntitySchema],
});

const initPromise = AppDataSource.initialize()
  .then(async () => {
    const repo = AppDataSource.getRepository(UsersEntitySchema);

    console.log(
      "Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin"
    );

    await Promise.all([
      repo.insert({ name: "Liran", address: "IL", role: "user" }),
      repo.insert({ name: "Simon", address: "UK", role: "admin" }),
    ]);

    return repo;
  })
  .catch((err) => {
    console.error("failed connecting and seeding users to the MySQL database");
    console.error(err);
    // Re-throw so callers awaiting initPromise will fail fast.
    throw err;
  });

module.exports = {
  AppDataSource,
  UsersEntitySchema,
  initPromise,
};
