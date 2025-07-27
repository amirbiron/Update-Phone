const Anthropic = require('@anthropic-ai/sdk');

const claudeApiKey = process.env.CLAUDE_API_KEY;
if (!claudeApiKey) {
    throw new Error('CLAUDE_API_KEY is not defined in environment variables.');
}

const anthropic = new Anthropic({
  apiKey: claudeApiKey,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes search results with enhanced user quotes extraction and improved design.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of search results.
 * @returns {Promise<string>} The comprehensive analysis with user quotes.
 */
async function analyzeTextWithClaude(query, searchResults) {
  if (searchResults.length === 0) {
      return `## 🔍 לא נמצאו תוצאות

לאחר חיפוש מעמיק עם מספר אסטרטגיות חיפוש, לא נמצאו כלל דיווחים ספציפיים על הדגם **${query}**. 

**סיבות אפשריות:**
• העדכון חדש מדי ועדיין אין דיווחים מספקים
• הדיונים מתקיימים בפלטפורמות אחרות (קבוצות פייסבוק, פורומים מקומיים)
• המכשיר פחות פופולרי בקהילות דוברות אנגלית

**המלצה:** נסו לחפש בפלטפורמות מקומיות או להמתין מספר שבועות נוספים לקבלת מידע נוסף.`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Source #${index + 1}\nTitle: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\nQuery Type: ${item.queryType || 'general'}`)
    .join('\n\n---\n\n');

  // Enhanced Prompt for better user quotes extraction and design
  const prompt = `You are an expert technology analyst specializing in Android device updates. Your task is to analyze search results for the query: "${query}" and provide a comprehensive Hebrew report.

**CRITICAL REQUIREMENTS:**
1. **EXTRACT 20 USER REPORTS TOTAL:** Find exactly 20 specific user experiences - 10 positive and 10 negative. These should be ACTUAL user quotes translated to Hebrew, not generic summaries.
2. **QUOTE REAL USERS:** Look for phrases like "I updated", "after the update", "my experience", "I noticed", etc. Translate these to Hebrew while maintaining the personal tone.
3. **BE SPECIFIC:** Include specific details like battery percentages, performance metrics, specific features mentioned.
4. **COMPREHENSIVE ANALYSIS:** Use ALL search results to build a complete picture.

**SEARCH RESULTS TO ANALYZE:**
${contentForAnalysis}

Provide your analysis in Hebrew using this EXACT format:

---

# 📱 ניתוח מקיף: עדכון Android עבור ${query}

## 🎯 **תקציר מנהלים**
*כתוב פסקה מפורטת של 3-4 משפטים המסכמת את הממצאים העיקריים. התמקד בנתונים קונקרטיים ובמגמות שזוהו מהחיפוש המקיף.*

---

## 💬 **דיווחי משתמשים אמיתיים**

### ✅ **חוויות חיוביות (10 דיווחים)**

1. **משתמש א':** "*תרגום מדויק של ציטוט משתמש חיובי מהתוצאות*"
2. **משתמש ב':** "*תרגום נוסף של חוויה חיובית ספציפית*"
3. **משתמש ג':** "*ציטוט חיובי נוסף עם פרטים ספציפיים*"
4. **משתמש ד':** "*חוויה חיובית מתורגמת*"
5. **משתמש ה':** "*דיווח חיובי נוסף*"
6. **משתמש ו':** "*ציטוט חיובי*"
7. **משתמש ז':** "*חוויה חיובית*"
8. **משתמש ח':** "*דיווח חיובי*"
9. **משתמש ט':** "*ציטוט חיובי*"
10. **משתמש י':** "*חוויה חיובית אחרונה*"

### ❌ **חוויות שליליות (10 דיווחים)**

1. **משתמש א':** "*תרגום מדויק של ציטוט משתמש שלילי מהתוצאות*"
2. **משתמש ב':** "*תרגום נוסף של חוויה שלילית ספציפית*"
3. **משתמש ג':** "*ציטוט שלילי נוסף עם פרטים ספציפיים*"
4. **משתמש ד':** "*חוויה שלילית מתורגמת*"
5. **משתמש ה':** "*דיווח שלילי נוסף*"
6. **משתמש ו':** "*ציטוט שלילי*"
7. **משתמש ז':** "*חוויה שלילית*"
8. **משתמש ח':** "*דיווח שלילי*"
9. **משתמש ט':** "*ציטוט שלילי*"
10. **משתמש י':** "*חוויה שלילית אחרונה*"

---

## 📊 **ניתוח מגמות מעמיק**

### 🔋 **ביצועי סוללה**
*ניתוח ממצאים לגבי השפעת העדכון על הסוללה*

### ⚡ **ביצועי מערכת**
*ניתוח ממצאים לגבי מהירות ויציבות המערכת*

### 🎨 **ממשק משתמש וחוויית שימוש**
*ניתוח שינויים בממשק ובחוויית המשתמש*

### 🔧 **בעיות טכניות ותקלות**
*סיכום הבעיות הטכניות העיקריות שדווחו*

---

## 🎯 **המלצה מפורטת**

### 🚦 **החלטה: [מומלץ בחום לעדכן / מומלץ לעדכן / מומלץ להמתין / לא מומלץ לעדכן]**

**נימוקים:**
• *נימוק ראשון מבוסס על הנתונים*
• *נימוק שני מבוסס על הדיווחים*
• *נימוק שלישי מבוסס על המגמות*

**המלצות נוספות:**
• *המלצה מעשית ראשונה*
• *המלצה מעשית שנייה*
• *המלצה מעשית שלישית*

---

## 📈 **סיכום נתונים**
- **סה"כ מקורות נותחו:** ${searchResults.length}
- **דיווחים חיוביים:** 10
- **דיווחים שליליים:** 10
- **אמינות הניתוח:** גבוהה/בינונית/נמוכה (בהתאם לכמות ואיכות הנתונים)

---

*הניתוח מבוסס על חיפוש מקיף ברשת ואינו מהווה תחליף לייעוץ טכני מקצועי*`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with enhanced user quotes extraction.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4000, // הגדלה למקס טוקנים לתמיכה בתוכן מורחב
        messages: [{ role: "user", content: prompt }],
      });

      if (response && response.content && response.content.length > 0) {
        console.log("✅ Claude API enhanced analysis successful.");
        return response.content[0].text;
      } else {
          throw new Error("Claude API returned an empty or invalid response.");
      }
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.APIError && error.status === 529 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Claude API is overloaded. Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  console.error("❌ Error calling Claude API after all retries:", lastError);
  return `## ⚠️ שגיאה בניתוח

הייתה בעיה בניתוח המידע מול שירות הבינה המלאכותית. 

**אפשרויות:**
• נסו שוב בעוד מספר דקות
• פנו לתמיכה טכנית
• בדקו את החיבור לאינטרנט

*אנו מתנצלים על האי נוחות ופועלים לפתרון המהיר של הבעיה.*`;
}

module.exports = { analyzeTextWithClaude };
