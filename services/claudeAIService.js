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
 * Analyzes a large, pre-filtered dataset to provide a comprehensive user report.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The large, filtered array of search results.
 * @returns {Promise<string>} The comprehensive analysis from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  if (searchResults.length === 0) {
      return `לאחר חיפוש מעמיק, לא נמצאו דיווחים ספציפיים על הדגם המבוקש (${query}). ייתכן שהעדכון חדש מדי או שהדיונים עליו מתקיימים בפלטפורמות אחרות. מומלץ לנסות שוב בעוד מספר ימים.`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Result #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  // V5 Prompt: The "Serious Analysis" Prompt
  const prompt = `You are a meticulous tech researcher. Your task is to analyze this large, pre-filtered list of search results for the query: "${query}".
The user wants a comprehensive summary based on many real user reports.

Your analysis must be based ONLY on the provided results. Be decisive and confident.

Provide a detailed analysis in Hebrew, structured EXACTLY as follows:

1.  **תמצית מנהלים:** A one-paragraph summary of the key findings from all the provided results.

2.  **ריכוז דיווחי משתמשים (עד 15 דיווחים):** List up to 15 of the most relevant and informative user reports you found. For each report, provide a bullet point with a direct quote or a specific summary translated into Hebrew, and mention its source result number.
    *   לדוגמה:
    *   "הסוללה נגמרת לי בחצי מהזמן הרגיל אחרי העדכון, פשוט נורא (מתוך תוצאה #4)."
    *   "הממשק החדש מרגיש מהיר בטירוף, כל אנימציה חלקה (מתוך תוצאה #11)."
    *   "אפליקציית הבנק שלי קורסת כל פעם שאני מנסה לפתוח אותה (מתוך תוצאה #23)."

3.  **סיכום וזיהוי מגמות:** Based on the list above, briefly summarize the main positive and negative trends. (e.g., "The most common complaint by far is battery drain, mentioned in 7 different reports. On the other hand, 3 reports praise the new UI's speed.").

4.  **המלצה סופית מבוססת נתונים:** Based on the balance of trends, provide a decisive "מומלץ לעדכן", "לא מומלץ לעדכן", or "מומלץ להמתין". Justify it with the data.

Here are the search results:\n---\n${contentForAnalysis}\n---`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with new V5 Comprehensive Analysis Prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 3500, // Increased tokens for the very long and detailed response
        messages: [{ role: "user", content: prompt }],
      });

      if (response && response.content && response.content.length > 0) {
        console.log("✅ Claude API comprehensive analysis successful.");
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
