var express = require('express')
var validator = require('validator')

const { AppDataSource, UsersEntitySchema, initPromise } = require('../typeorm-db')

var router = express.Router()
module.exports = router

function requireStringField(value) {
  return typeof value === 'string' ? value : ''
}

router.get('/', async (req, res, next) => {
  try {
    await initPromise

    const repo = AppDataSource.getRepository(UsersEntitySchema)

    // hard-coded getting account id of 1
    // as a replacement to getting this from the session and such
    // (just imagine that we implemented auth, etc)
    const results = await repo.findBy({ id: 1 })

    // Log Object's where property for debug reasons:
    console.log('The Object.where property is set to: ', {}.where)
    console.log(results)

    return res.json(results)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    await initPromise

    const repo = AppDataSource.getRepository(UsersEntitySchema)

    const name = validator.trim(requireStringField(req.body.name))
    const address = validator.trim(requireStringField(req.body.address))
    const role = validator.trim(requireStringField(req.body.role))

    // Basic input validation to ensure only expected types/values are persisted.
    // This also prevents passing attacker-controlled objects into repo.save().
    if (!validator.isLength(name, { min: 1, max: 255 })) {
      return res.status(400).json({ error: 'Invalid name' })
    }
    if (!validator.isLength(address, { min: 1, max: 255 })) {
      return res.status(400).json({ error: 'Invalid address' })
    }
    if (!validator.isIn(role, ['user', 'admin'])) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const user = { name, address, role }

    const savedRecord = await repo.save(user)
    console.log('Post has been saved: ', savedRecord)
    return res.sendStatus(200)
  } catch (err) {
    console.error(err)
    console.log({}.where)
    next(err)
  }
})
