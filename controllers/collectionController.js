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
  const { teamName, slideLink, leaderEmail } = req.body
  const db = getDb()

  if (!db) {
    return res.status(500).json({ error: "Database not connected" })
  }

  if (!teamName || !slideLink) {
    return res.status(400).json({ error: "Team Name and Slide Link are required" })
  }

  try {
    // Find the collection to ensure it exists
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" })
    }

    const newSubmission = {
      _id: new ObjectId(), // Generate a unique ID for the submission
      teamName,
      slideLink,
      leaderEmail: leaderEmail || null,
      submittedAt: new Date(),
    }

    const result = await db.collection("collections").updateOne({ username }, { $push: { submissions: newSubmission } })

    if (result.modifiedCount === 1) {
      res.status(201).json({ message: "Slide link submitted successfully", submission: newSubmission })
    } else {
      res.status(500).json({ error: "Failed to add slide link to collection" })
    }
  } catch (error) {
    console.error("Error submitting slide link:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// This function was from previous iteration, keeping it here in case you need it for general slides
// const addSlideToCollection = async (req, res) => {
//   const { username } = req.params
//   const { password, slideUrl, slideTitle } = req.body
//   const db = getDb()

//   if (!db) {
//     return res.status(500).json({ error: "Database not connected" })
//   }

//   if (!password || !slideUrl) {
//     return res.status(400).json({ error: "Password and slide URL are required" })
//   }

//   try {
//     const collection = await db.collection("collections").findOne({ username })

//     if (!collection) {
//       return res.status(404).json({ error: "Collection not found" })
//     }

//     if (collection.password !== password) {
//       return res.status(403).json({ error: "Incorrect password" })
//     }

//     const newSlide = {
//       url: slideUrl,
//       title: slideTitle || `Slide ${collection.slides.length + 1}`,
//       addedAt: new Date(),
//     }

//     const result = await db.collection("collections").updateOne({ username }, { $push: { slides: newSlide } })

//     if (result.modifiedCount === 1) {
//       res.status(200).json({ message: "Slide added successfully", slide: newSlide })
//     } else {
//       res.status(500).json({ error: "Failed to add slide to collection" })
//     }
//   } catch (error) {
//     console.error("Error adding slide:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// }

module.exports = {
  createCollection,
  joinCollection,
  getCollectionByUsername,
  getSubmissions,
  submitSlideLink,
  // addSlideToCollection, // Uncomment if you still need this endpoint
}
