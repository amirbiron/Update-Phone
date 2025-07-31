const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY/GOOGLE_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID/GOOGLE_CSE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

// האתרים המוגדרים לחיפוש
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
 * חיפוש באתר ספציפי עם site: operator
 */
async function searchSpecificSite(query, site, maxResults = 10) {
    // שימוש ב-site: operator ישירות במקום להסתמך על CSE
    const siteQuery = `${query} site:${site}`;
    
    try {
        console.log(`🔍 Searching ${site} for: "${query}"`);
        console.log(`📝 Full query: "${siteQuery}"`);
        
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
        
        // דיבאג - הצגת התוצאות הראשונות
        if (items.length > 0) {
            console.log(`📋 First result from ${site}:`);
            console.log(`   Title: ${items[0].title}`);
            console.log(`   URL: ${items[0].link}`);
            console.log(`   Domain: ${new URL(items[0].link).hostname}`);
        } else {
            console.log(`❌ No results found for site:${site} with query: "${query}"`);
        }
        
        return items.map(item => ({
            ...item,
            sourceSite: site
        }));
        
    } catch (error) {
        console.warn(`⚠️ Search failed for ${site}:`, error.message);
        if (error.response) {
            console.warn(`   Status: ${error.response.status}`);
            console.warn(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
        return [];
    }
}

/**
 * חיפוש מאוזן בכל האתרים
 */
async function searchAllSitesBalanced(query, resultsPerSite = 8) {
    console.log(`🚀 Starting balanced search across ${TARGET_SITES.length} sites...`);
    console.log(`📝 Query: "${query}"`);
    console.log(`🎯 Target sites: ${TARGET_SITES.join(', ')}`);
    
    // חיפוש מקביל בכל האתרים עם site: operator
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
        
        // סטטיסטיקות מפורטות
        const siteDistribution = {};
        allResults.forEach(item => {
            siteDistribution[item.sourceSite] = (siteDistribution[item.sourceSite] || 0) + 1;
        });
        
        console.log('📈 Results distribution by site:');
        Object.entries(siteDistribution).forEach(([site, count]) => {
            console.log(`   ${site}: ${count} results`);
        });
        
        // אזהרות אם יש בעיות
        const sitesWithResults = Object.keys(siteDistribution).length;
        if (sitesWithResults === 1 && siteDistribution['reddit.com']) {
            console.log('🚨 WARNING: Only Reddit results found! Check CSE configuration.');
        } else if (sitesWithResults < TARGET_SITES.length / 2) {
            console.log(`⚠️  WARNING: Only ${sitesWithResults}/${TARGET_SITES.length} sites returned results.`);
        } else {
            console.log(`✅ Good distribution: ${sitesWithResults}/${TARGET_SITES.length} sites have results.`);
        }
        
        return allResults;
        
    } catch (error) {
        console.error('❌ Error in balanced site search:', error.message);
        return [];
    }
}

/**
 * חיפוש כללי נוסף (בלי site: restrictions)
 */
async function generalSearch(query, maxResults = 15) {
    console.log(`🔍 Adding general search to supplement results...`);
    
    try {
        const response = await axios.get(googleApiUrl, {
            params: { 
                key: GOOGLE_API_KEY, 
                cx: GOOGLE_CSE_ID, 
                q: `${query} review experience feedback Android`,
                num: Math.min(maxResults, 10),
                dateRestrict: 'm6',
                lr: 'lang_en' 
            }
        });
        
        const items = response.data.items || [];
        console.log(`✅ Found ${items.length} general results`);
        
        return items.map(item => ({
            ...item,
            sourceSite: 'general'
        }));
        
    } catch (error) {
        console.warn('⚠️ General search failed:', error.message);
        return [];
    }
}

/**
 * חיפוש היברידי - מאוזן + כללי
 */
async function hybridSearch(query) {
    console.log(`🔄 Starting hybrid search strategy for: "${query}"`);
    
    // 1. חיפוש מאוזן באתרים ספציפיים
    const balancedResults = await searchAllSitesBalanced(query, 8);
    
    // 2. חיפוש כללי נוסף אם יש מעט תוצאות
    let generalResults = [];
    if (balancedResults.length < 30) {
        generalResults = await generalSearch(query, 15);
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
 * @returns {Promise<Array<object>>} A balanced list of search results from multiple sources.
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
