const axios = require('axios');

async function searchGoogle(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
        console.warn('Google Search API key or Engine ID is not defined. Skipping Google search.');
        return [];
    }

    // שאילתה מאוזנת יותר - כוללת בעיות, חוויות ותכונות
    const focusedQuery = `"${query}" (software update OR android update OR one ui update) (experience OR review OR problems OR features OR battery)`;

    const url = `https://www.googleapis.com/customsearch/v1`;
    const params = {
        key: apiKey,
        cx: engineId,
        q: focusedQuery,
        num: 10 // ה-API מגביל לעד 10 תוצאות
    };

    try {
        console.log(`Searching Google with balanced query: ${focusedQuery}`);
        const response = await axios.get(url, { params });
        if (response.data.items) {
            return response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                source: item.displayLink || 'Google Search'
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching data from Google Search:', error.response ? error.response.data : error.message);
        return [];
    }
}

module.exports = { searchGoogle };
