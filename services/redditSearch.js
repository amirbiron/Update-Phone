const axios = require('axios');

async function searchReddit(query) {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('Reddit API credentials are not defined. Skipping Reddit search.');
        return [];
    }

    const url = `https://www.reddit.com/search.json`;
    const params = {
        q: query,
        limit: 20, // בקשת 20 תוצאות
        sort: 'relevance'
    };

    try {
        const response = await axios.get(url, { params });
        if (response.data && response.data.data && response.data.data.children) {
            // החזרת התוכן של הפוסטים (selftext)
            return response.data.data.children
                .map(post => post.data.selftext)
                .filter(text => text); // סנן פוסטים ללא תוכן טקסטואלי
        }
        return [];
    } catch (error) {
        console.error('Error fetching data from Reddit:', error.response ? error.response.data : error.message);
        return [];
    }
}

module.exports = { searchReddit };
