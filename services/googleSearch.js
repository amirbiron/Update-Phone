const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

// האתרים המוגדרים במנוע החיפוש המותאם אישית
const TARGET_SITES = [
    'reddit.com',
    'xda-developers.com', 
    'androidcentral.com',
    'androidpolice.com',
    '9to5google.com',
    'support.google.com'
];

function extractModelFromQuery(query) {
    const lowerCaseQuery = query.toLowerCase();
    const words = lowerCaseQuery.split(' ');
    const model = words.find(word => /[a-z]/.test(word) && /[0-9]/.test(word));
    return model || null;
}

/**
 * חיפוש באתר ספציפי
 */
async function searchSpecificSite(query, site, maxResults = 5) {
    const siteQuery = `${query} site:${site}`;
    
    try {
        console.log(`🔍 Searching ${site} for: "${query}"`);
        
        const response = await axios.get(googleApiUrl, {
            params: { 
                key: GOOGLE_API_KEY, 
                cx: GOOGLE_CSE_ID, 
                q: siteQuery, 
                num: Math.min(maxResults, 10),
                dateRestrict: 'm6',
                lr: 'lang_en' 
            }
        });

        const items = response.data.items || [];
        console.log(`✅ Found ${items.length} results from ${site}`);
        
        return items.map(item => ({
            ...item,
            sourceSite: site
        }));

    } catch (error) {
        console.warn(`⚠️ Search failed for ${site}:`, error.message);
        return [];
    }
}

/**
 * חיפוש מאוזן בכל האתרים
 */
async function searchAllSitesBalanced(query, resultsPerSite = 15) {
    console.log(`🚀 Starting balanced search across ${TARGET_SITES.length} sites...`);
    
    // חיפוש מקביל בכל האתרים
    const siteSearchPromises = TARGET_SITES.map(site => 
        searchSpecificSite(query, site, resultsPerSite)
    );
    
    try {
        const siteResults = await Promise.all(siteSearchPromises);
        let allResults = [];
        let uniqueLinks = new Set();
        
        // איסוף תוצאות מכל האתרים
        siteResults.forEach((results, index) => {
            const site = TARGET_SITES[index];
            console.log(`📊 ${site}: ${results.length} results`);
            
            results.forEach(item => {
                if (!uniqueLinks.has(item.link)) {
                    uniqueLinks.add(item.link);
                    allResults.push(item);
                }
            });
        });
        
        // סטטיסטיקות
        const siteDistribution = {};
        allResults.forEach(item => {
            siteDistribution[item.sourceSite] = (siteDistribution[item.sourceSite] || 0) + 1;
        });
        
        console.log('📈 Results distribution by site:');
        Object.entries(siteDistribution).forEach(([site, count]) => {
            console.log(`   ${site}: ${count} results`);
        });
        
        return allResults;
        
    } catch (error) {
        console.error('❌ Error in balanced site search:', error.message);
        return [];
    }
}

/**
 * חיפוש היברידי - מאוזן + כללי
 */
async function hybridSearch(query) {
    console.log(`🔄 Starting hybrid search strategy...`);
    
    // 1. חיפוש מאוזן באתרים ספציפיים (עד 15 מכל אתר = 90 תוצאות)
    const balancedResults = await searchAllSitesBalanced(query, 15);
    
    // 2. חיפוש כללי נוסף (אם יש מעט תוצאות)
    let generalResults = [];
    if (balancedResults.length < 60) {
        console.log(`🔍 Adding general search to supplement results...`);
        
        try {
            const response = await axios.get(googleApiUrl, {
                params: { 
                    key: GOOGLE_API_KEY, 
                    cx: GOOGLE_CSE_ID, 
                    q: `${query} review experience feedback`,
                    num: 10,
                    dateRestrict: 'm6',
                    lr: 'lang_en' 
                }
            });
            
            generalResults = (response.data.items || []).map(item => ({
                ...item,
                sourceSite: 'general'
            }));
            
        } catch (error) {
            console.warn('⚠️ General search failed:', error.message);
        }
    }
    
    // 3. איחוד התוצאות
    let allResults = [...balancedResults];
    let uniqueLinks = new Set(balancedResults.map(item => item.link));
    
    generalResults.forEach(item => {
        if (!uniqueLinks.has(item.link)) {
            uniqueLinks.add(item.link);
            allResults.push(item);
        }
    });
    
    console.log(`✅ Total unique results: ${allResults.length}`);
    
    return allResults;
}

/**
 * Fetches results using a balanced approach across multiple sites
 * @param {string} userQuery - The user's query.
 * * @returns {Promise<Array<object>>} A balanced list of search results from multiple sources.
 */
async function searchGoogle(userQuery) {
    const englishQuery = userQuery.replace(/אנדרואיד/g, 'Android').replace(/\?/g, '');
    
    console.log(`🚀 Starting enhanced multi-site search for: "${englishQuery}"`);
    
    try {
        // שימוש בחיפוש היברידי חדש
        const allResults = await hybridSearch(englishQuery);
        
        const model = extractModelFromQuery(englishQuery);
        
        if (!model) {
            // אם אין מודל ספציפי, החזר את כל התוצאות
            return allResults
                .slice(0, 100) // שמירה על 100 תוצאות כמו בקוד המקורי
                .map(item => ({ 
                    title: item.title, 
                    link: item.link, 
                    snippet: item.snippet,
                    sourceSite: item.sourceSite || 'unknown'
                }));
        }

        // סינון לפי מודל ספציפי
        const filteredResults = allResults.filter(item => {
            const titleMatch = item.title && item.title.toLowerCase().includes(model);
            const snippetMatch = item.snippet && item.snippet.toLowerCase().includes(model);
            const linkMatch = item.link && item.link.toLowerCase().includes(model);
            
            return titleMatch || snippetMatch || linkMatch;
        });

        console.log(`🔍 Filtered to ${filteredResults.length} results for model "${model}"`);

        // מיון לפי רלוונטיות
        const sortedResults = filteredResults.sort((a, b) => {
            const aInTitle = a.title && a.title.toLowerCase().includes(model) ? 1 : 0;
            const bInTitle = b.title && b.title.toLowerCase().includes(model) ? 1 : 0;
            return bInTitle - aInTitle;
        });

        return sortedResults
            .slice(0, 100) // שמירה על 100 תוצאות כמו בקוד המקורי
            .map(item => ({ 
                title: item.title, 
                link: item.link, 
                snippet: item.snippet,
                sourceSite: item.sourceSite || 'unknown'
            }));

    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error during enhanced multi-site search:', errorDetails);
        return [];
    }
}

module.exports = { searchGoogle };
