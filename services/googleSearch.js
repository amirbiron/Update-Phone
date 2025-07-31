const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

function extractModelFromQuery(query) {
    const lowerCaseQuery = query.toLowerCase();
    
    // מחפשים דפוסים ספציפיים של דגמים
    const patterns = [
        // Samsung patterns - מחפשים דגמים ספציפיים כולל Ultra/Plus/Pro
        /galaxy\s+(s\d+\s*ultra)/i,
        /galaxy\s+(s\d+\s*\+)/i,  // עבור S24+ למשל
        /galaxy\s+(s\d+\s*plus)/i,
        /galaxy\s+(s\d+\s*pro)/i,
        /(?:galaxy\s+)?(s\d+\s*ultra)/i,  // גם בלי "galaxy"
        /(?:galaxy\s+)?(s\d+\s*\+)/i,     // גם בלי "galaxy" עם +
        /(?:galaxy\s+)?(s\d+\s*plus)/i,   // גם בלי "galaxy"
        /(?:galaxy\s+)?(s\d+\s*pro)/i,    // גם בלי "galaxy"
        /galaxy\s+(s\d+)(?!\s*(?:ultra|plus|pro|\+))/i,  // S24 רגיל בלי Ultra/Plus/Pro
        /(?:galaxy\s+)?(s\d+)(?!\s*(?:ultra|plus|pro|\+))/i,  // גם בלי "galaxy"
        /galaxy\s+(a\d+)/i,
        /galaxy\s+(note\s*\d+)/i,
        /galaxy\s+(z\s*fold\s*\d+)/i,
        /galaxy\s+(z\s*flip\s*\d+)/i,
        
        // Google Pixel patterns
        /pixel\s+(\d+\s*pro)/i,
        /pixel\s+(\d+\s*xl)/i,
        /pixel\s+(\d+)/i,
        
        // iPhone patterns
        /iphone\s+(\d+\s*pro\s*max)/i,
        /iphone\s+(\d+\s*pro)/i,
        /iphone\s+(\d+\s*plus)/i,
        /iphone\s+(\d+)/i,
        
        // Xiaomi patterns
        /(mi\s*\d+)/i,
        /(redmi\s*\w+\s*\d*)/i,
        /(poco\s*\w+\s*\d*)/i,
        
        // OnePlus patterns
        /oneplus\s+(\d+\s*pro)/i,
        /oneplus\s+(\d+)/i,
        /(nord\s*\w*\s*\d*)/i,
        
        // Generic pattern for any word with letters and numbers
        /([a-z]+\d+[a-z]*)/i
    ];
    
    // מנסים למצוא התאמה עם הדפוסים הספציפיים
    for (const pattern of patterns) {
        const match = lowerCaseQuery.match(pattern);
        if (match) {
            // מנקים רווחים מיותרים ומחזירים את הדגם המלא
            return match[1] ? match[1].trim() : match[0].trim();
        }
    }
    
    // אם לא מצאנו דפוס ספציפי, נשתמש בלוגיקה הישנה כגיבוי
    const words = lowerCaseQuery.split(' ');
    const model = words.find(word => /[a-z]/.test(word) && /[0-9]/.test(word));
    return model || null;
}

/**
 * Fetches up to 100 results with enhanced search queries and performs intelligent filtering.
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

    console.log(`🚀 Initiating enhanced paginated search for up to 100 results with ${searchQueries.length} different search strategies...`);

    // יצירת חיפושים מקבילים - עד 100 תוצאות סה"כ
    const allSearchPromises = [];
    
    for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        // עבור כל שאילתה, נבצע 2 חיפושים של 10 תוצאות (20 לכל שאילתה)
        // סה"כ: 6 שאילתות * 20 תוצאות = 120, אבל נגביל ל-100
        for (let page = 0; page < 2; page++) {
            allSearchPromises.push(
                axios.get(googleApiUrl, {
                    params: { 
                        key: GOOGLE_API_KEY, 
                        cx: GOOGLE_CSE_ID, 
                        q: query, 
                        num: 10, 
                        start: (page * 10) + 1, 
                        dateRestrict: 'm6', // הרחבה ל-6 חודשים לכיסוי טוב יותר
                        lr: 'lang_en' 
                    }
                }).catch(error => {
                    console.warn(`Search failed for query: ${query}, page: ${page + 1}`, error.message);
                    return { data: { items: [] } };
                })
            );
        }
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
                .slice(0, 100) // הגבלה ל-100 תוצאות
                .map(item => ({ 
                    title: item.title, 
                    link: item.link, 
                    snippet: item.snippet,
                    queryType: searchQueries[item.queryIndex] || 'unknown'
                }));
        }

        // סינון מתקדם - חיפוש המודל בכותרת, בקטע או בקישור
        const filteredResults = allResults.filter(item => {
            const title = item.title ? item.title.toLowerCase() : '';
            const snippet = item.snippet ? item.snippet.toLowerCase() : '';
            const link = item.link ? item.link.toLowerCase() : '';
            const fullText = `${title} ${snippet} ${link}`;
            
            // אם המודל כולל מילים כמו "ultra", "plus", "pro" - נחפש התאמה מדויקת יותר
            if (model.includes('ultra') || model.includes('plus') || model.includes('pro')) {
                // עבור דגמים מיוחדים, נחפש את המודל המלא
                const modelWords = model.split(/\s+/);
                return modelWords.every(word => fullText.includes(word));
            } else {
                // עבור דגמים רגילים, נוודא שהמודל מופיע אבל לא עם Ultra/Plus/Pro
                const hasModel = fullText.includes(model);
                if (!hasModel) return false;
                
                // אם זה Samsung S24 למשל, נוודא שזה לא S24 Ultra/Plus/Pro
                if (model.match(/s\d+$/i)) {
                    // בדיקה מקיפה יותר לווריאציות של Ultra/Plus/Pro
                    const modelPattern = model.replace(/\s+/g, '\\s*'); // מאפשר רווחים משתנים
                    const ultraRegex = new RegExp(`${modelPattern}\\s*(ultra|\\+|plus|pro)`, 'i');
                    const hasVariant = ultraRegex.test(fullText);
                    return !hasVariant;
                }
                
                return hasModel;
            }
        });

        console.log(`🔍 Filtered down to ${filteredResults.length} results specifically mentioning "${model}" in title, snippet, or URL.`);

        // מיון התוצאות לפי רלוונטיות (תוצאות עם המודל בכותרת מקבלות עדיפות)
        const sortedResults = filteredResults.sort((a, b) => {
            const aInTitle = a.title && a.title.toLowerCase().includes(model) ? 1 : 0;
            const bInTitle = b.title && b.title.toLowerCase().includes(model) ? 1 : 0;
            return bInTitle - aInTitle;
        });

        return sortedResults
            .slice(0, 100) // הגבלה ל-100 תוצאות הטובות ביותר
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
