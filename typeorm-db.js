const { DataSource, EntitySchema } = require("typeorm");

const Users = require("./entity/Users");

const UsersSchema = new EntitySchema(Users);

// TypeORM v0.3+ uses DataSource instead of createConnection/getConnection.
const mysqlDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "root",
  database: "acme",
  synchronize: true,
  logging: true,
  entities: [UsersSchema],
});

// Initialize immediately on module load (app.js requires this at startup).
const mysqlDataSourceReady = mysqlDataSource
  .initialize()
  .then(async () => {
    const repo = mysqlDataSource.getRepository(UsersSchema);

    console.log(
      "Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin)"
    );

    await Promise.all([
      repo.insert({
        name: "Liran",
        address: "IL",
        role: "user",
      }),
      repo.insert({
        name: "Simon",
        address: "UK",
        role: "admin",
      }),
    ]);

    return repo;
  })
  .catch((err) => {
    console.error("failed connecting and seeding users to the MySQL database");
    console.error(err);
    throw err;
  });

module.exports = { mysqlDataSource, mysqlDataSourceReady, UsersSchema };
