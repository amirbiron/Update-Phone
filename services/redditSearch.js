const axios = require('axios');

let accessToken = null;
let tokenExpiresAt = 0;

async function getRedditAccessToken() {
    // ... (This function remains unchanged)
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Reddit API credentials are not defined.');
    }

    if (accessToken && Date.now() < tokenExpiresAt) {
        return accessToken;
    }

    console.log('Requesting new Reddit access token...');
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    try {
        const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
            'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
        console.log('Successfully obtained new Reddit access token.');
        return accessToken;
    } catch (error) {
        console.error('Failed to get Reddit access token:', error.response ? error.response.data : error.message);
        throw new Error('Could not authenticate with Reddit.');
    }
}

async function searchReddit(deviceName, originalQuery) {
    console.log("▶️ Reddit Search: Initializing search...");
    try {
        const token = await getRedditAccessToken();
        const url = `https://oauth.reddit.com/search.json`;
        
        const focusedQuery = `"${deviceName}" AND (${originalQuery.replace(/"/g, '')})`;

        const params = {
            q: focusedQuery,
            limit: 12,
            sort: 'relevance',
            t: 'all',
            restrict_sr: false
        };

        console.log(`🔍 Reddit Search: Searching with query: ${focusedQuery}`);
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            params
        });

        const resultsCount = response.data?.data?.children?.length || 0;
        console.log(`✅ Reddit Search: Found ${resultsCount} results.`);

        if (resultsCount > 0) {
            return response.data.data.children
                .map(post => ({
                    title: post.data.title,
                    link: `https://www.reddit.com${post.data.permalink}`,
                    text: post.data.selftext || '',
                    source: `Reddit (r/${post.data.subreddit})`
                }))
                .filter(item => item.title || item.text);
        }
        return [];
    } catch (error) {
        console.error('❌ Reddit Search Error:', error.response ? error.response.data : error.message);
        return [];
    }
}

module.exports = { searchReddit };
