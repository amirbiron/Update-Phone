const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key or CSE ID is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

/**
 * Searches Google using the balanced query strategy you reminded me of.
 * @param {string} query - The user's clean query (e.g., "Galaxy A54 Android 15").
 * @returns {Promise<Array<object>>} A list of relevant search results.
 */
async function searchGoogle(query) {
    // --- This is YOUR suggestion in action ---
    // We append neutral, balanced keywords to the user's query.
    const balancedQuery = `${query} review feedback experience user reports thoughts`;
    
    console.log(`🔎 Searching Google with BALANCED query: "${balancedQuery}"`);

    try {
        const response = await axios.get(googleApiUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CSE_ID,
                q: balancedQuery,
                // --- Implementing more of your suggestions ---
                num: 10, // Getting up to 10 results to have a better pool for analysis.
                dateRestrict: 'm3', // Limiting results to the last 3 months.
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            console.log(`✅ Google Search: Found ${results.length} results.`);
            return results;
        } else {
            console.log('⚠️ Google Search: No results found for the balanced query.');
            return [];
        }
    } catch (error) {
        // Log the detailed error from Google's API if available
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error fetching Google Search results:', errorDetails);
        return []; // Return an empty array on error so the bot doesn't crash.
    }
}

module.exports = { searchGoogle };
