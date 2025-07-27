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
 * Analyzes a large, pre-filtered dataset with highly specific contextual rules.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The large, filtered array of search results.
 * @returns {Promise<string>} The comprehensive and context-aware analysis from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  if (searchResults.length < 3) { // Increased threshold
      return `לאחר חיפוש מעמיק, לא נמצאו מספיק דיווחים ספציפיים על הדגם המבוקש (${query}) כדי לגבש המלצה מהימנה. מומלץ לנסות שוב בעוד מספר ימים.`;
  }

  const contentForAnalysis = searchResults
    .map((item, index) => `Result #${index + 1}\nTitle: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  // V6 Prompt: The "Context-Aware" Prompt
  const prompt = `You are a meticulous tech researcher. Your task is to analyze this large, pre-filtered list of search results for the query: "${query}".

**CRITICAL RULE #1: CITE FACTS, NOT QUESTIONS.** You must only cite statements or claims made by users. IGNORE any questions you find in the search results (e.g., "Does anyone have battery drain?"). Citing a question is a failure.

**CRITICAL RULE #2: FOCUS ON FUNCTIONAL ISSUES.** You must only cite reports about the software's concrete performance, features, bugs, battery life, or stability. IGNORE meta-commentary, general complaints about update timelines, or comparisons to other brands.

Provide a detailed analysis in Hebrew, structured EXACTLY as follows:

1.  **תמצית מנהלים:** A one-paragraph summary of the key findings from all the provided results.

2.  **ריכוז דיווחי משתמשים (עד 15 דיווחים):** List up to 15 of the most relevant and informative user reports that follow the rules above. For each report, provide a bullet point with a direct quote or a specific summary translated into Hebrew, and mention its source result number.

3.  **סיכום וזיהוי מגמות:** Based on the list above, briefly summarize the main positive and negative trends.

4.  **המלצה סופית מבוססת נתונים:** Based on the balance of trends, provide a decisive "מומלץ לעדכן", "לא מומלץ לעדכן", or "מומלץ להמתין". Justify it with the data.

Here are the search results:\n---\n${contentForAnalysis}\n---`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude API call: Attempt #${attempt} with new V6 Context-Aware Prompt.`);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 3500,
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
