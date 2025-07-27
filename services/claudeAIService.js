const Anthropic = require('@anthropic-ai/sdk');

// Ensure the API key is loaded from environment variables
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not defined in environment variables.');
}

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

/**
 * Analyzes search results using the Claude AI model to provide a recommendation.
 * @param {string} query - The original user query.
 * @param {Array<object>} searchResults - The array of search results from Google.
 * @returns {Promise<string>} The analysis and recommendation from Claude.
 */
async function analyzeTextWithClaude(query, searchResults) {
  const contentForAnalysis = searchResults
    .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
    .join('\n\n---\n\n');

  const prompt = `Based on the following search results for the query "${query}", please provide a concise summary in Hebrew.
The summary should answer the question: "Is it a good idea to update the device based on these community reports?".
Structure your answer in three parts:
1.  **סיכום כללי (General Summary):** A brief overview of the findings.
2.  **נקודות חיוביות (Positive Points):** Bullet points of good things people are saying (performance, battery, new features).
3.  **בעיות וסיכונים (Issues and Risks):** Bullet points of problems people are reporting (bugs, battery drain, app compatibility).
4.  **המלצה (Recommendation):** A clear "Yes", "No", or "Wait" recommendation with a short explanation.

If the results are irrelevant or don't contain user feedback, state that clearly.
Do not invent information. Base your entire analysis ONLY on the provided text.

Here are the search results:
---
${contentForAnalysis}
---
`;

  try {
    const response = await anthropic.messages.create({
      // --- THIS IS THE FIX YOU CORRECTLY IDENTIFIED ---
      model: "claude-3-5-sonnet-20240620", 
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    
    if (response && response.content && response.content.length > 0) {
      console.log("✅ Claude API analysis successful.");
      return response.content[0].text;
    } else {
      console.error("❌ Claude API returned an empty or invalid response.");
      return "לא הצלחתי לנתח את המידע מ-Claude.";
    }

  } catch (error) {
    console.error("❌ Error calling Claude API:", error);
    return "הייתה בעיה בניתוח המידע מול שירות הבינה המלאכותית. נסו שוב בעוד מספר דקות.";
  }
}

module.exports = { analyzeTextWithClaude };
