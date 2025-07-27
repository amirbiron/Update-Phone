const axios = require('axios');

async function searchGoogle(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
        console.warn('Google Search API key or Engine ID is not defined. Skipping Google search.');
        return [];
    }

    const url = `https://www.googleapis.com/customsearch/v1`;
    const params = {
        key: apiKey,
        cx: engineId,
        q: `${query} user reviews forum`, // הוספת מילות מפתח לחיפוש ממוקד יותר
        num: 10 // אפשר להגדיר עד 10 בבקשה אחת
    };

    try {
        const response = await axios.get(url, { params });
        if (response.data.items) {
            // החזרת קטעי טקסט (snippets) מהתוצאות
            return response.data.items.map(item => item.snippet);
        }
        return [];
    } catch (error) {
        console.error('Error fetching data from Google Search:', error.response ? error.response.data : error.message);
        return []; // החזר מערך ריק במקרה של שגיאה
    }
}

module.exports = { searchGoogle };
