const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    throw new Error('Google API Key (GOOGLE_SEARCH_API_KEY) or CSE ID (GOOGLE_SEARCH_ENGINE_ID) is not defined in environment variables.');
}

const googleApiUrl = 'https://www.googleapis.com/customsearch/v1';

function extractModelFromQuery(query) {
    const lowerCaseQuery = query.toLowerCase();
    
    // מיפוי קיצורים נפוצים של מותגים
    const brandShortcuts = {
        'samsung galaxy': 's',
        'samsung': 's',
        'oneplus': 'op',
        'google pixel': 'pixel',
        'iphone': 'iphone',
        'xiaomi': 'mi',
        'huawei': 'p'
    };
    
    // חיפוש דגמים שכתובים בלי רווח (כמו oneplus13, samsungs24, iphone15)
    const compactModelMatch = lowerCaseQuery.match(/([a-z]+)(\d+)/);
    if (compactModelMatch) {
        const [, brand, model] = compactModelMatch;
        const shortBrand = brandShortcuts[brand] || brand;
        
        return {
            compact: compactModelMatch[0], // oneplus13
            spaced: `${brand} ${model}`, // oneplus 13
            shortened: `${shortBrand}${model}`, // op13 או s24
            original: compactModelMatch[0],
            variations: [
                compactModelMatch[0],
                `${brand} ${model}`,
                `${shortBrand}${model}`,
                `${shortBrand} ${model}`
            ]
        };
    }
    
    // חיפוש דגמים רגילים (עם רווח) - מחפש מילה אחרי מותג שמכילה מספרים
    const words = lowerCaseQuery.split(' ');
    
    // חיפוש מותגים ידועים ואחריהם מספר דגם
    const knownBrands = ['oneplus', 'samsung', 'iphone', 'galaxy', 'pixel', 'xiaomi', 'huawei', 'lg', 'htc', 'sony'];
    
    for (let i = 0; i < words.length - 1; i++) {
        const currentWord = words[i];
        const nextWord = words[i + 1];
        
        // בדיקה אם המילה הנוכחית היא מותג ידוע והמילה הבאה מכילה מספרים
        if (knownBrands.some(brand => currentWord.includes(brand)) && /\d/.test(nextWord)) {
            const fullModel = `${currentWord} ${nextWord}`;
            const compactModel = `${currentWord}${nextWord}`;
            
            // חיפוש קיצור למותג
            let shortBrand = currentWord;
            for (const [fullBrand, shortForm] of Object.entries(brandShortcuts)) {
                if (currentWord.includes(fullBrand)) {
                    shortBrand = shortForm;
                    break;
                }
            }
            
            return {
                compact: compactModel,
                spaced: fullModel,
                shortened: `${shortBrand}${nextWord}`,
                original: fullModel,
                variations: [
                    compactModel,
                    fullModel,
                    `${shortBrand}${nextWord}`,
                    `${shortBrand} ${nextWord}`,
                    nextWord // רק המספר (כמו "24" עבור S24)
                ]
            };
        }
    }
    
    // חיפוש מקרים מיוחדים כמו "Samsung Galaxy S24 Ultra" 
    const galaxyMatch = lowerCaseQuery.match(/samsung\s+galaxy\s+([a-z]+)(\d+)(\s+\w+)?/);
    if (galaxyMatch) {
        const [, series, model, extra] = galaxyMatch;
        const extraPart = extra ? extra.trim() : '';
        
        return {
            compact: `samsung${series}${model}${extraPart}`,
            spaced: `samsung galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
            shortened: `s${model}${extraPart ? ' ' + extraPart : ''}`,
            original: galaxyMatch[0],
            variations: [
                `samsung galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
                `samsung ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
                `galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
                `s${model}${extraPart ? ' ' + extraPart : ''}`,
                `${series}${model}${extraPart ? ' ' + extraPart : ''}`,
                `${model}${extraPart ? ' ' + extraPart : ''}`
            ]
        };
    }
    
    // חיפוש דגמים רגילים (מילה אחת עם אותיות ומספרים)
    const model = words.find(word => /[a-z]/.test(word) && /[0-9]/.test(word));
    
    if (model) {
        return {
            compact: model,
            spaced: model,
            shortened: model,
            original: model,
            variations: [model]
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
        // מחפש גם את הגרסה הקומפקטית וגם את הגרסה עם רווח
        const filteredResults = allResults.filter(item => {
            const checkMatch = (text, modelInfo) => {
                if (!text) return false;
                const lowerText = text.toLowerCase();
                return lowerText.includes(modelInfo.compact) || 
                       lowerText.includes(modelInfo.spaced) ||
                       lowerText.includes(modelInfo.original);
            };
            
            const titleMatch = checkMatch(item.title, modelInfo);
            const snippetMatch = checkMatch(item.snippet, modelInfo);
            const linkMatch = checkMatch(item.link, modelInfo);
            
            return titleMatch || snippetMatch || linkMatch;
        });

        console.log(`🔍 Filtered down to ${filteredResults.length} results specifically mentioning "${modelInfo.spaced}" or "${modelInfo.compact}" in title, snippet, or URL.`);

        // מיון התוצאות לפי רלוונטיות (תוצאות עם המודל בכותרת מקבלות עדיפות)
        const sortedResults = filteredResults.sort((a, b) => {
            const checkTitleMatch = (title, modelInfo) => {
                if (!title) return false;
                const lowerTitle = title.toLowerCase();
                return lowerTitle.includes(modelInfo.compact) || 
                       lowerTitle.includes(modelInfo.spaced) ||
                       lowerTitle.includes(modelInfo.original);
            };
            
            const aInTitle = checkTitleMatch(a.title, modelInfo) ? 1 : 0;
            const bInTitle = checkTitleMatch(b.title, modelInfo) ? 1 : 0;
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
