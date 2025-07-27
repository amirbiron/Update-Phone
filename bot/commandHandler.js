// --- ייבוא מודולים ---
// מודלים של מסד נתונים
const User = require('../models/user');

// שירותים חיצוניים
const { searchGoogle } = require('../services/googleSearch');
const { searchReddit } = require('../services/redditSearch');
const { analyzeDeviceData } = require('../services/claudeAIService');

// פונקציות עזר
const { getSupportedModels } = require('../common/utils');

// --- פונקציות עזר ---

// פונקציה לפיצול הודעות ארוכות
function splitMessage(text, maxLength = 4096) {
    const chunks = [];
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

// פונקציה למצוא או ליצור משתמש חדש
async function findOrCreateUser(msg) {
    const { id: chatId, username } = msg.chat;
    let user = await User.findOne({ chatId });

    if (!user) {
        user = new User({ chatId, username });
    }
    
    // בדיקה ואיפוס מכסה אם נדרש
    user.resetQueriesIfNeeded();
    await user.save();
    return user;
}


// --- טיפול בפקודות ---

async function handleStart(bot, msg) {
    const user = await findOrCreateUser(msg);
    const supportedModels = getSupportedModels();
    const modelsText = supportedModels.map(m => `- ${m}`).join('\n');
    
    const welcomeMessage = `
ברוך הבא לבוט עדכון המכשירים! 👋
אני כאן כדי לעזור לך לקבל מידע מקיף על כל מכשיר.

השתמש בפקודה \`/device\` ואחריה שם הדגם.
לדוגמה: \`/device iPhone 15 Pro\`

הבוט יאסוף מידע עדכני מפורומים ומרשתות חברתיות ויסכם אותו עבורך.

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

        // 1. בדיקת מכסת שאילתות
        if (user.queriesLeft <= 0) {
            bot.sendMessage(chatId, "מצטער, ניצלת את כל השאילתות שלך לחודש זה. המכסה תתאפס בתחילת החודש הבא.");
            return;
        }

        // 2. שליחת הודעת המתנה
        bot.sendMessage(chatId, `קיבלתי. מחפש ומנתח מידע על *${modelName}*... 🕵️\nזה עשוי לקחת דקה או שתיים.`, { parse_mode: 'Markdown' });

        // 3. איסוף מידע במקביל
        console.log(`Starting search for ${modelName}...`);
        const [googleResults, redditResults] = await Promise.all([
            searchGoogle(modelName),
            searchReddit(modelName)
        ]);
        console.log(`Found ${googleResults.length} Google results and ${redditResults.length} Reddit results.`);

        // 4. ניתוח המידע עם Claude AI
        const analysis = await analyzeDeviceData(modelName, googleResults, redditResults);

        // 5. פיצול ושליחת התשובה
        const messageChunks = splitMessage(analysis);
        for (const chunk of messageChunks) {
            await bot.sendMessage(chatId, chunk);
        }

        // 6. עדכון מכסת המשתמש
        user.queriesLeft -= 1;
        await user.save();

        // 7. שליחת הודעת יתרה
        await bot.sendMessage(chatId, `✅ ניתוח הושלם. נותרו לך *${user.queriesLeft}* שאילתות לחודש זה.`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error(`Error processing /device command for ${modelName}:`, error);
        bot.sendMessage(chatId, 'אוי, משהו השתבש בתהליך. אנא נסה שוב מאוחר יותר.');
    }
}

module.exports = {
    handleStart,
    handleDeviceCommand,
};
