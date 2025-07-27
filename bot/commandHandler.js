const { getOrCreateUser, updateUserQueries } = require('../services/userService');
const { searchGoogle } = require('../services/googleSearch');
const { analyzeTextWithClaude } = require('../services/claudeAIService');

async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    const queriesLeft = 30 - user.monthlyQueryCount;

    const welcomeMessage = `
🤖 **ברוכים הבאים לבוט יועץ עדכוני אנדרואיד המתקדם!**

📊 **שאילתות נותרות החודש: ${queriesLeft}/30**

---

## 🔍 **אמינות ושקיפות:**
🎯 **מידע אמיתי בלבד** - כל הציטוטים והדיווחים מבוססים על מקורות אמיתיים
✅ **שקיפות מלאה** - כל ציטוט כולל את המקור שממנו הוא נלקח
📊 **ללא המצאות** - אם אין מספיק מידע, נדווח על כך בכנות
🔗 **מקורות מאומתים** - חיפוש ברשת עם 6 אסטרטגיות שונות

---

## 🚀 **תכונות המערכת:**
✅ **חיפוש מקיף** - עד 60 תוצאות מרלוונטיות
✅ **ציטוטים אמיתיים** - רק עדויות שנמצאו בפועל
✅ **עיצוב משופר** עם ניתוח מעמיק ומפורט
✅ **אסטרטגיות חיפוש מרובות** לכיסוי מקסימלי

---

## 📱 **איך זה עובד:**
1️⃣ **שלחו שאלה** על המכשיר והעדכון שלכם
2️⃣ **חיפוש מתקדם** - הבוט יחפש ברשת עם 6 אסטרטגיות שונות
3️⃣ **ניתוח מקיף** - קבלת דו"ח מפורט עם ציטוטים אמיתיים
4️⃣ **המלצה מבוססת נתונים** - החלטה מושכלת על בסיס העדויות

---

## 💬 **דוגמאות לשאלות:**
• \`Samsung Galaxy A54 Android 15\`
• \`Google Pixel 8 Pro update experience\`
• \`Xiaomi 13 Android 14 battery issues\`
• \`OnePlus 12 performance after update\`

---

## 🎯 **מה תקבלו בניתוח:**
📋 **תקציר מנהלים** מקיף
💬 **20 עדויות משתמשים** מתורגמות לעברית
📊 **ניתוח מגמות מעמיק** (סוללה, ביצועים, UI, בעיות)
🚦 **המלצה מפורטת** עם נימוקים ברורים
📈 **סיכום נתונים** סטטיסטי

---

**🔥 בואו נתחיל! שאלו אותי על העדכון שלכם ותקבלו ניתוח מקצועי ומקיף!**
    `;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleDeviceQuery(bot, msg, query) {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);

    if (user.monthlyQueryCount >= 30) {
        bot.sendMessage(chatId, '🚫 הגעתם למכסת השאילתות החודשית שלכם (30). המכסה תתאפס בתחילת החודש הבא.');
        return;
    }

    try {
        await bot.sendMessage(chatId, `🔍 **מתחיל חיפוש מקיף...**

⏳ אני מבצע חיפוש מתקדם עם 6 אסטרטגיות שונות לאיסוף עד 60 תוצאות רלוונטיות.
📊 לאחר מכן אנתח את כל הנתונים ואחלץ רק עדויות משתמשים אמיתיות שנמצאו בפועל.
🎯 **שקיפות מלאה** - אם לא אמצא מספיק מידע, אדווח על כך בכנות.

*זה עשוי לקחת 1-2 דקות לניתוח מקיף...*`, { parse_mode: 'Markdown' });
        
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
