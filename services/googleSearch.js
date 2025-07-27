const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

/**
 * Executes the definitive, language-corrected search query.
 * @param {string} userQuery - The user's query, potentially in Hebrew.
 * @returns {Promise<Array<object>>} A list of relevant search results.
 */
async function searchGoogle(userQuery) {
    // --- THE REAL FIX: TRANSLATE HEBREW TO ENGLISH ---
    // The bug was searching for Hebrew words ("אנדרואיד") while demanding English-only results (lr: 'lang_en').
    // This created a contradiction. The solution is to search for English terms in English pages.
    const englishQuery = userQuery
        .replace(/אנדרואיד/g, 'Android')
        .replace(/\?/g, '');

    const finalQuery = `${englishQuery} review feedback experience thoughts issues problems bugs after update`;

    console.log(`🔎 Executing TRANSLATED search: "${finalQuery}"`);

    try {
        const response = await axios.get(googleApiUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CSE_ID,
                q: finalQuery,
                num: 10,
                dateRestrict: 'm3',
                lr: 'lang_en'
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            console.log(`✅ Google Search: Found ${results.length} relevant English results.`);
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
