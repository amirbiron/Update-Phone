const Anthropic = require('@anthropic-ai/sdk');

const claudeApiKey = process.env.CLAUDE_API_KEY;
if (!claudeApiKey) {
    throw new Error('CLAUDE_API_KEY is not defined in environment variables.');
}

const anthropic = new Anthropic({
  apiKey: claudeApiKey,
});

// Helper function to wait for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes search results with Claude, now with automatic retries for overloaded errors.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of search results from Google.
 * @returns {Promise<string>} The analysis and recommendation from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  const contentForAnalysis = searchResults
    .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  const prompt = `Based on the following search results for the query "${query}", please provide a concise summary in Hebrew.
Structure your answer in three parts:
1.  **סיכום כללי (General Summary):** A brief overview of the findings.
2.  **נקודות חיוביות (Positive Points):** Bullet points of good things people are saying (performance, battery, new features).
3.  **בעיות וסיכונים (Issues and Risks):** Bullet points of problems people are reporting (bugs, battery drain, app compatibility).
4.  **המלצה (Recommendation):** A clear "Yes", "No", or "Wait" recommendation with a short explanation.
If the results are irrelevant or don't contain user feedback, state that clearly. Do not invent information. Base your entire analysis ONLY on the provided text.
Here are the search results:\n---\n${contentForAnalysis}\n---`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt}`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
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
      // Check if it's the specific 'overloaded_error' and if we have retries left
      if (error instanceof Anthropic.APIError && error.status === 529 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        console.warn(`Claude API is overloaded. Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      } else {
        // For any other error, or on the last attempt, break the loop and report failure
        break;
      }
    }
  }

  // If the loop finished without returning a success, it means all retries failed.
  console.error("❌ Error calling Claude API after all retries:", lastError);
  return "הייתה בעיה בניתוח המידע מול שירות הבינה המלאכותית. נסו שוב בעוד מספר דקות.";
}

module.exports = { analyzeTextWithClaude };
