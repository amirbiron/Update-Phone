// בדיקת הפונקציה המשופרת לחילוץ דגמים עם קיצורים חכמים
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
            
            // בדיקה אם יש מילים נוספות אחרי המספר (כמו Ultra, Pro, Plus)
            const additionalWords = [];
            for (let j = i + 2; j < words.length; j++) {
                const word = words[j];
                if (['ultra', 'pro', 'plus', 'max', 'mini', 'lite', 'edge', 'note'].includes(word)) {
                    additionalWords.push(word);
                } else {
                    break;
                }
            }
            
            const hasAdditionalWords = additionalWords.length > 0;
            const additionalPart = hasAdditionalWords ? ' ' + additionalWords.join(' ') : '';
            
            const variations = [
                compactModel + additionalPart.replace(/\s/g, ''),
                fullModel + additionalPart,
                `${shortBrand}${nextWord}${additionalPart.replace(/\s/g, '')}`,
                `${shortBrand} ${nextWord}${additionalPart}`
            ];
            
            // רק אם יש מילים נוספות, נוסיף את הגרסה הקצרה
            if (hasAdditionalWords) {
                variations.push(`${shortBrand}${nextWord}${additionalPart}`);
                variations.push(`s${nextWord}${additionalPart}`); // עבור Samsung
            }
            
            return {
                compact: compactModel + additionalPart.replace(/\s/g, ''),
                spaced: fullModel + additionalPart,
                shortened: hasAdditionalWords ? `${shortBrand}${nextWord}${additionalPart}` : fullModel,
                original: fullModel + additionalPart,
                variations: [...new Set(variations)] // הסרת כפילויות
            };
        }
    }
    
    // חיפוש מקרים מיוחדים כמו "Samsung Galaxy S24 Ultra" 
    const galaxyMatch = lowerCaseQuery.match(/samsung\s+galaxy\s+([a-z])(\d+)(\s+(ultra|pro|plus|max|mini|lite|edge|note))?/);
    if (galaxyMatch) {
        const [fullMatch, series, model, , extra] = galaxyMatch;
        const extraPart = extra || '';
        const hasExtra = !!extra;
        
        const variations = [
            `samsung galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
            `samsung ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
            `galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
            `${series}${model}${extraPart ? ' ' + extraPart : ''}`
        ];
        
        // רק אם יש מילה נוספת כמו Ultra, נוסיף קיצורים
        if (hasExtra) {
            variations.push(`s${model} ${extraPart}`);
            variations.push(`s${model}${extraPart}`);
        }
        
        return {
            compact: `samsung${series}${model}${extraPart.replace(/\s/g, '')}`,
            spaced: `samsung galaxy ${series}${model}${extraPart ? ' ' + extraPart : ''}`,
            shortened: hasExtra ? `s${model} ${extraPart}` : `samsung galaxy ${series}${model}`,
            original: fullMatch,
            variations: [...new Set(variations)]
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

// בדיקות
const testQueries = [
    "כדאי לעדכן Samsung Galaxy S24 Ultra לאנדרואיד 15?",
    "Samsung Galaxy S24 Pro אנדרואיד 15",
    "Samsung Galaxy S24 לאנדרואיד 15", // בלי Ultra - לא צריך קיצור
    "OnePlus13 Pro עדכון",
    "iPhone15 Pro Max iOS 17",
    "Samsung S24 Ultra עדכון", // כבר עם רווח
    "Pixel 8 Pro עדכון"
];

console.log("🧪 בדיקת חילוץ דגמים עם קיצורים חכמים:");
console.log("==============================================");

testQueries.forEach(query => {
    const result = extractModelFromQuery(query);
    console.log(`\nשאילתה: "${query}"`);
    if (result) {
        console.log(`✅ דגם נמצא:`);
        console.log(`   קומפקטי: "${result.compact}"`);
        console.log(`   עם רווח: "${result.spaced}"`);
        console.log(`   מקוצר: "${result.shortened}"`);
        console.log(`   מקורי: "${result.original}"`);
        console.log(`   ווריאציות: [${result.variations.map(v => `"${v}"`).join(', ')}]`);
    } else {
        console.log(`❌ לא נמצא דגם`);
    }
});