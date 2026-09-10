var express = require('express')
var validator = require('validator')

const { mysqlDataSource, mysqlDataSourceReady, UsersSchema } = require('../typeorm-db')

var router = express.Router()
module.exports = router

function getTrimmedString(body, key) {
  if (!body || typeof body[key] !== 'string') return null
  return body[key].trim()
}

function validateUserPayload(body) {
  const name = getTrimmedString(body, 'name')
  const address = getTrimmedString(body, 'address')
  const role = getTrimmedString(body, 'role')

  if (!name || !validator.isLength(name, { min: 1, max: 255 })) {
    return { error: 'Invalid name' }
  }

  if (!address || !validator.isLength(address, { min: 1, max: 255 })) {
    return { error: 'Invalid address' }
  }

  if (!role) {
    return { error: 'Invalid role' }
  }

  const normalizedRole = role.toLowerCase()
  if (!validator.isIn(normalizedRole, ['user', 'admin'])) {
    return { error: 'Invalid role' }
  }

  // Return only a whitelisted set of fields.
  return { name, address, role: normalizedRole }
}

router.get('/', async (req, res, next) => {
  try {
    await mysqlDataSourceReady

    const repo = mysqlDataSource.getRepository(UsersSchema)

    // TypeORM v0.3+: find() no longer accepts a plain conditions object.
    const results = await repo.findBy({ id: 1 })

    // Log Object's where property for debug reasons:
    console.log('The Object.where property is set to: ', {}.where)
    console.log(results)

    return res.json(results)
  } catch (err) {
    return next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    await mysqlDataSourceReady

    const repo = mysqlDataSource.getRepository(UsersSchema)

    const validatedUser = validateUserPayload(req.body)
    if (validatedUser.error) {
      return res.status(400).json({ error: validatedUser.error })
    }

    const savedRecord = await repo.save(validatedUser)
    console.log('Post has been saved: ', savedRecord)
    return res.sendStatus(200)
  } catch (err) {
    console.error(err)
    console.log({}.where)
    return next(err)
  }
})
