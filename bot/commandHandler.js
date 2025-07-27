const { getOrCreateUser, updateUserQueries } = require('../services/userService');
const { searchGoogle } = require('../services/googleSearch');
const { analyzeTextWithOpenAI } = require('../services/openaiService');

async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    const queriesLeft = 30 - user.monthlyQueryCount;

    const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

📊 שאילתות נותרות החודש: ${queriesLeft}/30

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 איך זה עובד:
1. שלחו לי שאלה על המכשיר והעדכון.
2. אני אנתח דיווחים עדכניים מהרשת.
3. אתן לכם המלצה מפורטת ומבוססת נתונים.

💬 דוגמאות לשאלות:
• "Galaxy S24 Android 15 feedback"
• "Pixel 8 update experience"
• "מה דעתכם על העדכון ל-A54?"

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
    `;
    bot.sendMessage(chatId, welcomeMessage);
}

// --- כאן התיקון השני ---
async function handleDeviceQuery(bot, msg, query) { // <-- מקבלים 'query' ישירות
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);

    if (user.monthlyQueryCount >= 30) {
        bot.sendMessage(chatId, '🚫 הגעתם למכסת השאילתות החודשית שלכם (30). המכסה תתאפס בתחילת החודש הבא.');
        return;
    }

    try {
        await bot.sendMessage(chatId, '🔎 אני בודק את הנושא, זה עשוי לקחת כדקה...');
        
        const searchResults = await searchGoogle(query);

        if (!searchResults || searchResults.length === 0) {
            bot.sendMessage(chatId, `לא מצאתי דיווחים עדכניים על עדכוני תוכנה עבור השאילתה "${query}". נסו לנסח את השאלה באופן כללי יותר, או שייתכן שאין בעיות מיוחדות שדווחו.`);
            return;
        }

        const analysis = await analyzeTextWithOpenAI(query, searchResults);
        await updateUserQueries(user.telegramId, user.monthlyQueryCount + 1);
        const queriesLeft = 30 - (user.monthlyQueryCount + 1);

        const finalMessage = `${analysis}\n\n---\n📊 שאילתות נותרות: ${queriesLeft}/30`;
        bot.sendMessage(chatId, finalMessage);

    } catch (error) {
        console.error('Error in handleDeviceQuery:', error);
        bot.sendMessage(chatId, 'קרתה שגיאה.. נסו שוב מאוחר יותר.');
    }
}

module.exports = { handleStart, handleDeviceQuery };
