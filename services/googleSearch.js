const axios = require('axios');

async function searchGoogle(deviceName, originalQuery) {
    console.log("▶️ Google Search: Initializing search...");
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
        console.warn('Google Search API key or Engine ID is not defined. Skipping Google search.');
        return [];
    }

    // שלב 1: חיפוש רחב עם השאילתה המקורית כדי לתפוס את ההקשר
    // שלב 2: הוספת שם המכשיר הנקי כדי להבטיח רלוונטיות
    // שלב 3: הוספת מילות מפתח קבועות למיקוד בנושאי עדכונים
    const focusedQuery = `"${deviceName}" AND (${originalQuery}) (update OR review OR issues OR battery)`;

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
