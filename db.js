const { MongoClient } = require("mongodb")

let dbConnection
const uri = process.env.MONGO_URI

module.exports = {
  connectDB: (cb) => {
    MongoClient.connect(uri)
      .then((client) => {
        dbConnection = client.db()
        console.log("Connected to MongoDB")
        return cb(null)
      })
      .catch((err) => {
        console.error("MongoDB connection error:", err)
        return cb(err)
      })
  },
  getDb: () => dbConnection,
}
