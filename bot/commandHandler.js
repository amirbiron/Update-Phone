const User = require('../models/user');
const { searchGoogle } = require('../services/googleSearch');
const { searchReddit } = require('../services/redditSearch');
const { analyzeDeviceData } = require('../services/claudeAIService');
const { getSupportedModels } = require('../common/utils');

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

async function handleStart(bot, msg) {
    const user = await findOrCreateUser(msg);
    const welcomeMessage = `
ברוך הבא לבוט ניתוח עדכוני מכשירים! 👋
אני כאן כדי לעזור לך להחליט אם כדאי לעדכן את המכשיר שלך.

השתמש בפקודה \`/device\` ואחריה שם הדגם.
לדוגמה: \`/device Galaxy S24 Ultra\`

הבוט יאסוף דיווחי משתמשים עדכניים, ינתח אותם ויפיק דוח מפורט.

*שים לב: השימוש מוגבל ל-30 שאילתות בחודש.*
כרגע נותרו לך *${user.queriesLeft}* שאילתות.

בהצלחה!
    `;
    bot.sendMessage(user.chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceCommand(bot, msg, match) {
    const chatId = msg.chat.id;
    const modelName = match[1].trim();

    try {
        const user = await findOrCreateUser(msg);

        if (user.queriesLeft <= 0) {
            bot.sendMessage(chatId, "מצטער, ניצלת את כל השאילתות שלך לחודש זה. המכסה תתאפס בתחילת החודש הבא.");
            return;
        }

        bot.sendMessage(chatId, `קיבלתי. אוסף נתונים ומכין דוח ניתוח עדכונים עבור *${modelName}*... 🕵️\nזה עשוי לקחת דקה או שתיים.`, { parse_mode: 'Markdown' });

        console.log(`Starting update analysis for ${modelName}...`);
        const [googleResults, redditResults] = await Promise.all([
            searchGoogle(modelName),
            searchReddit(modelName)
        ]);
        console.log(`Found ${googleResults.length} Google results and ${redditResults.length} Reddit results.`);

        const analysis = await analyzeDeviceData(modelName, googleResults, redditResults);

        // לוגיקה חדשה לפיצול ההודעה
        const separator = '---- מפוצל ל2 הודעות----';
        const parts = analysis.split(separator);

        const mainReport = parts[0].trim();
        await bot.sendMessage(chatId, mainReport);

        if (parts.length > 1 && parts[1].trim()) {
            const userReports = parts[1].trim();
            // שליחת החלק השני ללא עיצוב מיוחד, כי העיצוב כבר בטקסט
            await bot.sendMessage(chatId, userReports, { parse_mode: 'HTML' }); // שימוש ב-HTML מאפשר גמישות רבה יותר עם קישורים
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
