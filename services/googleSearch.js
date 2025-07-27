const axios = require('axios');

// --- THIS IS YOUR FIX, USING THE CORRECT ENV VAR NAMES ---
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

// A helper function to perform a single search query
async function executeSearch(query, siteFilter = null) {
    let finalQuery = query;
    if (siteFilter) {
        finalQuery = `${query} ${siteFilter}`;
    }

    try {
        const response = await axios.get(googleApiUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CSE_ID,
                q: finalQuery,
                num: 10, // The API max is 10 per request
                dateRestrict: 'm3',
            }
        });
        return response.data.items || [];
    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error(`❌ Error searching for "${finalQuery}":`, errorDetails);
        return []; // Return empty array on error
    }
}

/**
 * Implements the "12 + 12" strategy by running two parallel searches.
 * @param {string} query - The user's clean query (e.g., "Galaxy A54 Android 15").
 * @returns {Promise<Array<object>>} A combined and deduplicated list of search results.
 */
async function searchGoogle(query) {
    const balancedQuery = `${query} review feedback experience user reports thoughts`;
    console.log(`🔎 Starting parallel search for: "${balancedQuery}"`);

    // Define the sites for the second search
    const otherTechSites = [
        'site:xda-developers.com',
        'site:androidpolice.com',
        'site:androidcentral.com',
        'site:sammobile.com'
    ].join(' OR ');

    // Create two parallel search promises
    const redditSearchPromise = executeSearch(balancedQuery, 'site:reddit.com');
    const otherSitesSearchPromise = executeSearch(balancedQuery, otherTechSites);

    // Run both searches at the same time
    const [redditResults, otherResults] = await Promise.all([
        redditSearchPromise,
        otherSitesSearchPromise
    ]);

    console.log(`✅ Found ${redditResults.length} results from Reddit.`);
    console.log(`✅ Found ${otherResults.length} results from other tech sites.`);

    // Combine results
    const allResults = [...redditResults, ...otherResults];

    // Remove duplicates based on the link
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.link, item])).values());

    console.log(`📊 Total unique results after combining: ${uniqueResults.length}`);

    if (uniqueResults.length === 0) {
        console.log('⚠️ Google Search: No results found from any source.');
    }
    
    // Map to the final format we need
    return uniqueResults.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
    }));
}

module.exports = { searchGoogle };
