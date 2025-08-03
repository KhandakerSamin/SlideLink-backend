const express = require("express")
const {
  createCollection,
  getCollectionByUsername,
  addSlideToCollection,
} = require("../controllers/collectionController")

const router = express.Router()

// POST /api/collections - Create a new collection
router.post("/collections", createCollection)

// GET /api/collections/:username - Get a specific collection by username
router.get("/collections/:username", getCollectionByUsername)

// POST /api/collections/:username/slides - Add a slide to a collection
router.post("/collections/:username/slides", addSlideToCollection)

module.exports = router
