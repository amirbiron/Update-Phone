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
3. **EXPAND YOUR SEARCH SCOPE:** Look for user comments, forum posts, Reddit discussions, review comments, social media posts, and any user-generated content in the search results.
4. **INCLUDE PARTIAL MENTIONS:** Even if a quote doesn't give a full review, include it if it mentions the device and update experience (e.g., "battery is better after update", "no issues so far", "loving the new features").
5. **PARAPHRASE WHEN NECESSARY:** If you find relevant user opinions that aren't in direct quote format, you can paraphrase them as long as you maintain accuracy and provide the source link.
6. **LOOK IN SNIPPETS:** Pay special attention to the snippets provided - they often contain user quotes or opinions that might be missed.
7. **FORUM AND REDDIT FOCUS:** Give extra attention to forum discussions, Reddit posts, and community discussions where users share experiences.
8. **MANDATORY LINKS:** Every single quote MUST include the direct URL link. NO EXCEPTIONS.
9. **SOURCE ATTRIBUTION WITH LINKS:** Every quote must include both the source name AND the direct link to where it was found.
10. **MANDATORY QUOTE FORMAT:** EVERY quote must use this exact format: **משתמש מ-[Website Name]:** "*translated quote*" - [direct URL link]
11. **BE THOROUGH:** Go through each search result systematically and look for ANY mention of user experience with the specific device model.
12. **EXTRACT FROM TITLES TOO:** Sometimes the title itself contains user sentiment or experience - include these as well.
13. **LOOK FOR IMPLICIT FEEDBACK:** Include results that imply user experience even if not in direct quote format (e.g., "users report improved battery life").
14. **QUALITY OVER QUANTITY:** Prefer diverse, unique experiences over repetitive similar quotes.

**SEARCH RESULTS TO ANALYZE:**
${contentForAnalysis}

Provide your analysis in Hebrew using this EXACT format:

---

# 📱 ניתוח מקיף: עדכון Android עבור ${query}

## 🎯 **תקציר מנהלים**
*כתוב פסקה מפורטת של 3-4 משפטים המסכמת את הממצאים העיקריים. התמקד בנתונים קונקרטיים ובמגמות שזוהו מהחיפוש המקיף.*

---

## 💬 **דיווחי משתמשים אמיתיים**

**הערה חשובה:** הדיווחים הבאים מבוססים אך ורק על עדויות אמיתיות שנמצאו בתוצאות החיפוש. יוצגו כל הדיווחים הרלוונטיים שנמצאו לדגם הספציפי, עד מקסימום 20 ציטוטים סה"כ.

**🔍 הוראות חיפוש מפורטות:**
- עבור על כל תוצאת חיפוש בזהירות ובחפש בכותרת, בקטע (snippet), ובכל מידע זמין
- כלול כל אזכור של משתמש שמזכיר את המכשיר והעדכון, גם אם הוא קצר
- חפש ביטויים כמו "my experience", "after updating", "user reports", "feedback", "issues", "working well"
- שים לב לתגובות ודיונים בפורומים, Reddit, XDA, ואתרי ביקורות
- אל תתעלם מציטוטים קצרים או חלקיים - הם עדיין חשובים
- **חשוב:** הימנע מכפילויות - אל תכלול את אותו ציטוט פעמיים או ציטוטים דומים מאוד
- העדף ציטוטים מגוונים המספקים נקודות מבט שונות על החוויה

### ✅ **חוויות חיוביות**
*חלץ את כל הציטוטים החיוביים הרלוונטיים שנמצאו בתוצאות החיפוש לדגם הספציפי. כלול את כולם עד למגבלה הכוללת של 20 ציטוטים. חפש ביסודיות בכל snippet, title, ותוכן זמין. כלול גם חוויות חלקיות או קצרות שמזכירות את המכשיר. הימנע מכפילויות!*

פורמט חובה לכל ציטוט (כולל קישור!):
**משתמש מ-[שם האתר]:** "*הציטוט המתורגם*" - [קישור למקור]

דוגמאות:
**משתמש מ-רדיט:** "*העדכון שיפר לי את הביצועים משמעותיות*" - https://reddit.com/example
**משתמש מ-XDA Forum:** "*הסוללה מחזיקה יותר אחרי העדכון*" - https://xda-developers.com/example
**משתמש מ-Android Central:** "*בלי בעיות עד כה*" - https://androidcentral.com/example

⚠️ **חשוב:** כל ציטוט חייב לכלול קישור למקור המקורי! חפש גם בכותרות ובקטעים קצרים!

*📊 סיכום: נמצאו [מספר אמיתי] דיווחים חיוביים מתוך [סה"כ מקורות שנסקרו]*

### ❌ **חוויות שליליות**
*חלץ את כל הציטוטים השליליים הרלוונטיים שנמצאו בתוצאות החיפוש לדגם הספציפי. כלול את כולם עד למגבלה הכוללת של 20 ציטוטים. חפש ביסודיות בכל snippet, title, ותוכן זמין. כלול גם תלונות חלקיות או קצרות שמזכירות את המכשיר.*

פורמט חובה לכל ציטוט (כולל קישור!):
**משתמש מ-[שם האתר]:** "*הציטוט המתורגם*" - [קישור למקור]

דוגמאות:
**משתמש מ-XDA Forum:** "*יש לי בעיות סוללה אחרי העדכון*" - https://xda-developers.com/example
**משתמש מ-רדיט:** "*המכשיר נהיה איטי יותר*" - https://reddit.com/example
**משתמש מ-Android Police:** "*מתחרט על העדכון*" - https://androidpolice.com/example

⚠️ **חשוב:** כל ציטוט חייב לכלול קישור למקור המקורי! חפש גם בכותרות ובקטעים קצרים!

*📊 סיכום: נמצאו [מספר אמיתי] דיווחים שליליים מתוך [סה"כ מקורות שנסקרו]*

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
