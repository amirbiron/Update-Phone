const mongoose = require('mongoose');

async function connectToDB() {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
        throw new Error('💥 MONGODB_URI is not defined in environment variables!');
    }

    try {
        // Mongoose 6+ doesn't require the old options object
        await mongoose.connect(mongoURI);
        console.log('✅ Successfully connected to MongoDB.');
    } catch (error) {
        console.error('💥 FATAL: Failed to connect to MongoDB:', error.message);
        // זרוק את השגיאה כדי שהאפליקציה הראשית תתפוס אותה ותיעצר
        throw error;
    }
}

module.exports = { connectToDB };
