const express = require("express")
const {
  createCollection,
  getCollectionByUsername,
  joinCollection,
  getSubmissions,
  submitSlideLink,
  deleteCollection,
  getDashboardStats,
  getRecentCollections,
  updateSubmission,
  deleteSubmission
} = require("../controllers/collectionController")

const router = express.Router()

// Dashboard and general routes (these should come first to avoid conflicts)
// GET /api/dashboard-stats - Get overall platform statistics
router.get("/dashboard-stats", getDashboardStats)

// Collection management routes
// POST /api/collections - Create a new collection
router.post("/collections", createCollection)

// POST /api/collections/join - Authenticate to access a collection
router.post("/collections/join", joinCollection)

// GET /api/collections/recent - Get recent collections for homepage display (must be before :username)
router.get("/collections/recent", getRecentCollections)

// Specific collection routes (username-based)
// GET /api/collections/:username - Get a specific collection by username
router.get("/collections/:username", getCollectionByUsername)

// DELETE /api/collections/:username - Delete a collection
router.delete("/collections/:username", deleteCollection)

// Submission management routes for specific collections
// GET /api/collections/:username/submissions - Get all team submissions for a collection
router.get("/collections/:username/submissions", getSubmissions)

// POST /api/collections/:username/submissions - Add a new team submission to a collection
router.post("/collections/:username/submissions", submitSlideLink)

// PUT /api/collections/:username/submissions/:submissionId - Update a specific submission
router.put("/collections/:username/submissions/:submissionId", updateSubmission)

// DELETE /api/collections/:username/submissions/:submissionId - Delete a specific submission
router.delete("/collections/:username/submissions/:submissionId", deleteSubmission)

module.exports = router