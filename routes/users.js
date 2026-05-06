const express = require("express")
const validator = require("validator")

const { AppDataSource, initAppDataSource } = require("../typeorm-db")

const router = express.Router()
module.exports = router

function validateAndNormalizeUserPayload(body) {
  const errors = []

  const name = body && typeof body.name === "string" ? body.name.trim() : ""
  const address = body && typeof body.address === "string" ? body.address.trim() : ""
  const role = body && typeof body.role === "string" ? body.role.trim() : ""

  if (!validator.isLength(name, { min: 1, max: 100 })) {
    errors.push("name must be a non-empty string up to 100 characters")
  }

  if (!validator.isLength(address, { min: 1, max: 200 })) {
    errors.push("address must be a non-empty string up to 200 characters")
  }

  const allowedRoles = new Set(["user", "admin"])
  if (!allowedRoles.has(role)) {
    errors.push("role must be one of: user, admin")
  }

  if (errors.length) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name,
      address,
      role
    }
  }
}

router.get("/", async (req, res, next) => {
  try {
    await initAppDataSource()
    const repo = AppDataSource.getRepository("Users")

    // hard-coded getting account id of 1
    // as a replacement to getting this from the session and such
    // (just imagine that we implemented auth, etc)
    const results = await repo.findBy({ id: 1 })

    // Log Object's where property for debug reasons:
    console.log("The Object.where property is set to: ", {}.where)
    console.log(results)

    return res.json(results)
  } catch (err) {
    return next(err)
  }
})

router.post("/", async (req, res, next) => {
  try {
    await initAppDataSource()
    const repo = AppDataSource.getRepository("Users")

    const validation = validateAndNormalizeUserPayload(req.body)
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid user payload", details: validation.errors })
    }

    // Use TypeORM's create() to avoid passing arbitrary/untrusted object shapes into save().
    const user = repo.create(validation.value)

    const savedRecord = await repo.save(user)
    console.log("Post has been saved: ", savedRecord)
    return res.sendStatus(200)
  } catch (err) {
    console.error(err)
    console.log({}.where)
    return next(err)
  }
})
