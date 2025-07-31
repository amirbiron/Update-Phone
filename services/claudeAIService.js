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

**המלצה:** נסו לחפש בפלטפורמות מקומיות או להמתין מספר שבועות נוספים לקבלת מידע נוסף.

📞 **לכל תקלה או ביקורת ניתן לפנות ל-@moominAmir בטלגרם**`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Source #${index + 1}\nTitle: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\nQuery Type: ${item.queryType || 'general'}`)
    .join('\n\n---\n\n');

  // Enhanced Prompt for authentic analysis based only on real data
  const prompt = `You are an expert technology analyst specializing in Android device updates. Your task is to analyze search results for the query: "${query}" and provide a comprehensive Hebrew report.

**CRITICAL REQUIREMENTS FOR AUTHENTICITY:**
1. **EXTRACT ALL POSSIBLE QUOTES:** Search THOROUGHLY through ALL search results and extract EVERY user quote, opinion, experience, or report that mentions the specific device model, even if it's brief or indirect.
2. **NO DUPLICATES:** Ensure each quote is unique - do not repeat the same information from different sources or rephrase the same quote multiple times.
3. **AVOID REPETITIVE TEXT:** Don't repeat the same instructions, phrases, or formatting explanations within your response. Keep the analysis concise and avoid redundant language.
4. **EXTRACT ALL QUOTES:** Search thoroughly through all search results for user quotes, opinions, and experiences.
5. **MANDATORY FORMAT:** Every quote must use: **משתמש מ-[Website Name]:** "*translated quote*" - [direct URL link]
6. **QUALITY FOCUS:** Prefer diverse, unique experiences over repetitive similar quotes.

**SEARCH RESULTS TO ANALYZE:**
${contentForAnalysis}

Provide your analysis in Hebrew using this EXACT format:

---

# 📱 ניתוח מקיף: עדכון Android עבור ${query}

## 🎯 **תקציר מנהלים**
*כתוב פסקה מפורטת של 3-4 משפטים המסכמת את הממצאים העיקריים. התמקד בנתונים קונקרטיים ובמגמות שזוהו מהחיפוש המקיף.*

---

## 💬 **דיווחי משתמשים אמיתיים**

**💎 הערה חשובה:** כל הדיווחים מבוססים על עדויות אמיתיות מהחיפוש. מוצגים עד 20 ציטוטים ייחודיים לדגם הספציפי.

**🎯 עקרונות החיפוש:** חפש ביסודיות, הימנע מכפילויות, העדף מגוון נקודות מבט

### ✅ **חוויות חיוביות**

### ❌ **חוויות שליליות**

---

## 📊 **ניתוח מגמות מעמיק**

### 🔋 **ביצועי סוללה**

### ⚡ **ביצועי מערכת**

### 🎨 **ממשק משתמש וחוויית שימוש**

### 🔧 **בעיות טכניות ותקלות**

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
- **דיווחים חיוביים שנמצאו:** [מספר אמיתי]
- **דיווחים שליליים שנמצאו:** [מספר אמיתי]
- **סה"כ ציטוטים אמיתיים:** [סכום] מתוך מקסימום 20
- **אמינות הניתוח:** גבוהה/בינונית/נמוכה (בהתאם לכמות ואיכות הנתונים)
- **כיסוי:** כל הדיווחים הרלוונטיים שנמצאו לדגם הספציפי

---

*הניתוח מבוסס על חיפוש מקיף ברשת ואינו מהווה תחליף לייעוץ טכני מקצועי. כל הציטוטים והדיווחים מבוססים על מקורות אמיתיים שנמצאו בחיפוש. 

💡 **המלצה:** לחצו על הקישורים כדי לקרוא את ההקשר המלא של כל ציטוט ולוודא שהוא רלוונטי למכשיר שלכם.

📞 **לכל תקלה או ביקורת ניתן לפנות ל-@moominAmir בטלגרם***`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with enhanced user quotes extraction.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 6000, // הגדלה נוספת למקס טוקנים לתמיכה ביותר ציטוטים
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

*אנו מתנצלים על האי נוחות ופועלים לפתרון המהיר של הבעיה.*

📞 **לכל תקלה או ביקורת ניתן לפנות ל-@moominAmir בטלגרם**`;
}

module.exports = { analyzeTextWithClaude };
