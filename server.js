require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { connectDB, getDb } = require("./db")
const collectionRoutes = require("./routes/collectionRoutes") // Make sure this path is correct!
const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors()) // Enable CORS for all origins
app.use(express.json()) // Parse JSON request bodies

// Connect to MongoDB
connectDB((err) => {
  if (!err) {
    // Routes
    app.use("/api", collectionRoutes) // This prefixes all routes in collectionRoutes with /api
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } else {
    console.error("Failed to connect to MongoDB:", err)
    process.exit(1) // Exit process if DB connection fails
  }
})

// Basic route for testing
app.get("/", (req, res) => {
  res.send("SlideLink Backend is running!")
})
