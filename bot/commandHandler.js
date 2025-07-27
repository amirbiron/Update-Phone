const User = require('../models/user');
const { searchGoogle } = require('../services/googleSearch');
const { searchReddit } = require('../services/redditSearch');
const { analyzeDeviceData } = require('../services/claudeAIService');

// --- פונקציות עזר ---

async function findOrCreateUser(msg) {
    const { id: chatId, username } = msg.chat;
    let user = await User.findOne({ chatId });

    if (!user) {
        user = new User({ chatId, username });
    }
    
    user.resetQueriesIfNeeded();
    await user.save();
    return user;
}

// פונקציה לפיצול הודעות ארוכות, למקרה שהדיווחים רבים מדי
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
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}


// --- טיפול בפקודות ---

async function handleStart(bot, msg) {
    const user = await findOrCreateUser(msg);
    const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

📊 *שאילתות נותרות החודש: ${user.queriesLeft}/30*

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 *איך זה עובד:*
1. שלחו לי את שם המכשיר וגרסת העדכון (אם ידועה).
2. אני אבדוק דיווחי משתמשים עדכניים.
3. אתן לכם המלצה מפורטת ומבוססת נתונים.
4. 👥 אציג לכם ציטוטים וקישורים למקורות!

⭐ *מה מיוחד בבוט:*
• ניתוח מבוסס AI של דיווחים מפורומים ומרדיט.
• ציטוטים ישירים מחוות דעת של משתמשים אחרים.
• קישורים למקורות כדי שתוכלו לקרוא עוד.
• חיפוש מידע לכל דגם מכשיר!

💬 *דוגמאות לשאלות:*
• \`/device Galaxy S23 One UI 6.1\`
• \`/device Pixel 8 android 14 issues\`
• \`/device A54\`

🔢 *הגבלות שימוש:*
• כל משתמש זכאי ל-30 שאילתות בחודש.
• המכסה מתאפסת אוטומטית בתחילת כל חודש.

📞 *פקודות נוספות:*
/start - הודעת פתיחה ויתרת שאילתות
/help - עזרה (בקרוב)
/status - סטטוס המערכת (בקרוב)

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
    `;
    bot.sendMessage(user.chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceCommand(bot, msg, match) {
    const chatId = msg.chat.id;
    const modelName = match[1].trim();

    try {
        const user = await findOrCreateUser(msg);

        // בדיקת המגבלה - זה כבר היה קיים ועובד!
        if (user.queriesLeft <= 0) {
            bot.sendMessage(chatId, "מצטער, ניצלת את כל השאילתות שלך לחודש זה. המכסה תתאפס בתחילת החודש הבא.");
            return;
        }

        bot.sendMessage(chatId, `קיבלתי. אוסף נתונים ומכין דוח ניתוח עדכונים עבור *${modelName}*... 🕵️\nזה עשוי לקחת דקה או שתיים, תודה על הסבלנות.`, { parse_mode: 'Markdown' });

        console.log(`Starting update analysis for ${modelName}...`);
        const [googleResults, redditResults] = await Promise.all([
            searchGoogle(modelName),
            searchReddit(modelName)
        ]);
        console.log(`Found ${googleResults.length} Google results and ${redditResults.length} Reddit results.`);

        const analysis = await analyzeDeviceData(modelName, googleResults, redditResults);

        const separator = '---- מפוצל ל2 הודעות----';
        const parts = analysis.split(separator);

        const mainReport = parts[0].trim();
        await bot.sendMessage(chatId, mainReport, { parse_mode: 'Markdown' });

        if (parts.length > 1 && parts[1].trim()) {
            const userReportsPart = parts[1].trim();
            // פיצול חלק דיווחי המשתמשים אם הוא ארוך מדי
            const reportChunks = splitMessage(userReportsPart);
            for (const chunk of reportChunks) {
                await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown', disable_web_page_preview: true });
            }
        }
        
        user.queriesLeft -= 1;
        await user.save();

        await bot.sendMessage(chatId, `✅ דוח הושלם. נותרו לך *${user.queriesLeft}* שאילתות לחודש זה.`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error(`Error processing /device command for ${modelName}:`, error);
        bot.sendMessage(chatId, 'אוי, משהו השתבש בתהליך. אנא נסה שוב מאוחר יותר.');
    }
}

module.exports = {
    handleStart,
    handleDeviceCommand,
};
