const { DataSource, EntitySchema } = require("typeorm")

const Users = require("./entity/Users")

// TypeORM >=0.3 uses DataSource instead of the deprecated global Connection APIs.
const AppDataSource = new DataSource({
  name: "mysql",
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "root",
  database: "acme",
  synchronize: true,
  logging: true,
  entities: [new EntitySchema(Users)]
})

let initPromise

async function initAppDataSource() {
  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(async () => {
        const repo = AppDataSource.getRepository("Users")

        console.log(
          "Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin)"
        )

        // Preserve existing behavior: seed on startup.
        await Promise.all([
          repo.insert({ name: "Liran", address: "IL", role: "user" }),
          repo.insert({ name: "Simon", address: "UK", role: "admin" })
        ])
      })
      .catch((err) => {
        console.error("failed connecting and seeding users to the MySQL database")
        console.error(err)
        throw err
      })
  }

  return initPromise
}

// Maintain startup side-effect initialization for existing app.js `require('./typeorm-db')`.
initAppDataSource()

module.exports = {
  AppDataSource,
  initAppDataSource
}
