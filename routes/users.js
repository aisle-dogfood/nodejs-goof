
var express = require('express')
var validator = require('validator')

const { getUsersRepository } = require('../typeorm-db')

var router = express.Router()
module.exports = router

const allowedUserFields = ['name', 'address']

function buildValidatedUser(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' }
  }

  const providedFields = Object.keys(body)
  if (providedFields.length !== allowedUserFields.length || providedFields.some((field) => !allowedUserFields.includes(field))) {
    return { error: 'Request body must only contain name and address.' }
  }

  const user = {}

  for (const field of allowedUserFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field) || typeof body[field] !== 'string') {
      return { error: `${field} must be a string.` }
    }

    const value = validator.trim(body[field])
    if (!validator.isLength(value, { min: 1, max: 255 })) {
      return { error: `${field} must be between 1 and 255 characters.` }
    }

    user[field] = value
  }

  user.role = 'user'

  return { user }
}

router.get('/', async (req, res, next) => {
  try {
    const repo = await getUsersRepository()

    // hard-coded getting account id of 1
    // as a rpelacement to getting this from the session and such
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
    const validationResult = buildValidatedUser(req.body)

    if (validationResult.error) {
      return res.status(400).json({ error: validationResult.error })
    }

    const repo = await getUsersRepository()

    const savedRecord = await repo.save(validationResult.user)
    console.log("Post has been saved: ", savedRecord)
    return res.sendStatus(200)

  } catch (err) {
    console.error(err)
    console.log({}.where)
    next(err)
  }
})