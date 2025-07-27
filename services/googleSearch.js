const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

function extractModelFromQuery(query) {
    const lowerCaseQuery = query.toLowerCase();
    const words = lowerCaseQuery.split(' ');
    const model = words.find(word => /[a-z]/.test(word) && /[0-9]/.test(word));
    return model || null;
}

/**
 * Fetches up to 30 results and performs intelligent filtering on title OR snippet.
 * @param {string} userQuery - The user's query.
 * @returns {Promise<Array<object>>} A large, well-filtered list of relevant search results.
 */
async function searchGoogle(userQuery) {
    const englishQuery = userQuery.replace(/אנדרואיד/g, 'Android').replace(/\?/g, '');
    const finalQuery = `${englishQuery} review feedback experience thoughts issues problems bugs after update`;
    
    const model = extractModelFromQuery(englishQuery);
    if (!model) {
        console.warn("Could not extract a specific model from the query for filtering. Results may be less focused.");
    }

    console.log(`🚀 Initiating paginated search for up to 30 results...`);

    const searchPromises = [1, 11, 21].map(start => {
        return axios.get(googleApiUrl, {
            params: { key: GOOGLE_API_KEY, cx: GOOGLE_CSE_ID, q: finalQuery, num: 10, start: start, dateRestrict: 'm3', lr: 'lang_en' }
        });
    });

    try {
        const responses = await Promise.all(searchPromises);
        let allResults = [];
        responses.forEach(response => {
            if (response.data.items) {
                allResults = allResults.concat(response.data.items);
            }
        });

        console.log(`✅ Collected ${allResults.length} raw results from Google.`);

        if (!model) return allResults.map(item => ({ title: item.title, link: item.link, snippet: item.snippet }));

        // **THE KEY FIX**: Filter if model appears in title OR snippet.
        const filteredResults = allResults.filter(item => 
            (item.title && item.title.toLowerCase().includes(model)) ||
            (item.snippet && item.snippet.toLowerCase().includes(model))
        );

        console.log(`🔍 Filtered down to ${filteredResults.length} results specifically mentioning "${model}" in title or snippet.`);

        return filteredResults.map(item => ({ title: item.title, link: item.link, snippet: item.snippet }));

    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error during paginated Google Search:', errorDetails);
        return [];
    }
}

module.exports = { searchGoogle };
