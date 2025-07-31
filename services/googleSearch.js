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
        // הסדר חשוב! דגמים ספציפיים יותר קודם
        /galaxy\s+(s\d+\s*ultra)/i,
        /galaxy\s+(s\d+\s*\+)/i,  // מוסיף תמיכה ב-S24+ עם סימן +
        /galaxy\s+(s\d+\s*plus)/i,
        /galaxy\s+(s\d+\s*pro)/i,
        /\b(s\d+\s*\+)\b/i,       // תמיכה ב-S24+ ללא Galaxy
        /\b(s\d+\s*ultra)\b/i,    // תמיכה ב-S24 Ultra ללא Galaxy
        /\b(s\d+\s*plus)\b/i,     // תמיכה ב-S24 Plus ללא Galaxy
        /\b(s\d+\s*pro)\b/i,      // תמיכה ב-S24 Pro ללא Galaxy
        /\b(s\d+)\b/i,            // תמיכה ב-S24 ללא Galaxy (בסוף כי הוא כללי)
        /galaxy\s+(s\d+)/i,
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
        
        // Xiaomi patterns - מסודר לפי ספציפיות (ספציפי יותר קודם)
        /(xiaomi\s+\d+\s*ultra)/i,          // Xiaomi 14 Ultra
        /(xiaomi\s+\d+\s*pro)/i,            // Xiaomi 14 Pro
        /(mi\s*\d+\s*ultra)/i,              // Mi 13 Ultra
        /(mi\s*\d+\s*pro)/i,                // Mi 13 Pro
        /(mi\s*\d+\s*lite)/i,               // Mi 13 Lite
        /(redmi\s+note\s*\d+\s*pro\s*\+)/i, // Redmi Note 12 Pro+
        /(redmi\s+note\s*\d+\s*pro)/i,      // Redmi Note 12 Pro
        /(redmi\s+k\d+\s*pro)/i,            // Redmi K70 Pro
        /(redmi\s+\w+\s*\d*\s*pro)/i,       // Redmi [model] Pro כללי
        /(poco\s+\w+\s*\d*\s*pro)/i,        // Poco X6 Pro, Poco F5 Pro
        /(xiaomi\s+\d+)/i,                  // Xiaomi 14
        /(mi\s*\d+)/i,                      // Mi 13
        /(redmi\s+note\s*\d+)/i,            // Redmi Note 12
        /(redmi\s+k\d+)/i,                  // Redmi K70
        /(redmi\s*\w+\s*\d*)/i,             // Redmi כללי
        /(poco\s*\w+\s*\d*)/i,              // Poco כללי
        
        // OnePlus patterns - מסודר לפי ספציפיות
        /oneplus\s+(\d+\s*pro)/i,           // OnePlus 12 Pro
        /oneplus\s+(\d+\s*r)/i,             // OnePlus 12R
        /oneplus\s+(\d+\s*t)/i,             // OnePlus 12T
        /(nord\s+ce\s*\d+\s*lite)/i,        // Nord CE 3 Lite
        /(nord\s+ce\s*\d+)/i,               // Nord CE 3
        /(nord\s+n\d+\s*se)/i,              // Nord N20 SE
        /(nord\s+n\d+)/i,                   // Nord N30
        /(nord\s*\d+)/i,                    // Nord 3
        /oneplus\s+(open)/i,                // OnePlus Open
        /oneplus\s+(\d+)/i,                 // OnePlus 12
        /(nord)/i,                          // Nord כללי
        /(op\d+\s*pro)/i,                   // OP12 Pro (קיצור)
        /(op\d+)/i,                         // OP12 (קיצור)
        /(1\+\d+)/i,                        // 1+12 (סימון חלופי)
        
        // Generic pattern for any word with letters and numbers
        /([a-z]+\d+[a-z]*)/i
    ];
    
    // מנסים למצוא התאמה עם הדפוסים הספציפיים
    for (const pattern of patterns) {
        const match = lowerCaseQuery.match(pattern);
        if (match) {
            // מנקים רווחים מיותרים ומחזירים את הדגם המלא
            const modelName = match[1] ? match[1].trim() : match[0].trim();
            
            // יצירת אובייקט עם מידע על הדגם וווריאציות שלו
            return {
                original: modelName,
                variations: [modelName],
                isSpecific: modelName.includes('ultra') || modelName.includes('plus') || modelName.includes('pro') || modelName.includes('lite') || modelName.includes('+') || modelName.includes(' r') || modelName.includes(' t') || modelName.includes('ce') || modelName.includes(' se')
            };
        }
    }
    
    // אם לא מצאנו דפוס ספציפי, נשתמש בלוגיקה הישנה כגיבוי
    const words = lowerCaseQuery.split(' ');
    const model = words.find(word => /[a-z]/.test(word) && /[0-9]/.test(word));
    
    if (model) {
        return {
            original: model,
            variations: [model],
            isSpecific: false
        };
    }
    
    return null;
}

/**
 * Fetches up to 100 results with enhanced search queries and performs intelligent filtering.
 * @param {string} userQuery - The user's query.
 * @returns {Promise<Array<object>>} A comprehensive, well-filtered list of relevant search results.
 */
async function searchGoogle(userQuery) {
    const englishQuery = userQuery.replace(/אנדרואיד/g, 'Android').replace(/\?/g, '');
    
    const modelInfo = extractModelFromQuery(englishQuery);
    
    // יצירת שאילתות חיפוש מותאמות - אם יש דגם, נחפש גם עם רווח וגם בלי
    let baseQuery = englishQuery;
    if (modelInfo && modelInfo.compact !== modelInfo.spaced) {
        // אם המשתמש כתב oneplus13, נחפש גם oneplus 13
        baseQuery = englishQuery.replace(modelInfo.compact, modelInfo.spaced);
    }
    
    // שליחת מספר חיפושים מקבילים עם מילות מפתח שונות לכיסוי מקיף יותר
    const searchQueries = [
        `${baseQuery} review feedback experience user reports`,
        `${baseQuery} update problems issues bugs battery performance`,
        `${baseQuery} after update thoughts opinions reddit forum`,
        `${baseQuery} "updated to" "upgraded to" user experience review`,
        `${baseQuery} performance battery life speed issues complaints`,
        `${baseQuery} "worth updating" "should I update" recommendations`
    ];
    
    // אם יש דגם קומפקטי, נוסיף גם חיפושים עם הגרסה הקומפקטית
    if (modelInfo && modelInfo.compact !== modelInfo.spaced) {
        const compactQueries = [
            `${englishQuery} review feedback experience user reports`,
            `${englishQuery} update problems issues bugs battery performance`,
            `${englishQuery} after update thoughts opinions reddit forum`
        ];
        searchQueries.push(...compactQueries);
    }
    
    if (!modelInfo) {
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

        if (!modelInfo) {
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
            
            const model = modelInfo.original;
            
            // אם המודל כולל מילים כמו "ultra", "plus", "pro" - נחפש התאמה מדויקת יותר
            if (modelInfo.isSpecific) {
                // עבור דגמים מיוחדים, נחפש את המודל המלא
                const modelWords = model.split(/\s+/);
                return modelWords.every(word => fullText.includes(word));
            } else {
                // עבור דגמים רגילים, נוודא שהמודל מופיע אבל לא עם Ultra/Plus/Pro
                const hasModel = fullText.includes(model);
                if (!hasModel) return false;
                
                // שיפור: אם זה Samsung S24 למשל, נוודא שזה לא S24 Ultra/Plus/Pro באופן מדויק יותר
                if (model.match(/s\d+$/i)) {
                    // נבדוק שהמודל מופיע עם גבולות מילים ברורים ואחריו לא Ultra/Plus/Pro/+
                    // גם נוודא שלא מופיע s24+ או s24 plus וכו'
                    const modelRegex = new RegExp(`\\b${model}\\b(?!\\s*(ultra|plus|pro|\\+|fe))`, 'i');
                    const hasExactMatch = modelRegex.test(fullText);
                    
                    // בדיקה נוספת: אם מחפשים דגם בסיסי, לא נכלול וריאנטים
                    if (model.toLowerCase() === 's24') {
                        const excludeVariants = /s24\s*(ultra|plus|pro|\+|fe)/i;
                        if (excludeVariants.test(fullText)) {
                            return false;
                        }
                    }
                    
                    // בדיקה עבור שיאומי - Mi 13 לא יכלול Mi 13 Pro/Ultra/Lite
                    if (model.match(/^mi\s*\d+$/i)) {
                        const baseModel = model.replace(/\s+/g, '\\s*');
                        const excludeVariants = new RegExp(`${baseModel}\\s*(ultra|pro|lite)`, 'i');
                        if (excludeVariants.test(fullText)) {
                            return false;
                        }
                    }
                    
                    // בדיקה עבור Xiaomi - Xiaomi 14 לא יכלול Xiaomi 14 Pro/Ultra
                    if (model.match(/^xiaomi\s*\d+$/i)) {
                        const baseModel = model.replace(/\s+/g, '\\s*');
                        const excludeVariants = new RegExp(`${baseModel}\\s*(ultra|pro|lite)`, 'i');
                        if (excludeVariants.test(fullText)) {
                            return false;
                        }
                    }
                    
                    // בדיקה עבור OnePlus - OnePlus 12 לא יכלול OnePlus 12 Pro/R/T
                    if (model.match(/^oneplus\s*\d+$/i)) {
                        const baseModel = model.replace(/\s+/g, '\\s*');
                        const excludeVariants = new RegExp(`${baseModel}\\s*(pro|r|t)`, 'i');
                        if (excludeVariants.test(fullText)) {
                            return false;
                        }
                    }
                    
                    // בדיקה עבור OP (קיצור) - OP12 לא יכלול OP12 Pro
                    if (model.match(/^op\d+$/i)) {
                        const baseModel = model.replace(/\s+/g, '\\s*');
                        const excludeVariants = new RegExp(`${baseModel}\\s*pro`, 'i');
                        if (excludeVariants.test(fullText)) {
                            return false;
                        }
                    }
                    
                    return hasExactMatch;
                }
                
                // עבור דגמים אחרים, נבדוק שאין Ultra/Plus/Pro מיד אחרי המודל
                const modelRegex = new RegExp(`\\b${model}\\b(?!\\s*(ultra|plus|pro|\\+|fe))`, 'i');
                const hasExactMatch = modelRegex.test(fullText);
                
                // בדיקה כללית: אם מחפשים דגם בסיסי, לא נכלול וריאנטים
                if (model.match(/^[a-z]+\d+$/i)) {
                    const excludeVariants = new RegExp(`${model}\\s*(ultra|plus|pro|\\+|fe|lite|\\br\\b|\\bt\\b)`, 'i');
                    if (excludeVariants.test(fullText)) {
                        return false;
                    }
                }
                
                // בדיקה מיוחדת עבור Redmi Note - למנוע ערבוב בין Note 12 ל-Note 12 Pro
                if (model.match(/^redmi\s+note\s*\d+$/i)) {
                    const baseModel = model.replace(/\s+/g, '\\s*');
                    const excludeVariants = new RegExp(`${baseModel}\\s*(pro|\\+)`, 'i');
                    if (excludeVariants.test(fullText)) {
                        return false;
                    }
                }
                
                // בדיקה מיוחדת עבור Nord - למנוע ערבוב בין Nord 3 ל-Nord CE 3
                if (model.match(/^nord\s*\d+$/i)) {
                    const baseModel = model.replace(/\s+/g, '\\s*');
                    const excludeVariants = new RegExp(`${baseModel}\\s*(ce|lite)`, 'i');
                    if (excludeVariants.test(fullText)) {
                        return false;
                    }
                }
                
                // בדיקה עבור Nord CE - Nord CE 3 לא יכלול Nord CE 3 Lite
                if (model.match(/^nord\s+ce\s*\d+$/i)) {
                    const baseModel = model.replace(/\s+/g, '\\s*');
                    const excludeVariants = new RegExp(`${baseModel}\\s*lite`, 'i');
                    if (excludeVariants.test(fullText)) {
                        return false;
                    }
                }
                
                return hasExactMatch;
            }
        });

        console.log(`🔍 Filtered down to ${filteredResults.length} results specifically mentioning "${modelInfo.original}" in title, snippet, or URL.`);

        // מיון התוצאות לפי רלוונטיות (תוצאות עם המודל בכותרת מקבלות עדיפות)
        const sortedResults = filteredResults.sort((a, b) => {
            const aInTitle = a.title && a.title.toLowerCase().includes(modelInfo.original) ? 1 : 0;
            const bInTitle = b.title && b.title.toLowerCase().includes(modelInfo.original) ? 1 : 0;
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
