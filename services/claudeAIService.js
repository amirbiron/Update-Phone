const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

function formatSourcesForPrompt(googleResults, redditResults) {
    let prompt = 'Google Search Results:\n';
    googleResults.forEach((r, i) => {
        prompt += `[Source G${i+1}: ${r.source}]\nTitle: ${r.title}\nSnippet: ${r.snippet}\nLink: ${r.link}\n\n`;
    });

    prompt += 'Reddit Search Results:\n';
    redditResults.forEach((r, i) => {
        prompt += `[Source R${i+1}: ${r.source}]\nTitle: ${r.title}\nContent: ${r.text}\nLink: ${r.link}\n\n`;
    });
    return prompt;
}

async function analyzeDeviceData(deviceName, googleResults, redditResults) {
    console.log("▶️ Claude AI: Initializing analysis...");
    const model = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229';
    const allSources = [...googleResults, ...redditResults];

    if (allSources.length === 0) {
        return `לא מצאתי דיווחים עדכניים על עדכוני תוכנה עבור המכשיר "${deviceName}". ייתכן שאין בעיות מיוחדות או שטרם דווחו.`;
    }

    const sourcesForPrompt = formatSourcesForPrompt(googleResults, redditResults);
    const currentDate = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const recheckDate = new Date();
    recheckDate.setMonth(recheckDate.getMonth() + 1);
    const formattedRecheckDate = recheckDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const userPrompt = `
You are an expert AI analyst for a Telegram bot that provides reports on Android software updates.
Your task is to generate a detailed, structured report in Hebrew based *only* on the provided search results.
You MUST follow the specified two-part format exactly. The two parts must be separated by the exact string "---- מפוצל ל2 הודעות----".

**Device:** ${deviceName}
**Search Results:**
---
${sourcesForPrompt}
---

**Instructions:**
Analyze the search results and generate the report using the following template. Fill in every field. If you lack specific information for a field, write "לא נמצא מידע".

**Template to fill:**

ניתוח עדכון: ${deviceName}

📊 דירוג יציבות: [Generate a stability score from 1 to 10 based on the ratio of positive to negative reports. 1=Very Unstable, 10=Very Stable] ⭐⭐⭐
🎯 רמת ביטחון: [High/Medium/Low based on the quantity and quality of sources. >10 sources = גבוהה, 5-9 = בינונית, <5 = נמוכה] 🎯

💡 המלצה: [Provide a clear recommendation: "מומלץ לעדכן", "מומלץ להמתין", or "לא מומלץ לעדכן כרגע"] [Provide a corresponding emoji: ✅, ⚠️, or ❌]

✅ יתרונות העדכון:
[List 2-4 positive points mentioned in the reports (e.g., • שיפור בביצועים). If none, state "• לא צוינו יתרונות בולטים".]

❌ חסרונות העדכון:
[List 2-4 negative points mentioned in the reports (e.g., • התחממות). If none, state "• לא דווחו בעיות משמעותיות".]

📋 הסבר:
[Provide a short, 1-2 sentence explanation for your recommendation.]

⏰ לוח זמנים:
• [Repeat your recommendation, e.g., "מומלץ להמתין"]
• בדיקה חוזרת: ${formattedRecheckDate}

📝 הערות חשובות:
[Add 1-2 important, generic notes like "• מומלץ תמיד לבצע גיבוי מלא לפני עדכון." or "• לעיתים, איפוס להגדרות יצרן לאחר עדכון פותר בעיות."]

👥 המלצות מותאמות:
• משתמש רגיל: [Provide recommendation for a regular user] [Emoji]
• משתמש טכני: [Provide recommendation for a technical user] [Emoji]
• שימוש עסקי: [Provide a conservative recommendation for a business user] [Emoji]

🔍 מקורות נבדקו: ${allSources.length} מקורות
🕒 עודכן: ${currentDate} ${currentTime}

❓ שאלות נוספות? שלחו /help לעזרה מפורטת

---- מפוצל ל2 הודעות----

👥 דיווחי משתמשים אמיתיים:

[For this section, select the 2-3 most informative user reports from the provided sources. For each report:]
🔸 [Source, e.g., "מפורום XDA Developers" or "מ-Reddit"]
• [Title of the thread/post]
  📍 [Source Name, e.g., XDA Developers or r/GalaxyS24]
  📝 [A short summary of the discussion or report.]
  דיווחי משתמשים:
  [Quote 1-2 actual user comments. Start with an emoji (😊 for positive, 😐 for neutral, 😡 for negative), the quote in Hebrew, and end with the source reference, e.g., | מקור: G1]
  🔗 [Link to the source]

[Repeat for 1-2 more sources.]
`;

    try {
        console.log("🧠 Claude AI: Sending data for analysis...");
        const response = await anthropic.messages.create({
            model: model,
            max_tokens: 4000,
            messages: [{ role: 'user', content: userPrompt }],
            system: "You are an AI assistant that generates structured reports about Android updates in Hebrew based on provided text and a strict template."
        });
        console.log("✅ Claude AI: Analysis received successfully.");
        return response.content[0].text;
    } catch (error) {
        console.error('❌ Claude AI Error:', error);
        return 'הייתה שגיאה בניתוח המידע. אנא נסה שוב מאוחר יותר.';
    }
}

module.exports = { analyzeDeviceData };
