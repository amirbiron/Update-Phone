const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

/**
 * Executes a single, powerful search query across all desired sites.
 * @param {string} query - The user's clean query (e.g., "Galaxy A54 Android 15").
 * @returns {Promise<Array<object>>} A list of relevant search results.
 */
async function searchGoogle(query) {
    // Combine all desired sites into one powerful "OR" operator
    const targetSites = [
        'site:reddit.com',
        'site:xda-developers.com',
        'site:androidpolice.com',
        'site:androidcentral.com',
        'site:sammobile.com',
        'site:gsmarena.com' // Added another popular site for good measure
    ].join(' OR ');

    // Create the final, balanced query
    const finalQuery = `${query} review feedback experience user reports thoughts (${targetSites})`;

    console.log(`🔎 Executing single, powerful search: "${finalQuery}"`);

    try {
        const response = await axios.get(googleApiUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CSE_ID,
                q: finalQuery,
                num: 10, // Get the max number of results
                dateRestrict: 'm3', // Limit to the last 3 months
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            console.log(`✅ Google Search: Found ${results.length} results from a single powerful query.`);
            return results;
        } else {
            console.log('⚠️ Google Search: No results found for the combined query.');
            return [];
        }

    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error fetching Google Search results:', errorDetails);
        return [];
    }
}

module.exports = { searchGoogle };
