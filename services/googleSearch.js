const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

/**
 * Executes the definitive, most precise search query.
 * @param {string} userQuery - The user's query.
 * @returns {Promise<Array<object>>} A list of relevant search results.
 */
async function searchGoogle(userQuery) {
    const cleanedQuery = userQuery.replace(/\?/g, '');
    const finalQuery = `${cleanedQuery} review feedback experience thoughts issues problems bugs after update`;

    console.log(`🔎 Executing DEFINITIVE search: "${finalQuery}"`);

    try {
        const response = await axios.get(googleApiUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CSE_ID,
                q: finalQuery,
                num: 10,
                // --- YOUR SUGGESTIONS, FINALLY IMPLEMENTED CORRECTLY ---
                dateRestrict: 'm3', // Results from the last 3 months
                lr: 'lang_en'      // English language results only
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            console.log(`✅ Google Search: Found ${results.length} highly relevant results.`);
            return results;
        } else {
            console.log('⚠️ Google Search: No relevant results found in the last 3 months.');
            return [];
        }

    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error fetching Google Search results:', errorDetails);
        return [];
    }
}

module.exports = { searchGoogle };
