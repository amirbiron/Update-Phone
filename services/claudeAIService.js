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
 * Analyzes a large, pre-filtered dataset with the final "Bug Hunter" persona and prompt.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The large, filtered array of search results.
 * @returns {Promise<string>} The final, well-designed, and highly relevant analysis.
 */
async function analyzeTextWithClaude(query, searchResults) {
  if (searchResults.length < 3) {
      return `לאחר חיפוש מעמיק, לא נמצאו מספיק דיווחים טכניים ספציפיים על הדגם **${query}** כדי לגבש המלצה מהימנה. מומלץ לנסות שוב בעוד מספר ימים, לאחר שיצטברו יותר חוויות משתמשים.`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Source #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}`)
    .join('\n\n---\n\n');

  // V7 - The Final "Bug Hunter" Prompt
  const prompt = `You are a "Bug Hunter" bot. Your SOLE mission is to find and report concrete, functional user experiences (good or bad) with a specific software update on a specific device, based on the provided search results for the query: "${query}".

**YOUR UNBREAKABLE RULES:**
1.  **ACTION AND RESULT ONLY:** Only cite reports that describe a specific action and its result (e.g., "When I open the camera, the phone freezes").
2.  **NO META-COMMENTARY:** You MUST IGNORE any mentions of user interest, hype, waiting for the update, brand loyalty, or general discussions. Focus ONLY on functional reports.
3.  **NO VAGUE REPORTS:** IGNORE vague statements like "something is wrong" or "it's buggy". You must cite the specific bug.
4.  **NO QUESTIONS:** IGNORE any questions you find in the search results.

Your goal is to find at least 10 concrete reports if they exist in the provided data.

Provide a detailed analysis in Hebrew, using the following visually appealing Markdown format EXACTLY. The entire response must be in Hebrew.

---

### 📊 ניתוח עדכון Android 15 עבור ${query}

**תקציר מנהלים:**
*One-paragraph summary of the key functional findings (bugs, performance, battery). Do not mention user "interest" or "hype".*

---

### 📝 **ריכוז דיווחי משתמשים**

#### 👍 **דיווחים חיוביים**
*   *List bullet points of positive reports here. Each bullet must be a specific, translated quote or summary of a functional improvement. e.g., "האנימציות בממשק מרגישות חלקות ומהירות מתמיד."*
*   *If no positive reports are found, write: "לא נמצאו דיווחים חיוביים קונקרטיים."*

#### 👎 **דיווחים שליליים**
*   *List bullet points of negative reports here. Each bullet must be a specific, translated quote or summary of a functional bug or issue. e.g., "צריכת הסוללה התגברה בכ-30% במצב המתנה."*
*   *If no negative reports are found, write: "לא נמצאו דיווחים שליליים קונקרטיים."*

---

### 📈 **מגמות עיקריות**
*   **מגמה חיובית מרכזית:** *Summarize the main positive trend, if any. e.g., "שיפור ניכר במהירות הממשק."*
*   **מגמה שלילית מרכזית:** *Summarize the main negative trend, if any. e.g., "בעיות יציבות וקריסות אפליקציות צד-שלישי."*

---

### 🚦 **המלצה סופית**
**[מומלץ לעדכן / מומלץ להמתין / לא מומלץ לעדכן]**
*Provide a short, sharp justification based ONLY on the balance of functional reports you found.*

---
`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with the FINAL V7 Bug Hunter Prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      });

      if (response && response.content && response.content.length > 0) {
        console.log("✅ Claude API 'Bug Hunter' analysis successful.");
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
