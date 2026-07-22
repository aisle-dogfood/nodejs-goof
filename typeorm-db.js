var typeorm = require("typeorm");
var DataSource = typeorm.DataSource;
var EntitySchema = typeorm.EntitySchema;

const Users = require("./entity/Users")
const UsersEntity = new EntitySchema(Users)

const appDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "root",
  database: "acme",
  synchronize: true,
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  entities: [
    UsersEntity
  ]
})

let dataSourceInitializationError = null

const dataSourceReady = appDataSource.initialize()
  .then(async () => {
    const repo = appDataSource.getRepository(UsersEntity)

    console.log('Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin')
    const inserts = [
      repo.insert({
        name: "Liran",
        address: "IL",
        role: "user"
      }),
      repo.insert({
        name: "Simon",
        address: "UK",
        role: "admin"
      })
    ];

    await Promise.all(inserts)
    return appDataSource
  })
  .catch((err) => {
    dataSourceInitializationError = err
    console.error('failed connecting and seeding users to the MySQL database')
    console.error(err)
    return null
  })

async function getUsersRepository() {
  await dataSourceReady

  if (dataSourceInitializationError) {
    throw dataSourceInitializationError
  }

  return appDataSource.getRepository(UsersEntity)
}

module.exports = {
  appDataSource,
  dataSourceReady,
  getUsersRepository,
  UsersEntity
}