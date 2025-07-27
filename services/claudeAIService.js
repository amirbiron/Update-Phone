const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

async function analyzeDeviceData(deviceName, googleResults, redditResults) {
    const model = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307'; // מודל ברירת מחדל אם לא הוגדר

    const allReports = [...googleResults, ...redditResults];

    if (allReports.length === 0) {
        return "לא מצאתי מידע או דיווחים על המכשיר המבוקש. אנא נסה דגם אחר או בדוק ששם המכשיר נכון.";
    }

    const userPrompt = `
        Please analyze the following user reports and search results about the device "${deviceName}".
        Based *only* on the provided text, generate a summary in Hebrew that includes:
        1. A general overview of the device based on user sentiment.
        2. A summary of positive points mentioned.
        3. A summary of negative points or common issues mentioned.
        4. A final recommendation.

        Keep the language clear and objective. Do not invent information.

        Here are the reports:
        ---
        ${allReports.join('\n---\n')}
        ---
    `;

    try {
        const response = await anthropic.messages.create({
            model: model,
            max_tokens: 1500, // הגדלת המגבלה כדי לאפשר תשובות מפורטות
            messages: [{ role: 'user', content: userPrompt }],
            system: "You are a helpful assistant that analyzes tech reviews and provides summaries in Hebrew."
        });

        // החזרת התוכן של התשובה הראשונה מה-AI
        return response.content[0].text;
    } catch (error) {
        console.error('Error getting analysis from Claude AI:', error);
        return 'הייתה שגיאה בניתוח המידע. אנא נסה שוב מאוחר יותר.';
    }
}

module.exports = { analyzeDeviceData };
