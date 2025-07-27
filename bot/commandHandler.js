const User = require('../models/user');
const { searchGoogle } = require('../services/googleSearch');
const { searchReddit } = require('../services/redditSearch');
const { analyzeDeviceData, extractDeviceName } = require('../services/claudeAIService');

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

function splitMessage(text, maxLength = 4096) {
    // ... (This function remains unchanged)
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

async function handleStart(bot, msg) {
    const user = await findOrCreateUser(msg);
    const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

📊 *שאילתות נותרות החודש: ${user.queriesLeft}/30*

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 *איך זה עובד:*
1. שלחו לי שאלה חופשית על המכשיר והעדכון.
2. אני אנתח את שאלתכם ואחפש דיווחים עדכניים.
3. אתן לכם המלצה מפורטת ומבוססת נתונים.
4. 👥 אציג לכם ציטוטים וקישורים למקורות!

⭐ *מה מיוחד בבוט:*
• ניתוח מבוסס AI של דיווחים מפורומים ומרדיט.
• ציטוטים ישירים מחוות דעת של משתמשים אחרים.
• קישורים למקורות כדי שתוכלו לקרוא עוד.

💬 *דוגמאות לשאלות:*
• "כדאי לעדכן את ה-Galaxy S23 ל-One UI 6.1?"
• "מה המצב עם אנדרואיד 15 ב-Pixel 8?"
• "A54 עדכון חדש"

🔢 *הגבלות שימוש:*
• כל משתמש זכאי ל-30 שאילתות בחודש.
• המכסה מתאפסת אוטומטית בתחילת כל חודש.

📞 *פקודות נוספות:*
/start - הודעת פתיחה ויתרת שאילתות

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
    `;
    bot.sendMessage(user.chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceCommand(bot, msg, match) {
    const chatId = msg.chat.id;
    const userQuery = match[1].trim(); // השאילתה המלאה של המשתמש

    try {
        const user = await findOrCreateUser(msg);

        if (user.queriesLeft <= 0) {
            bot.sendMessage(chatId, "מצטער, ניצלת את כל השאילתות שלך לחודש זה.");
            return;
        }

        bot.sendMessage(chatId, `קיבלתי. מנתח את שאלתך ומכין דוח עבור *"${userQuery}"*... 🕵️\nזה עשוי לקחת דקה או שתיים, תודה על הסבלנות.`, { parse_mode: 'Markdown' });

        // --- שלב 1: חילוץ שם המכשיר באמצעות AI ---
        const deviceName = await extractDeviceName(userQuery);
        if (!deviceName) {
            bot.sendMessage(chatId, "לא הצלחתי להבין על איזה מכשיר שאלת. אנא נסה לנסח את השאלה בצורה ברורה יותר, למשל: 'עדכון ל-Galaxy S24'.");
            return;
        }
        console.log(`Extracted device name: "${deviceName}" from query: "${userQuery}"`);
        bot.sendMessage(chatId, `מבצע חיפוש עבור: *${deviceName}*`, { parse_mode: 'Markdown' });

        // --- שלב 2: חיפוש מידע עם שם המכשיר הנקי ---
        const [googleResults, redditResults] = await Promise.all([
            searchGoogle(deviceName, userQuery), // שלח גם את השאילתה המקורית למיקוד
            searchReddit(deviceName, userQuery)
        ]);
        console.log(`Found ${googleResults.length} Google results and ${redditResults.length} Reddit results.`);

        // --- שלב 3: ניתוח סופי והפקדת דוח ---
        const analysis = await analyzeDeviceData(deviceName, googleResults, redditResults);

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
    handleDeviceCommand,
};
