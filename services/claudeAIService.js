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

  // Enhanced Prompt for authentic analysis based only on real data
  const prompt = `You are an expert technology analyst specializing in Android device updates. Your task is to analyze search results for the query: "${query}" and provide a comprehensive Hebrew report.

**CRITICAL REQUIREMENTS FOR AUTHENTICITY:**
1. **TARGET 20 REAL QUOTES:** Try to find up to 20 actual user quotes from the search results (aim for 10 positive + 10 negative if possible).
2. **ONLY REAL QUOTES:** Extract ONLY actual user quotes that appear in the search results. DO NOT invent or fabricate any quotes.
3. **SOURCE ATTRIBUTION WITH LINKS:** Every quote must include both the source name AND the direct link to where it was found. Use the exact URL from the search results.
4. **MANDATORY QUOTE FORMAT:** EVERY quote must use this exact format: **משתמש מ-[Website Name]:** "*translated quote*" - [direct URL link]
   - NO quote should appear without its corresponding link
   - The link must be the exact URL from the search results provided
5. **BE HONEST ABOUT ACTUAL NUMBERS:** If you find only 7 positive quotes and 5 negative quotes, report exactly that. State clearly how many you actually found.
6. **TRANSPARENT REPORTING:** At the end of each section, mention how many quotes were actually found vs. the target of 10 per category.
7. **REAL DATA ONLY:** Base ALL analysis sections (battery, performance, UI, issues) only on information actually found in the search results.
8. **LINK VERIFICATION:** Make sure every quote has its corresponding source link from the search results provided.

**SEARCH RESULTS TO ANALYZE:**
${contentForAnalysis}

Provide your analysis in Hebrew using this EXACT format:

---

# 📱 ניתוח מקיף: עדכון Android עבור ${query}

## 🎯 **תקציר מנהלים**
*כתוב פסקה מפורטת של 3-4 משפטים המסכמת את הממצאים העיקריים. התמקד בנתונים קונקרטיים ובמגמות שזוהו מהחיפוש המקיף.*

---

## 💬 **דיווחי משתמשים אמיתיים**

**הערה חשובה:** הדיווחים הבאים מבוססים אך ורק על עדויות אמיתיות שנמצאו בתוצאות החיפוש. אם לא נמצאו מספיק דיווחים, יוצגו רק אלה שנמצאו בפועל.

### ✅ **חוויות חיוביות**
*חפש עד 10 ציטוטים חיוביים אמיתיים מתוצאות החיפוש. אם מצאת פחות - כתוב בסוף הסעיף כמה בפועל נמצאו.*

פורמט חובה לכל ציטוט (כולל קישור!):
**משתמש מ-[שם האתר]:** "*הציטוט המתורגם*" - [קישור למקור]

דוגמה:
**משתמש מ-Reddit:** "*העדכון שיפר לי את הביצועים משמעותיות*" - https://reddit.com/example

⚠️ **חשוב:** כל ציטוט חייב לכלול קישור למקור המקורי!

*📊 סיכום: נמצאו [מספר אמיתי] דיווחים חיוביים מתוך יעד של 10*

### ❌ **חוויות שליליות**
*חפש עד 10 ציטוטים שליליים אמיתיים מתוצאות החיפוש. אם מצאת פחות - כתוב בסוף הסעיף כמה בפועל נמצאו.*

פורמט חובה לכל ציטוט (כולל קישור!):
**משתמש מ-[שם האתר]:** "*הציטוט המתורגם*" - [קישור למקור]

דוגמה:
**משתמש מ-XDA Forum:** "*יש לי בעיות סוללה אחרי העדכון*" - https://xda-developers.com/example

⚠️ **חשוב:** כל ציטוט חייב לכלול קישור למקור המקורי!

*📊 סיכום: נמצאו [מספר אמיתי] דיווחים שליליים מתוך יעד של 10*

---

## 📊 **ניתוח מגמות מעמיק**

### 🔋 **ביצועי סוללה**
*ניתוח ממצאים לגבי השפעת העדכון על הסוללה - רק על בסיס מידע שנמצא בתוצאות החיפוש*

### ⚡ **ביצועי מערכת**
*ניתוח ממצאים לגבי מהירות ויציבות המערכת - רק על בסיס מידע שנמצא בתוצאות החיפוש*

### 🎨 **ממשק משתמש וחוויית שימוש**
*ניתוח שינויים בממשק ובחוויית המשתמש - רק על בסיס מידע שנמצא בתוצאות החיפוש*

### 🔧 **בעיות טכניות ותקלות**
*סיכום הבעיות הטכניות העיקריות שדווחו - רק על בסיס מידע שנמצא בתוצאות החיפוש*

---

## 🎯 **המלצה מפורטת**

### 🚦 **החלטה: [מומלץ בחום לעדכן / מומלץ לעדכן / מומלץ להמתין / לא מומלץ לעדכן / אין מספיק מידע להמלצה]**

**נימוקים:**
• *נימוק ראשון מבוסס על הנתונים שנמצאו בפועל*
• *נימוק שני מבוסס על הדיווחים שנמצאו בפועל*
• *נימוק שלישי מבוסס על המגמות שזוהו בפועל*

**המלצות נוספות:**
• *המלצה מעשית ראשונה*
• *המלצה מעשית שנייה*
• *המלצה מעשית שלישית*

---

## 📈 **סיכום נתונים**
- **סה"כ מקורות נותחו:** ${searchResults.length}
- **דיווחים חיוביים שנמצאו:** [מספר אמיתי] מתוך יעד של 10
- **דיווחים שליליים שנמצאו:** [מספר אמיתי] מתוך יעד של 10
- **סה"כ ציטוטים אמיתיים:** [סכום] מתוך יעד של 20
- **אמינות הניתוח:** גבוהה/בינונית/נמוכה (בהתאם לכמות ואיכות הנתונים)

---

*הניתוח מבוסס על חיפוש מקיף ברשת ואינו מהווה תחליף לייעוץ טכני מקצועי. כל הציטוטים והדיווחים מבוססים על מקורות אמיתיים שנמצאו בחיפוש. 

💡 **המלצה:** לחצו על הקישורים כדי לקרוא את ההקשר המלא של כל ציטוט ולוודא שהוא רלוונטי למכשיר שלכם.*`;

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
