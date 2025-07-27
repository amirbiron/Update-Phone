const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('FATAL: MONGODB_URI is not defined in environment variables.');
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db; // This variable will hold the database connection instance

async function connectToDB() {
    try {
        await client.connect();
        db = client.db("telegram_bot_db"); // Make sure this is your database name
        console.log("✅ Successfully connected to MongoDB!");
    } catch (err) {
        console.error("💥 Failed to connect to MongoDB", err);
        process.exit(1); // Exit the process with an error code
    }
}

// --- THIS IS THE MISSING FUNCTION ---
function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDB first.');
    }
    return db;
}

// --- AND THIS IS THE CORRECTED EXPORT ---
module.exports = { connectToDB, getDB };
