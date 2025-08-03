const { getDb } = require("../db")
const { ObjectId } = require("mongodb")

const createCollection = async (req, res) => {
  const collectionData = req.body
  const db = getDb()

  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  // Basic validation
  const requiredFields = [
    "section",
    "courseCode",
    "semester",
    "faculty",
    "department",
    "teamCount",
    "password",
  ]
  for (const field of requiredFields) {
    if (!collectionData[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }

  try {
    // Generate a unique username based on frontend logic
    const username = `${collectionData.section}-${collectionData.courseCode}-${new Date().getFullYear()}-${collectionData.department.split(" ")[0]}`

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
      slides: [], // Initialize with an empty array for slides
      createdAt: new Date(),
      creatorEmail: collectionData.creatorEmail || "", // Ensure creatorEmail is stored, even if empty
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

const getCollectionByUsername = async (req, res) => {
  const { username } = req.params
  const db = getDb()

  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  try {
    const collection = await db.collection("collections").findOne({ username })

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    res.status(200).json(collection)
  } catch (error) {
    console.error("Error fetching collection:", error)
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

    if (collection.password !== password) {
      return res.status(403).json({ error: "Incorrect password" })
    }

    res.status(200).json({
      message: "Successfully authenticated",
      collection: {
        _id: collection._id,
        username: collection.username,
        section: collection.section,
        courseCode: collection.courseCode,
        semester: collection.semester,
        department: collection.department,
        teamCount: collection.teamCount,
        createdAt: collection.createdAt,
      },
    })
  } catch (error) {
    console.error("Error joining collection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

const addSlideToCollection = async (req, res) => {
  const { username } = req.params
  const { teamName, slideLink, leaderEmail, password } = req.body // Match frontend's submissionData
  const db = getDb()

  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  if (!teamName || !slideLink || !password) {
    return res.status(400).json({ error: "Team name, slide link, and password are required" })
  }

  try {
    const collection = await db.collection("collections").findOne({ username })

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    // Verify password
    if (collection.password !== password) {
      return res.status(403).json({ error: "Incorrect password" })
    }

    const newSlide = {
      teamName,
      slideLink,
      leaderEmail: leaderEmail || "", // Store leaderEmail, even if empty
      submittedAt: new Date(),
    }

    const result = await db.collection("collections").updateOne(
      { username },
      { $push: { slides: newSlide } }
    )

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Slide added successfully", slide: newSlide })
    } else {
      res.status(500).json({ error: "Failed to add slide to collection" })
    }
  } catch (error) {
    console.error("Error adding slide:", error)
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
    const collection = await db.collection("collections").findOne({ username })

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    res.status(200).json({ submissions: collection.slides })
  } catch (error) {
    console.error("Error fetching submissions:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  createCollection,
  getCollectionByUsername,
  joinCollection,
  addSlideToCollection,
  getSubmissions,
}