const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    chatId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: false
    },
    queriesLeft: {
        type: Number,
        default: 30
    },
    lastResetDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }); // `timestamps` מוסיף אוטומטית שדות `createdAt` ו-`updatedAt`

// פונקציה לבדוק אם עבר חודש ולאפס את מכסת השאילתות
userSchema.methods.resetQueriesIfNeeded = function() {
    const now = new Date();
    const lastReset = this.lastResetDate;

    // בודק אם החודש או השנה שונים מהאיפוס האחרון
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        this.queriesLeft = 30; // מאפס את המכסה
        this.lastResetDate = now;
        console.log(`Queries reset for user ${this.chatId}.`);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
