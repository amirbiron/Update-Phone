const User = require('../models/user');
const { searchGoogle } = require('../services/googleSearch');
const { searchReddit } = require('../services/redditSearch');
const { analyzeDeviceData } = require('../services/claudeAIService');

async function findOrCreateUser(msg) {
    const { id: chatId, username } = msg.chat;
    let user = await User.findOne({ chatId });
    if (!user) user = new User({ chatId, username });
    user.resetQueriesIfNeeded();
    await user.save();
    return user;
}

function splitMessage(text, maxLength = 4096) {
    const chunks = [];
    if (!text) return chunks;
    let currentChunk = '';
    const lines = text.split('\n');
    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += line + '\n';
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

async function handleStart(bot, msg) {
    const user = await findOrCreateUser(msg);
    const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

📊 *שאילתות נותרות החודש: ${user.queriesLeft}/30*

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 *איך זה עובד:*
1. שלחו לי שאלה על המכשיר והעדכון.
2. אני אנתח דיווחים עדכניים מהרשת.
3. אתן לכם המלצה מפורטת ומבוססת נתונים.

💬 *דוגמאות לשאלות:*
• "Galaxy S24 Android 15 feedback"
• "Pixel 8 update experience"
• "מה דעתכם על העדכון ל-A54?"

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
    `;
    bot.sendMessage(user.chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceQuery(bot, msg) {
    const chatId = msg.chat.id;
    const userQuery = msg.text.trim();

    // התעלם מפקודות ידועות
    if (userQuery.startsWith('/')) return;

    try {
        const user = await findOrCreateUser(msg);
        if (user.queriesLeft <= 0) {
            bot.sendMessage(chatId, "מצטער, ניצלת את כל השאילתות שלך לחודש זה.");
            return;
        }

        bot.sendMessage(chatId, `קיבלתי. מחפש מידע עדכני עבור *"${userQuery}"*... 🕵️\nזה עשוי לקחת רגע.`, { parse_mode: 'Markdown' });
        
        const [googleResults, redditResults] = await Promise.all([
            searchGoogle(userQuery),
            searchReddit(userQuery)
        ]);
        
        console.log(`Found ${googleResults.length} Google results and ${redditResults.length} Reddit results.`);

        const analysis = await analyzeDeviceData(userQuery, googleResults, redditResults);

        const separator = '---- מפוצל ל2 הודעות----';
        const parts = analysis.split(separator);
        const mainReport = parts[0].trim();
        await bot.sendMessage(chatId, mainReport, { parse_mode: 'Markdown' });

        if (parts.length > 1 && parts[1].trim()) {
            const userReportsPart = parts[1].trim();
            const reportChunks = splitMessage(userReportsPart);
            for (const chunk of reportChunks) {
                await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown', disable_web_page_preview: true });
            }
        }
        
        user.queriesLeft -= 1;
        await user.save();
        await bot.sendMessage(chatId, `✅ דוח הושלם. נותרו לך *${user.queriesLeft}* שאילתות לחודש זה.`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error(`Error processing query "${userQuery}":`, error);
        bot.sendMessage(chatId, 'אוי, משהו השתבש בתהליך. אנא נסה שוב מאוחר יותר.');
    }
}

module.exports = {
    handleStart,
    handleDeviceQuery,
};
