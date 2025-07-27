const axios = require('axios');

async function searchGoogle(query) {
    console.log("▶️ Google Search: Initializing search...");
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
        console.warn('Google Search API key or Engine ID is not defined. Skipping Google search.');
        return [];
    }

    // שאילתה ממוקדת יותר עם העדפה לאתרים ספציפיים
    const focusedQuery = `"${query}" (update OR review OR issues) (site:reddit.com OR site:xda-developers.com OR site:android-israel.co.il)`;

    const url = `https://www.googleapis.com/customsearch/v1`;
    const params = {
        key: apiKey,
        cx: engineId,
        q: focusedQuery,
        num: 10
    };

    try {
        console.log(`🔍 Google Search: Searching with query: ${focusedQuery}`);
        const response = await axios.get(url, { params });
        console.log(`✅ Google Search: Found ${response.data.items ? response.data.items.length : 0} results.`);
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
        console.error('❌ Google Search Error:', error.response ? error.response.data : error.message);
        return [];
    }
}

module.exports = { searchGoogle };
