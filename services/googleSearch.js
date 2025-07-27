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
 * Fetches up to 60 results with enhanced search queries and performs intelligent filtering.
 * @param {string} userQuery - The user's query.
 * @returns {Promise<Array<object>>} A comprehensive, well-filtered list of relevant search results.
 */
async function searchGoogle(userQuery) {
    const englishQuery = userQuery.replace(/אנדרואיד/g, 'Android').replace(/\?/g, '');
    
    // שליחת מספר חיפושים מקבילים עם מילות מפתח שונות לכיסוי מקיף יותר
    const searchQueries = [
        `${englishQuery} review feedback experience user reports`,
        `${englishQuery} update problems issues bugs battery performance`,
        `${englishQuery} after update thoughts opinions reddit forum`,
        `${englishQuery} "updated to" "upgraded to" user experience review`,
        `${englishQuery} performance battery life speed issues complaints`,
        `${englishQuery} "worth updating" "should I update" recommendations`
    ];
    
    const model = extractModelFromQuery(englishQuery);
    if (!model) {
        console.warn("Could not extract a specific model from the query for filtering. Results may be less focused.");
    }

    console.log(`🚀 Initiating enhanced paginated search for up to 60 results with ${searchQueries.length} different search strategies...`);

    // יצירת חיפושים מקבילים - 10 תוצאות לכל חיפוש, 6 דפים לכל חיפוש
    const allSearchPromises = [];
    
    for (const query of searchQueries) {
        // עבור כל שאילתה, נבצע חיפוש של 10 תוצאות
        allSearchPromises.push(
            axios.get(googleApiUrl, {
                params: { 
                    key: GOOGLE_API_KEY, 
                    cx: GOOGLE_CSE_ID, 
                    q: query, 
                    num: 10, 
                    start: 1, 
                    dateRestrict: 'm6', // הרחבה ל-6 חודשים לכיסוי טוב יותר
                    lr: 'lang_en' 
                }
            }).catch(error => {
                console.warn(`Search failed for query: ${query}`, error.message);
                return { data: { items: [] } };
            })
        );
    }

    try {
        const responses = await Promise.all(allSearchPromises);
        let allResults = [];
        let uniqueLinks = new Set(); // למניעת כפילויות
        
        responses.forEach((response, index) => {
            if (response.data.items) {
                response.data.items.forEach(item => {
                    // הוספת תוצאה רק אם הקישור לא קיים כבר
                    if (!uniqueLinks.has(item.link)) {
                        uniqueLinks.add(item.link);
                        allResults.push({
                            ...item,
                            queryIndex: index // לזיהוי מאיזה חיפוש הגיעה התוצאה
                        });
                    }
                });
            }
        });

        console.log(`✅ Collected ${allResults.length} unique results from Google across ${searchQueries.length} search strategies.`);

        if (!model) {
            return allResults
                .slice(0, 60) // הגבלה ל-60 תוצאות
                .map(item => ({ 
                    title: item.title, 
                    link: item.link, 
                    snippet: item.snippet,
                    queryType: searchQueries[item.queryIndex] || 'unknown'
                }));
        }

        // סינון מתקדם - חיפוש המודל בכותרת, בקטע או בקישור
        const filteredResults = allResults.filter(item => {
            const titleMatch = item.title && item.title.toLowerCase().includes(model);
            const snippetMatch = item.snippet && item.snippet.toLowerCase().includes(model);
            const linkMatch = item.link && item.link.toLowerCase().includes(model);
            
            return titleMatch || snippetMatch || linkMatch;
        });

        console.log(`🔍 Filtered down to ${filteredResults.length} results specifically mentioning "${model}" in title, snippet, or URL.`);

        // מיון התוצאות לפי רלוונטיות (תוצאות עם המודל בכותרת מקבלות עדיפות)
        const sortedResults = filteredResults.sort((a, b) => {
            const aInTitle = a.title && a.title.toLowerCase().includes(model) ? 1 : 0;
            const bInTitle = b.title && b.title.toLowerCase().includes(model) ? 1 : 0;
            return bInTitle - aInTitle;
        });

        return sortedResults
            .slice(0, 60) // הגבלה ל-60 תוצאות הטובות ביותר
            .map(item => ({ 
                title: item.title, 
                link: item.link, 
                snippet: item.snippet,
                queryType: searchQueries[item.queryIndex] || 'unknown'
            }));

    } catch (error) {
        const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error('❌ Error during enhanced paginated Google Search:', errorDetails);
        return [];
    }
}

module.exports = { searchGoogle };
