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
 * Analyzes search results by categorizing ALL findings, based on the user's "show me everything" philosophy.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of search results from Google.
 * @returns {Promise<string>} The detailed analysis from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  const contentForAnalysis = searchResults
    .map((item, index) => `Result #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  // New prompt based on the "validation through repetition" philosophy.
  const prompt = `You are a meticulous tech analyst. Your task is to analyze the following user search results for the query: "${query}".
Your analysis MUST focus exclusively on the specific device model from the query.

Your goal is to categorize EVERY relevant piece of information you find. Repetition is not noise; it is validation. Group similar reports together.
Provide a detailed analysis in Hebrew, structured EXACTLY as follows:

1.  **תמצית מנהלים:** A one-paragraph summary of the main themes found across all results.

2.  **ממצאים מפורטים (Detailed Findings):**
    *   **👍 דיווחים חיוביים (Positive Reports):** Create a bullet point for each positive theme (e.g., Performance, New Features). Under each bullet, list the titles of the results that support this theme.
        *   לדוגמה:
        *   **ביצועים משופרים:**
            *   "Result #2: A54 feels snappier after update"
            *   "Result #7: One UI 7 benchmark improvements"
    *   **👎 דיווחים שליליים (Negative Reports):** Create a bullet point for each negative theme (e.g., Battery Drain, App Crashes). Under each bullet, list the titles of the results that support this theme.
        *   לדוגמה:
        *   **צריכת סוללה מוגברת:**
            *   "Result #1: My battery is draining so fast on A54 with Android 15"
            *   "Result #4: A54 Battery life discussion thread"
            *   "Result #9: Anyone else have bad battery after update?"

3.  **המלצה מבוססת נתונים (Data-Driven Recommendation):** Based on the *balance* of positive vs. negative reports you found, provide a clear "Yes", "No", or "Wait" recommendation. Justify it with the data (e.g., "Wait. While 2 reports praise performance, 4 separate reports indicate a significant battery drain issue.").

Do not invent information. Your entire analysis must be based ONLY on the provided text.
Here are the search results:\n---\n${contentForAnalysis}\n---`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with new "Show Everything" prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2500, // Increased tokens for the detailed, structured response
        messages: [{ role: "user", content: prompt }],
      });

      if (response && response.content && response.content.length > 0) {
        console.log("✅ Claude API analysis successful.");
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
