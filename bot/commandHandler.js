const { getOrCreateUser, updateUserQueries, resetUserQueries, getRecentUsers } = require('../services/userService');
const { searchGoogle } = require('../services/googleSearch');
const { analyzeTextWithClaude } = require('../services/claudeAIService');
const { sendLongMessage, removeMarkdownFormatting } = require('../common/utils');

async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    const queriesLeft = 30 - user.monthlyQueryCount;
    
    // הגדרת תפריט פקודות בהתאם לסטטוס המשתמש
    await setupCommandMenu(bot, msg.from.id, chatId);

    const welcomeMessage = `
🤖 **ברוכים הבאים לבוט יועץ עדכוני אנדרואיד המתקדם!**

📊 **שאילתות נותרות החודש: ${queriesLeft}/30**

---

## 📱 **איך זה עובד:**
1️⃣ **שלחו שאלה** על המכשיר והעדכון שלכם
2️⃣ **חיפוש מתקדם** - הבוט יחפש ברשת עם 6 אסטרטגיות שונות
3️⃣ **ניתוח מקיף** - קבלת דו"ח מפורט עם ציטוטים אמיתיים
4️⃣ **המלצה מבוססת נתונים** - החלטה מושכלת על בסיס העדויות

---

## 💡 **המלצה לחיפוש אפקטיבי:**
כתבו את שם הדגם בקצרה, למשל:
• \`כדאי לעדכן A54 לאנדרואיד 15?\`


---

**🔥 בואו נתחיל! שאלו אותי על העדכון שלכם ותקבלו ניתוח מקצועי ומקיף!**

---

**📞 לכל תקלה או ביקורת ניתן לפנות ל-@moominAmir בטלגרם**
    `;
    
    // Use sendLongMessage instead of bot.sendMessage for the welcome message
    await sendLongMessage(bot, chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceQuery(bot, msg, query) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);

    if (user.monthlyQueryCount >= 30) {
        bot.sendMessage(chatId, '🚫 הגעתם למכסת השאילתות החודשית שלכם (30). המכסה תתאפס בתחילת החודש הבא.');
        return;
    }

    try {
        const searchMessage = `🔍 מתחיל חיפוש מקיף...

⏳ אני מבצע חיפוש מתקדם עם 6 אסטרטגיות שונות לאיסוף עד 100 תוצאות רלוונטיות.
📊 לאחר מכן אנתח את כל הנתונים ואחלץ עד 20 עדויות משתמשים אמיתיות עם קישורים ישירים.
🔗 קישורים ישירים - כל ציטוט יכלול קישור למקור המקורי לאימות עצמאי.
🎯 שקיפות מלאה - אם לא אמצא מספיק מידע, אדווח על כך בכנות.

זה עשוי לקחת 1-2 דקות לניתוח מקיף...`;
        
        await bot.sendMessage(chatId, removeMarkdownFormatting(searchMessage));
        
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
        
        // Use sendLongMessage instead of bot.sendMessage for the analysis result
        await sendLongMessage(bot, chatId, finalMessage);

    } catch (error) {
        console.error('Error in handleDeviceQuery:', error);
        bot.sendMessage(chatId, 'קרתה שגיאה.. נסו שוב מאוחר יותר.');
    }
}

async function handleRecentUsers(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        const recentUsers = await getRecentUsers();
        const userCount = recentUsers.length;
        
        if (userCount === 0) {
            await bot.sendMessage(chatId, '📊 **משתמשים פעילים בשבוע האחרון: 0**\n\nאין משתמשים שהשתמשו בבוט בשבוע האחרון.');
            return;
        }

        let message = `📊 **משתמשים פעילים בשבוע האחרון: ${userCount}**\n\n`;
        
        recentUsers.forEach((user, index) => {
            const name = user.firstName || user.username || 'משתמש לא ידוע';
            const username = user.username ? `@${user.username}` : '';
            const lastQuery = user.lastQueryDate ? new Date(user.lastQueryDate).toLocaleString('he-IL') : 'לא ידוע';
            const queriesCount = user.monthlyQueryCount || 0;
            
            message += `${index + 1}. **${name}** ${username}\n`;
            message += `   📅 פעילות אחרונה: ${lastQuery}\n`;
            message += `   🔢 שאילתות החודש: ${queriesCount}/30\n`;
            message += `   🆔 ID: ${user.telegramId}\n\n`;
        });

        await sendLongMessage(bot, chatId, message, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error in handleRecentUsers:', error);
        await bot.sendMessage(chatId, '❌ אירעה שגיאה בעת קבלת רשימת המשתמשים הפעילים.');
    }
}

/**
 * Sets up command menu for user based on their admin status.
 * @param {object} bot - The Telegram bot instance.
 * @param {number} userId - The user's Telegram ID.
 * @param {number} chatId - The chat ID.
 */
async function setupCommandMenu(bot, userId, chatId) {
    const adminChatIds = process.env.ADMIN_CHAT_IDS ? process.env.ADMIN_CHAT_IDS.split(',').map(id => parseInt(id.trim())) : [];
    const isAdmin = adminChatIds.includes(userId);
    
    if (isAdmin) {
        // תפריט פקודות למנהלים
        const adminCommands = [
            { command: 'start', description: 'התחלת השיחה' },
            { command: 'recent_users', description: 'רשימת משתמשים פעילים' },
            { command: 'reset_me', description: 'איפוס המכסה שלי (מהיר)' },
            { command: 'reset_queries', description: 'איפוס מכסת שאילתות (הוסף ID משתמש)' },
            { command: 'admin_help', description: 'עזרה לפקודות מנהל' }
        ];
        
        try {
            await bot.setMyCommands(adminCommands, { scope: { type: 'chat', chat_id: chatId } });
            console.log(`✅ Admin commands menu set for user ${userId}`);
            return true;
        } catch (error) {
            console.error('Error setting admin commands menu:', error);
            return false;
        }
    } else {
        // תפריט פקודות רגיל למשתמשים רגילים
        const regularCommands = [
            { command: 'start', description: 'התחלת השיחה' }
        ];
        
        try {
            await bot.setMyCommands(regularCommands, { scope: { type: 'chat', chat_id: chatId } });
            console.log(`✅ Regular commands menu set for user ${userId}`);
            return true;
        } catch (error) {
            console.error('Error setting regular commands menu:', error);
            return false;
        }
    }
}

/**
 * Handles admin help command.
 * @param {object} bot - The Telegram bot instance.
 * @param {object} msg - The Telegram message object.
 */
async function handleAdminHelp(bot, msg) {
    const chatId = msg.chat.id;
    const adminChatIds = process.env.ADMIN_CHAT_IDS ? process.env.ADMIN_CHAT_IDS.split(',').map(id => parseInt(id.trim())) : [];
    
    if (!adminChatIds.includes(msg.from.id)) {
        await bot.sendMessage(chatId, '❌ פקודה זו זמינה רק למנהלים.');
        return;
    }
    
    const helpMessage = `
🔧 **פקודות מנהל זמינות:**

📋 **/recent_users** - רשימת משתמשים פעילים בשבוע האחרון
⚡ **/reset_me** - איפוס המכסה שלי (מהיר)
🔄 **/reset_queries [USER_ID]** - איפוס מכסת שאילתות למשתמש ספציפי
🏠 **/start** - התחלת השיחה מחדש
❓ **/admin_help** - הצגת עזרה זו

---

📝 **דוגמת שימוש:**
⚡ **איפוס מהיר עבורך:** פשוט הקש \`/reset_me\`
📋 **איפוס למשתמש אחר:**
1. הקש \`/recent_users\` כדי לראות רשימת משתמשים
2. העתק את ה-ID של המשתמש שאת רוצה לאפס לו את המכסה
3. הקש \`/reset_queries 123456789\` (החלף את המספר ב-ID האמיתי)

---

⚠️ **הערה:** רק משתמשים שמוגדרים ב-ADMIN_CHAT_IDS יכולים להשתמש בפקודות אלו.
    `;
    
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

/**
 * Handles quick reset for the main admin user.
 * @param {object} bot - The Telegram bot instance.
 * @param {object} msg - The Telegram message object.
 */
async function handleQuickReset(bot, msg) {
    const chatId = msg.chat.id;
    const adminChatIds = process.env.ADMIN_CHAT_IDS ? process.env.ADMIN_CHAT_IDS.split(',').map(id => parseInt(id.trim())) : [];
    
    // בדיקה אם המשתמש הוא מנהל
    if (!adminChatIds.includes(msg.from.id)) {
        await bot.sendMessage(chatId, '❌ אין לך הרשאות מנהל לביצוע פעולה זו.');
        return;
    }
    
    const targetUserId = 6865105071; // ה-ID שלך
    
    try {
        const success = await resetUserQueries(targetUserId);
        
        if (success) {
            await bot.sendMessage(chatId, `✅ המכסה שלך אופסה בהצלחה!\nאתה יכול עכשיו לבצע 30 שאילתות חדשות.`);
        } else {
            await bot.sendMessage(chatId, `❌ משתמש עם ID ${targetUserId} לא נמצא במערכת.`);
        }
    } catch (error) {
        console.error('Error in handleQuickReset:', error);
        await bot.sendMessage(chatId, '❌ אירעה שגיאה בעת איפוס המכסה.');
    }
}

/**
 * Handles admin command to reset user queries (admin only).
 * @param {object} bot - The Telegram bot instance.
 * @param {object} msg - The Telegram message object.
 * @param {string} targetUserId - The user ID to reset queries for.
 */
async function handleResetUserQueries(bot, msg, targetUserId) {
    const chatId = msg.chat.id;
    const adminChatIds = process.env.ADMIN_CHAT_IDS ? process.env.ADMIN_CHAT_IDS.split(',').map(id => parseInt(id.trim())) : [];
    
    // בדיקה אם המשתמש הוא מנהל
    if (!adminChatIds.includes(msg.from.id)) {
        await bot.sendMessage(chatId, '❌ אין לך הרשאות מנהל לביצוע פעולה זו.');
        return;
    }
    
    if (!targetUserId) {
        await bot.sendMessage(chatId, '❌ נא לציין ID של המשתמש לאיפוס.\nדוגמה: /reset_queries 123456789');
        return;
    }
    
    const userId = parseInt(targetUserId);
    if (isNaN(userId)) {
        await bot.sendMessage(chatId, '❌ ID המשתמש חייב להיות מספר.');
        return;
    }
    
    try {
        const success = await resetUserQueries(userId);
        
        if (success) {
            await bot.sendMessage(chatId, `✅ מכסת השאילתות אופסה בהצלחה עבור משתמש ${userId}.\nהמשתמש יכול עכשיו לבצע 30 שאילתות חדשות.`);
        } else {
            await bot.sendMessage(chatId, `❌ משתמש עם ID ${userId} לא נמצא במערכת.`);
        }
    } catch (error) {
        console.error('Error in handleResetUserQueries:', error);
        await bot.sendMessage(chatId, '❌ אירעה שגיאה בעת איפוס מכסת השאילתות.');
    }
}

module.exports = { handleStart, handleDeviceQuery, handleRecentUsers, handleResetUserQueries, handleQuickReset, handleAdminHelp, setupCommandMenu };
