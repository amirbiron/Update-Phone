const axios = require('axios');

async function searchGoogle(userQuery) {
    console.log("▶️ Google Search: Initializing search...");
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
        console.warn('Google Search API key or Engine ID is not defined. Skipping Google search.');
        return [];
    }

    // שאילתה מאוזנת המבוססת על העקרונות הנכונים
    const balancedQuery = `${userQuery} update feedback experience review thoughts user reports`;

    const url = `https://www.googleapis.com/customsearch/v1`;
    const params = {
        key: apiKey,
        cx: engineId,
        q: balancedQuery,
        num: 10,
        dateRestrict: 'm6', // הגבלת החיפוש לחצי השנה האחרונה
        lr: 'lang_en|lang_he' // העדפה לאנגלית ועברית
    };

    try {
        console.log(`🔍 Google Search: Searching with balanced query: ${balancedQuery}`);
        const response = await axios.get(url, { params });
        const resultsCount = response.data.items ? response.data.items.length : 0;
        console.log(`✅ Google Search: Found ${resultsCount} results.`);
        
        if (resultsCount > 0) {
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
