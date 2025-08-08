const { getDb } = require("../db")
const { ObjectId } = require("mongodb")

const createCollection = async (req, res) => {
  const collectionData = req.body
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  // Basic validation
  const requiredFields = ["section", "courseCode", "semester", "faculty", "department", "teamCount", "password"]
  for (const field of requiredFields) {
    if (!collectionData[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  try {
    // Generate a unique username based on frontend logic
    const departmentAbbreviationMatch = collectionData.department.match(/$$([^)]+)$$/)
    const deptCode = departmentAbbreviationMatch
      ? departmentAbbreviationMatch[1]
      : collectionData.department.split(" ")[0]
    const cleanSection = collectionData.section.replace(/[^a-zA-Z0-9]/g, "")
    const username = `${cleanSection}-${collectionData.courseCode}-${new Date().getFullYear()}-${deptCode}`

    // Check if a collection with this username already exists
    const existingCollection = await db.collection("collections").findOne({ username })
    if (existingCollection) {
      return res
        .status(409)
        .json({ error: "Collection with this username already exists. Please try different details." })
    }
    const newCollection = {
      ...collectionData,
      username,
      slides: [], // General slides (if you still need this feature)
      submissions: [], // Initialize with an empty array for team submissions
      createdAt: new Date(),
    }
    const result = await db.collection("collections").insertOne(newCollection)
    if (result.acknowledged) {
      res.status(201).json({
        message: "Collection created successfully",
        collection: {
          _id: result.insertedId,
          ...newCollection,
        },
      })
    } else {
      res.status(500).json({ error: "Failed to insert collection into database" })
    }
  } catch (error) {
    console.error("Error creating collection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const joinCollection = async (req, res) => {
  const { username, password } = req.body
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }
  try {
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }
    // Verify password
    if (collection.password !== password) {
      return res.status(401).json({ error: "Invalid password" })
    }
    // If authenticated, you might return some basic collection info or a success message
    res.status(200).json({ message: "Authentication successful", username: collection.username })
  } catch (error) {
    console.error("Error joining collection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getCollectionByUsername = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  try {
    // This endpoint does not require password for fetching basic data
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }
    // Exclude sensitive data like password before sending to frontend
    const { password, ...safeCollection } = collection
    res.status(200).json(safeCollection)
  } catch (error) {
    console.error("Error fetching collection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const getSubmissions = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  try {
    const collection = await db.collection("collections").findOne({ username }, { projection: { submissions: 1 } }) // Only fetch submissions field
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }
    res.status(200).json({ submissions: collection.submissions || [] })
  } catch (error) {
    console.error("Error fetching submissions:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const submitSlideLink = async (req, res) => {
  const { username } = req.params
  const { teamName, teamSerial, slideLink, leaderEmail } = req.body

  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  // Validation: teamSerial and slideLink must be provided
  if (!teamSerial || !slideLink) {
    return res.status(400).json({ error: "Team Serial and Slide Link are required" })
  }

  try {
    // Find the collection
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    // Check if this teamSerial already exists
    const duplicate = collection.submissions.find(s => s.teamSerial === teamSerial)
    if (duplicate) {
      return res.status(409).json({ error: "A submission with this Team Serial already exists" })
    }

    // Create new submission
    const newSubmission = {
      _id: new ObjectId(),
      teamName: teamName || null,
      teamSerial,
      slideLink,
      leaderEmail: leaderEmail || null,
      submittedAt: new Date(),
    }

    // Insert and keep submissions sorted by teamSerial
    const updatedSubmissions = [...(collection.submissions || []), newSubmission]
      .sort((a, b) => a.teamSerial - b.teamSerial)

    const result = await db.collection("collections").updateOne(
      { username },
      { $set: { submissions: updatedSubmissions } }
    )

    if (result.modifiedCount === 1) {
      res.status(201).json({ message: "Slide link submitted successfully", submission: newSubmission })
    } else {
      res.status(500).json({ error: "Failed to add slide link" })
    }
  } catch (error) {
    console.error("Error submitting slide link:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const updateSubmission = async (req, res) => {
  const { username, submissionId } = req.params
  const { teamSerial, slideLink, teamName } = req.body

  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  if (!teamSerial || !slideLink) {
    return res.status(400).json({ error: "Team Serial and Slide Link are required" })
  }

  try {
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    // Check duplicate teamSerial (excluding current submission)
    const duplicate = collection.submissions.find(
      s => s.teamSerial === teamSerial && s._id.toString() !== submissionId
    )
    if (duplicate) {
      return res.status(409).json({ error: "A submission with this Team Serial already exists" })
    }

    const updatedSubmissions = collection.submissions.map(s => 
      s._id.toString() === submissionId
        ? { ...s, teamSerial, slideLink, teamName: teamName || null }
        : s
    ).sort((a, b) => a.teamSerial - b.teamSerial)

    const result = await db.collection("collections").updateOne(
      { username },
      { $set: { submissions: updatedSubmissions } }
    )

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Submission updated successfully" })
    } else {
      res.status(500).json({ error: "Failed to update submission" })
    }
  } catch (error) {
    console.error("Error updating submission:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const deleteSubmission = async (req, res) => {
  const { username, submissionId } = req.params
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  try {
    const result = await db.collection("collections").updateOne(
      { username },
      { $pull: { submissions: { _id: new ObjectId(submissionId) } } }
    )

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Submission deleted successfully" })
    } else {
      res.status(404).json({ error: "Submission not found" })
    }
  } catch (error) {
    console.error("Error deleting submission:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}




const deleteCollection = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  try {
    const result = await db.collection("collections").deleteOne({ username })
    if (result.deletedCount === 1) {
      res.status(200).json({ message: "Collection deleted successfully" })
    } else {
      res.status(404).json({ error: "Collection not found" })
    }
  } catch (error) {
    console.error("Error deleting collection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// NEW: Get Dashboard Statistics
const getDashboardStats = async (req, res) => {
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  try {
    const totalCollections = await db.collection("collections").countDocuments()

    // Aggregate total submissions across all collections
    const totalSubmissionsResult = await db
      .collection("collections")
      .aggregate([
        { $unwind: "$submissions" }, // Deconstructs the submissions array
        { $count: "totalSubmissions" }, // Counts the number of documents (submissions)
      ])
      .toArray()

    const totalSubmissions = totalSubmissionsResult.length > 0 ? totalSubmissionsResult[0].totalSubmissions : 0

    // Calculate active collections (e.g., created in the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeCollections = await db.collection("collections").countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
    })

    res.status(200).json({
      totalCollections,
      totalSubmissions,
      activeCollections,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// NEW: Get Recent Collections (up to 6)
const getRecentCollections = async (req, res) => {
  const db = getDb()
  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }
  try {
    const recentCollections = await db
      .collection("collections")
      .find({}, { projection: { password: 0 } }) // Exclude password
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(6) // Limit to 6 collections
      .toArray()

    res.status(200).json({ collections: recentCollections })
  } catch (error) {
    console.error("Error fetching recent collections:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  createCollection,
  joinCollection,
  getCollectionByUsername,
  getSubmissions,
  submitSlideLink,
  deleteCollection,
  getDashboardStats,
  getRecentCollections,
  updateSubmission,
  deleteSubmission
}
