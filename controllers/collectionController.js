const { getDb } = require("../db")
const { ObjectId } = require("mongodb")

const createCollection = async (req, res) => {
  const collectionData = req.body
  const db = getDb()
  
  console.log("📝 CREATE COLLECTION REQUEST:", collectionData)
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  // Basic validation
  const requiredFields = ["section", "courseCode", "semester", "faculty", "department", "teamCount", "password"]
  for (const field of requiredFields) {
    if (!collectionData[field]) {
      console.error("❌ Missing required field:", field)
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  
  try {
    // Generate a unique username based on frontend logic
    const departmentAbbreviationMatch = collectionData.department.match(/\$\$([^)]+)\$\$/)
    const deptCode = departmentAbbreviationMatch
      ? departmentAbbreviationMatch[1]
      : collectionData.department.split(" ")[0]
    const cleanSection = collectionData.section.replace(/[^a-zA-Z0-9]/g, "")
    const username = `${cleanSection}-${collectionData.courseCode}-${new Date().getFullYear()}-${deptCode}`

    console.log("🔤 Generated username:", username)

    // Check if a collection with this username already exists
    const existingCollection = await db.collection("collections").findOne({ username })
    if (existingCollection) {
      console.error("❌ Collection already exists:", username)
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
    
    console.log("📦 Creating collection:", { username, ...collectionData })
    
    const result = await db.collection("collections").insertOne(newCollection)
    if (result.acknowledged) {
      console.log("✅ Collection created successfully:", result.insertedId)
      res.status(201).json({
        message: "Collection created successfully",
        collection: {
          _id: result.insertedId,
          ...newCollection,
        },
      })
    } else {
      console.error("❌ Failed to insert collection")
      res.status(500).json({ error: "Failed to insert collection into database" })
    }
  } catch (error) {
    console.error("❌ Error creating collection:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const joinCollection = async (req, res) => {
  const { username, password } = req.body
  const db = getDb()
  
  console.log("🔐 JOIN COLLECTION REQUEST:", { username, password: "***" })
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  if (!username || !password) {
    console.error("❌ Missing username or password")
    return res.status(400).json({ error: "Username and password are required" })
  }
  
  try {
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      console.error("❌ Collection not found:", username)
      return res.status(404).json({ error: "Collection not found" })
    }
    
    // Verify password
    if (collection.password !== password) {
      console.error("❌ Invalid password for collection:", username)
      return res.status(401).json({ error: "Invalid password" })
    }
    
    console.log("✅ Authentication successful for:", username)
    res.status(200).json({ message: "Authentication successful", username: collection.username })
  } catch (error) {
    console.error("❌ Error joining collection:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const getCollectionByUsername = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  
  console.log("📖 GET COLLECTION REQUEST:", username)
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  try {
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      console.error("❌ Collection not found:", username)
      return res.status(404).json({ error: "Collection not found" })
    }
    
    // Exclude sensitive data like password before sending to frontend
    const { password, ...safeCollection } = collection
    console.log("✅ Collection found:", username, "- submissions:", safeCollection.submissions?.length || 0)
    res.status(200).json(safeCollection)
  } catch (error) {
    console.error("❌ Error fetching collection:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const getSubmissions = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  
  console.log("📋 GET SUBMISSIONS REQUEST:", username)
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  try {
    const collection = await db.collection("collections").findOne({ username }, { projection: { submissions: 1 } })
    if (!collection) {
      console.error("❌ Collection not found:", username)
      return res.status(404).json({ error: "Collection not found" })
    }
    
    console.log("✅ Submissions found:", collection.submissions?.length || 0, "items")
    res.status(200).json({ submissions: collection.submissions || [] })
  } catch (error) {
    console.error("❌ Error fetching submissions:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const submitSlideLink = async (req, res) => {
  const { username } = req.params
  const { teamName, teamSerial, slideLink, leaderEmail } = req.body
  const db = getDb()

  console.log("📤 SUBMIT SLIDE LINK REQUEST:")
  console.log("   - Username:", username)
  console.log("   - Body:", { teamName, teamSerial, slideLink, leaderEmail })

  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }

  // Validation: teamSerial and slideLink must be provided
  if (!teamSerial || !slideLink) {
    console.error("❌ Missing required fields")
    return res.status(400).json({ error: "Team Serial and Slide Link are required" })
  }

  try {
    // Find the collection
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      console.error("❌ Collection not found:", username)
      return res.status(404).json({ error: "Collection not found" })
    }

    console.log("✅ Found collection with", collection.submissions?.length || 0, "existing submissions")

    // Check if this teamSerial already exists
    const duplicate = collection.submissions?.find(s => s.teamSerial === teamSerial)
    if (duplicate) {
      console.error("❌ Duplicate team serial:", teamSerial)
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

    console.log("📦 Creating new submission:", newSubmission)

    // Insert and keep submissions sorted by teamSerial
    const updatedSubmissions = [...(collection.submissions || []), newSubmission]
      .sort((a, b) => Number(a.teamSerial) - Number(b.teamSerial))

    const result = await db.collection("collections").updateOne(
      { username },
      { $set: { submissions: updatedSubmissions } }
    )

    if (result.modifiedCount === 1) {
      console.log("✅ Submission added successfully")
      res.status(201).json({ message: "Slide link submitted successfully", submission: newSubmission })
    } else {
      console.error("❌ Failed to add submission")
      res.status(500).json({ error: "Failed to add slide link" })
    }
  } catch (error) {
    console.error("❌ Error submitting slide link:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const updateSubmission = async (req, res) => {
  const { username, submissionId } = req.params
  const { teamSerial, slideLink, teamName } = req.body
  const db = getDb()

  console.log("🔄 UPDATE SUBMISSION REQUEST:")
  console.log("   - Username:", username)
  console.log("   - Submission ID:", submissionId)
  console.log("   - Submission ID type:", typeof submissionId)
  console.log("   - Body:", { teamSerial, slideLink, teamName })

  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }

  if (!teamSerial || !slideLink) {
    console.error("❌ Missing required fields")
    return res.status(400).json({ error: "Team Serial and Slide Link are required" })
  }

  // Validate ObjectId format
  if (!ObjectId.isValid(submissionId)) {
    console.error("❌ Invalid submission ID format:", submissionId)
    return res.status(400).json({ error: "Invalid submission ID format" })
  }

  try {
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      console.error("❌ Collection not found for username:", username)
      return res.status(404).json({ error: "Collection not found" })
    }

    console.log("✅ Found collection with", collection.submissions?.length || 0, "submissions")

    // Check if submission exists
    const submissionExists = collection.submissions?.find((s) => s._id.toString() === submissionId)
    if (!submissionExists) {
      console.error("❌ Submission not found:", submissionId)
      if (collection.submissions?.length > 0) {
        console.log("Available submission IDs:")
        collection.submissions.forEach((sub, index) => {
          console.log(`   ${index}: ${sub._id} (${sub._id.toString()})`)
        })
      }
      return res.status(404).json({ error: "Submission not found" })
    }

    console.log("✅ Found submission to update:", submissionExists)

    // Check duplicate teamSerial (excluding current submission)
    const duplicate = collection.submissions?.find(
      (s) => s.teamSerial === teamSerial && s._id.toString() !== submissionId,
    )
    if (duplicate) {
      console.error("❌ Duplicate team serial:", teamSerial)
      return res.status(409).json({ error: "A submission with this Team Serial already exists" })
    }

    const updatedSubmissions = collection.submissions
      .map((s) =>
        s._id.toString() === submissionId
          ? { ...s, teamSerial, slideLink, teamName: teamName || null, updatedAt: new Date() }
          : s,
      )
      .sort((a, b) => Number(a.teamSerial) - Number(b.teamSerial))

    console.log("🔄 Updating collection with", updatedSubmissions.length, "submissions")

    const result = await db
      .collection("collections")
      .updateOne({ username }, { $set: { submissions: updatedSubmissions } })

    console.log("🔄 Update result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    })

    if (result.modifiedCount === 1) {
      console.log("✅ Update successful")
      res.status(200).json({ message: "Submission updated successfully" })
    } else {
      console.error("❌ Update failed - no documents modified")
      console.error("   - Matched count:", result.matchedCount)
      res.status(500).json({ error: "Failed to update submission - no changes made" })
    }
  } catch (error) {
    console.error("❌ Error updating submission:", error)
    console.error("❌ Error stack:", error.stack)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const deleteSubmission = async (req, res) => {
  const { username, submissionId } = req.params
  const db = getDb()

  console.log("🗑️ DELETE SUBMISSION REQUEST:")
  console.log("   - Username:", username)
  console.log("   - Submission ID:", submissionId)
  console.log("   - Submission ID type:", typeof submissionId)

  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }

  // Validate ObjectId format
  if (!ObjectId.isValid(submissionId)) {
    console.error("❌ Invalid submission ID format:", submissionId)
    return res.status(400).json({ error: "Invalid submission ID format" })
  }

  try {
    console.log("🗑️ Converting submission ID to ObjectId...")
    const objectId = new ObjectId(submissionId)
    console.log("🗑️ ObjectId created:", objectId)

    // First, let's find the collection to see what we're working with
    const collection = await db.collection("collections").findOne({ username })
    if (!collection) {
      console.error("❌ Collection not found for username:", username)
      return res.status(404).json({ error: "Collection not found" })
    }

    console.log("✅ Found collection with", collection.submissions?.length || 0, "submissions")
    
    if (collection.submissions && collection.submissions.length > 0) {
      console.log("🗑️ Available submission IDs:")
      collection.submissions.forEach((sub, index) => {
        console.log(`   ${index}: ${sub._id} (${sub._id.toString()}) - Team: ${sub.teamName || 'N/A'}`)
      })
      
      const targetSubmission = collection.submissions.find(s => s._id.toString() === submissionId)
      if (!targetSubmission) {
        console.error("❌ Target submission not found in collection")
        return res.status(404).json({ error: "Submission not found in collection" })
      }
      
      console.log("✅ Found target submission:", {
        id: targetSubmission._id,
        teamName: targetSubmission.teamName,
        teamSerial: targetSubmission.teamSerial
      })
    } else {
      console.error("❌ No submissions in collection")
      return res.status(404).json({ error: "No submissions found in collection" })
    }

    // Perform the deletion
    console.log("🗑️ Executing delete operation...")
    const result = await db
      .collection("collections")
      .updateOne(
        { username: username }, 
        { $pull: { submissions: { _id: objectId } } }
      )

    console.log("🗑️ Delete result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    })

    if (result.modifiedCount === 1) {
      console.log("✅ Delete successful")
      res.status(200).json({ message: "Submission deleted successfully" })
    } else if (result.matchedCount === 1 && result.modifiedCount === 0) {
      console.error("❌ Delete failed - submission not found (matched collection but no submission removed)")
      res.status(404).json({ error: "Submission not found or already deleted" })
    } else if (result.matchedCount === 0) {
      console.error("❌ Delete failed - collection not found")
      res.status(404).json({ error: "Collection not found" })
    } else {
      console.error("❌ Delete failed - unknown reason")
      res.status(500).json({ error: "Failed to delete submission" })
    }
  } catch (error) {
    console.error("❌ Error deleting submission:", error)
    console.error("❌ Error stack:", error.stack)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const deleteCollection = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  
  console.log("🗑️ DELETE COLLECTION REQUEST:", username)
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  try {
    const result = await db.collection("collections").deleteOne({ username })
    console.log("🗑️ Delete collection result:", result)
    
    if (result.deletedCount === 1) {
      console.log("✅ Collection deleted successfully")
      res.status(200).json({ message: "Collection deleted successfully" })
    } else {
      console.error("❌ Collection not found for deletion:", username)
      res.status(404).json({ error: "Collection not found" })
    }
  } catch (error) {
    console.error("❌ Error deleting collection:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const getDashboardStats = async (req, res) => {
  const db = getDb()
  
  console.log("📊 GET DASHBOARD STATS REQUEST")
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  try {
    const totalCollections = await db.collection("collections").countDocuments()

    // Aggregate total submissions across all collections
    const totalSubmissionsResult = await db
      .collection("collections")
      .aggregate([
        { $unwind: "$submissions" },
        { $count: "totalSubmissions" },
      ])
      .toArray()

    const totalSubmissions = totalSubmissionsResult.length > 0 ? totalSubmissionsResult[0].totalSubmissions : 0

    // Calculate active collections (e.g., created in the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeCollections = await db.collection("collections").countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
    })

    const stats = {
      totalCollections,
      totalSubmissions,
      activeCollections,
    }

    console.log("✅ Dashboard stats:", stats)
    res.status(200).json(stats)
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

const getRecentCollections = async (req, res) => {
  const db = getDb()
  
  console.log("📋 GET RECENT COLLECTIONS REQUEST")
  
  if (!db) {
    console.error("❌ Database not connected")
    return res.status(500).json({ error: "Database not connected" })
  }
  
  try {
    const recentCollections = await db
      .collection("collections")
      .find({}, { projection: { password: 0 } }) // Exclude password
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(6) // Limit to 6 collections
      .toArray()

    console.log("✅ Recent collections found:", recentCollections.length)
    res.status(200).json({ collections: recentCollections })
  } catch (error) {
    console.error("❌ Error fetching recent collections:", error)
    res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

// DEBUG ENDPOINT - Add this temporarily for troubleshooting
const debugCollection = async (req, res) => {
  const { username } = req.params
  const db = getDb()
  
  console.log("🔍 DEBUG COLLECTION REQUEST:", username)
  
  if (!db) {
    return res.json({ error: "Database not connected", username })
  }
  
  try {
    const collection = await db.collection("collections").findOne({ username })
    
    if (!collection) {
      return res.json({ error: "Collection not found", username })
    }
    
    const debugInfo = {
      username: collection.username,
      submissionsCount: collection.submissions?.length || 0,
      hasSubmissions: !!collection.submissions,
      submissions: collection.submissions?.map((sub, index) => ({
        index,
        id: sub._id,
        idType: typeof sub._id,
        idString: sub._id.toString(),
        isValidObjectId: ObjectId.isValid(sub._id.toString()),
        teamName: sub.teamName,
        teamSerial: sub.teamSerial,
        submittedAt: sub.submittedAt
      })) || [],
      collectionKeys: Object.keys(collection)
    }
    
    console.log("🔍 Debug info generated for:", username)
    res.json(debugInfo)
  } catch (error) {
    console.error("❌ Debug endpoint error:", error)
    res.json({ error: error.message, stack: error.stack })
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
  deleteSubmission,
  debugCollection // Export the debug function
}