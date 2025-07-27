const { getOrCreateUser, updateUserQueries } = require('../services/userService');
const { searchGoogle } = require('../services/googleSearch');
const { analyzeTextWithClaude } = require('../services/claudeAIService');

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

async function handleDeviceQuery(bot, msg, query) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);

    if (user.monthlyQueryCount >= 30) {
        bot.sendMessage(chatId, '🚫 הגעתם למכסת השאילתות החודשית שלכם (30). המכסה תתאפס בתחילת החודש הבא.');
        return;
    }

    try {
        await bot.sendMessage(chatId, '🔎 אני בודק את הנושא, זה עשוי לקחת כדקה...');
        
        // מנקים את השאילתה ממילות שאלה כדי להתמקד במכשיר ובגרסה
        const cleanedQuery = query
            .replace(/כדאי לעדכן/gi, '')
            .replace(/should i update/gi, '')
            .replace(/feedback/gi, '')
            .replace(/experience/gi, '')
            .replace(/מה דעתכם על העדכון ל/gi, '')
            .replace(/ל/g, '') // מסירים את האות "ל"
            .trim(); // מנקים רווחים מההתחלה והסוף

        const searchResults = await searchGoogle(cleanedQuery);

        if (!searchResults || searchResults.length === 0) {
            bot.sendMessage(chatId, `לא מצאתי דיווחים עדכניים על עדכוני תוכנה עבור השאילתה "${cleanedQuery}". נסו לנסח את השאלה באופן כללי יותר, או שייתכן שאין בעיות מיוחדות שדווחו.`);
            return;
        }

        const analysis = await analyzeTextWithClaude(cleanedQuery, searchResults);
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
