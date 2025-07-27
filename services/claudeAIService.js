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
 * Analyzes a curated sample of search results with a highly refined and decisive prompt.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of 10 search results from Google.
 * @returns {Promise<string>} The detailed and decisive analysis from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  const contentForAnalysis = searchResults
    .map((item, index) => `Result #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  // V3 Prompt: Be decisive, analyze the sample, and provide translated evidence.
  const prompt = `You are a decisive tech analyst. Your task is to analyze this curated sample of the 10 most relevant search results for the query: "${query}".
Your entire analysis must be based ONLY on this provided sample. Do not apologize for the sample size or mention that information is "limited". Be confident in your analysis of the data you have.

Provide a detailed analysis in Hebrew, structured EXACTLY as follows:

1.  **תמצית מנהלים:** A one-paragraph summary of the main themes found in the provided results.

2.  **ממצאים מפורטים (Detailed Findings):**
    *   **👍 דיווחים חיוביים (Positive Reports):** Group similar positive reports. For each theme, provide a bullet point with a direct quote or a specific summary translated into Hebrew.
        *   לדוגמה:
        *   **ביצועים משופרים:**
            *   "משתמש ב-Reddit מציין שהמכשיר מרגיש 'מהיר וחלק יותר באופן משמעותי' (מתוך תוצאה #2)."
            *   "כתבה ב-XDA מדווחת על 'שיפור של 15% במבחני הביצועים' (מתוך תוצאה #7)."
    *   **👎 דיווחים שליליים (Negative Reports):** Group similar negative reports. For each theme, provide a bullet point with a direct quote or a specific summary translated into Hebrew.
        *   לדוגמה:
        *   **צריכת סוללה מוגברת:**
            *   "משתמש מתלונן: 'הסוללה שלי נגמרת ב-30% מהר יותר אחרי העדכון' (מתוך תוצאה #1)."
            *   "שרשור ב-Reddit מראה מספר משתמשים המאשרים 'בעיות סוללה חמורות' (מתוך תוצאה #4)."

3.  **המלצה מבוססת נתונים (Data-Driven Recommendation):** Based on the balance of positive vs. negative reports in the sample, provide a clear and decisive "מומלץ לעדכן", "לא מומלץ לעדכן", or "מומלץ להמתין". Justify your recommendation with the evidence you found.

Here are the 10 search results:\n---\n${contentForAnalysis}\n---`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with new V3 Decisive Prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2500,
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
