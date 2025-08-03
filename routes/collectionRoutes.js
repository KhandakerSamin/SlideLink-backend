const express = require("express")
const {
  createCollection,
  getCollectionByUsername,
  joinCollection,
  getSubmissions,
  submitSlideLink,
  deleteCollection,
  getDashboardStats,
  getRecentCollections, // Make sure this is imported!
} = require("../controllers/collectionController")
const router = express.Router()

// POST /api/collections - Create a new collection
router.post("/collections", createCollection)

// POST /api/collections/join - Authenticate to access a collection
router.post("/collections/join", joinCollection)

// GET /api/collections/:username - Get a specific collection by username (without password check here)
router.get("/collections/:username", getCollectionByUsername)

// GET /api/collections/:username/submissions - Get all team submissions for a collection
router.get("/collections/:username/submissions", getSubmissions)

// POST /api/collections/:username/submissions - Add a new team submission to a collection
router.post("/collections/:username/submissions", submitSlideLink)

// DELETE /api/collections/:username - Delete a collection
router.delete("/collections/:username", deleteCollection)

// GET /api/dashboard-stats - Get overall platform statistics
router.get("/dashboard-stats", getDashboardStats)

// NEW: GET /api/collections/recent - Get recent collections for homepage display
router.get("/collections/recent", getRecentCollections) // This line is crucial!

module.exports = router
