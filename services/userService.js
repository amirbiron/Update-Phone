const { getDB } = require('./mongo');

// A helper function to get the users collection
const getUsersCollection = () => {
    const db = getDB();
    if (!db) {
        throw new Error('Database not connected. Cannot get users collection.');
    }
    return db.collection('users');
};

/**
 * Finds a user by their Telegram ID. If the user doesn't exist, it creates a new one.
 * @param {object} telegramUser - The user object from the Telegram message (msg.from).
 * @returns {Promise<object>} The user document from the database.
 */
async function getOrCreateUser(telegramUser) {
    const users = getUsersCollection();
    const { id, first_name, last_name, username } = telegramUser;

    let user = await users.findOne({ telegramId: id });

    if (!user) {
        console.log(`User with ID ${id} not found. Creating new user...`);
        const newUser = {
            telegramId: id,
            firstName: first_name,
            lastName: last_name,
            username: username,
            monthlyQueryCount: 0,
            firstSeen: new Date(),
        };
        await users.insertOne(newUser);
        user = newUser;
    }

    return user;
}

/**
 * Updates the monthly query count for a specific user.
 * @param {number} telegramId - The user's Telegram ID.
 * @param {number} newCount - The new query count to set.
 * @returns {Promise<void>}
 */
async function updateUserQueries(telegramId, newCount) {
    const users = getUsersCollection();
    await users.updateOne(
        { telegramId: telegramId },
        { $set: { monthlyQueryCount: newCount, lastQueryDate: new Date() } }
    );
}

/**
 * Gets users who were active in the last week.
 * @returns {Promise<Array>} Array of user objects who were active in the last 7 days.
 */
async function getRecentUsers() {
    const users = getUsersCollection();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentUsers = await users.find({
        lastQueryDate: { $gte: oneWeekAgo }
    }).sort({ lastQueryDate: -1 }).toArray();

    return recentUsers;
}

module.exports = { getOrCreateUser, updateUserQueries, getRecentUsers };
