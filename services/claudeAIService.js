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
 * Analyzes search results with the new "Pragmatic Analyst" persona.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of search results.
 * @returns {Promise<string>} The pragmatic and realistic analysis.
 */
async function analyzeTextWithClaude(query, searchResults) {
  if (searchResults.length === 0) {
      return `לאחר חיפוש מעמיק, לא נמצאו כלל דיווחים ספציפיים על הדגם **${query}**. ייתכן שהעדכון חדש מדי או שהדיונים עליו מתקיימים בפלטפורמות אחרות.`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Source #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}`)
    .join('\n\n---\n\n');

  // V8 - The "Pragmatic Analyst" Prompt
  const prompt = `You are a "Pragmatic Analyst" bot. Your goal is to find signals in the noise of real-world user search results for the query: "${query}".
Your main job is to extract any and all CLAIMS related to the device's functional performance (battery, speed, bugs, features, stability).

**YOUR GUIDING PRINCIPLES:**
1.  **EXTRACT, DON'T DISCARD:** It is better to report a slightly vague claim (e.g., "battery seems worse") than to report nothing. Your goal is to find as many claims as you can.
2.  **FOCUS ON FUNCTION:** Your analysis must revolve around how the device WORKS. Ignore meta-commentary about hype, user interest, or brand loyalty.
3.  **INFER AND SUMMARIZE:** You don't have to quote directly. You can summarize the user's point concisely.

Provide a detailed analysis in Hebrew, using the following visually appealing Markdown format EXACTLY. The entire response must be in Hebrew.

---

### 📊 ניתוח עדכון Android 15 עבור ${query}

**תקציר מנהלים:**
*A one-paragraph summary of the key functional findings. What are the most common claims, positive and negative?*

---

### 📝 **ריכוז טענות משתמשים**

#### 👍 **טענות חיוביות**
*   *List bullet points of positive claims here. Summarize the user's point clearly. e.g., "משתמשים מדווחים על שיפור כללי במהירות המערכת ובתגובתיות שלה."*
*   *If no positive claims are found, write: "לא אותרו טענות חיוביות ספציפיות."*

#### 👎 **טענות שליליות**
*   *List bullet points of negative claims here. Summarize the user's point clearly. e.g., "מספר משתמשים מציינים בעיות של התחממות המכשיר בשימוש רגיל."*
*   *If no negative claims are found, write: "לא אותרו טענות שליליות ספציפיות."*

---

### 📈 **מגמות עיקריות**
*   **מגמה חיובית מרכזית:** *Summarize the main positive trend. e.g., "שיפור ניכר במהירות הממשק."*
*   **מגמה שלילית מרכזית:** *Summarize the main negative trend. e.g., "דיווחים חוזרים על צריכת סוללה מוגברת."*

---

### 🚦 **המלצה סופית**
**[מומלץ לעדכן / מומלץ להמתין / לא מומלץ לעדכן]**
*Provide a short justification based on the balance of claims you found.*

---
`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with the new Pragmatic Analyst Prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      });

      if (response && response.content && response.content.length > 0) {
        console.log("✅ Claude API Pragmatic Analyst analysis successful.");
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
  return "הייתה בעיה בניתוח המידע מול שירות הבינה המלאכותית. נסו שוב בעוד מספר דקות.";
}

module.exports = { analyzeTextWithClaude };
