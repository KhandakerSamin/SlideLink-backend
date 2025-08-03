const express = require("express")
const {
  createCollection,
  getCollectionByUsername,
  addSlideToCollection, // This was for general slides, not team submissions
  joinCollection, // New: for authentication
  getSubmissions, // New: to get team submissions
  submitSlideLink, // New: to add team submissions
} = require("../controllers/collectionController")

const router = express.Router()

// POST /api/collections - Create a new collection
router.post("/collections", createCollection)

// POST /api/collections/join - Authenticate to access a collection
router.post("/collections/join", joinCollection)

// GET /api/collections/:username - Get a specific collection by username (without password check here)
router.get("/collections/:username", getCollectionByUsername)

// POST /api/collections/:username/slides - Add a general slide to a collection (if still needed, otherwise remove)
// router.post("/collections/:username/slides", addSlideToCollection) // Keeping this commented out for now, as frontend uses 'submissions'

// GET /api/collections/:username/submissions - Get all team submissions for a collection
router.get("/collections/:username/submissions", getSubmissions)

// POST /api/collections/:username/submissions - Add a new team submission to a collection
router.post("/collections/:username/submissions", submitSlideLink)

module.exports = router
