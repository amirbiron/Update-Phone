require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('./src/deviceAnalyzer');
const UpdateChecker = require('./src/updateChecker');
const RecommendationEngine = require('./src/recommendationEngine');
const Database = require('./src/database');
const { formatResponse, parseUserMessage } = require('./src/utils');

const app = express();
const PORT = process.env.PORT || 3000;

// יצירת הבוט
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webHook: process.env.NODE_ENV === 'production' ? {
    port: PORT,
    host: '0.0.0.0'
  } : false,
  polling: process.env.NODE_ENV !== 'production'
});

// התחברות למסד נתונים
Database.connect();

// יצירת מופעי השירותים
const deviceAnalyzer = new DeviceAnalyzer();
const updateChecker = new UpdateChecker();
const recommendationEngine = new RecommendationEngine();

// הגדרת webhook לסביבת production
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  bot.setWebHook(webhookUrl);
  
  app.use(express.json());
  app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

// middleware להגנה
app.use(express.static('public'));

// פקודת התחלה
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 איך זה עובד:
1. שלחו לי את פרטי המכשיר שלכם
2. אני אבדוק את המצב של העדכון החדש
3. אתן לכם המלצה מפורטת

💬 דוגמאות לשאלות:
• "כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"
• "יש בעיות בעדכון One UI 6.0 ל-Galaxy A54?"
• "מה עם עדכון ל-Pixel 8 לאנדרואיד 14?"

📞 פקודות נוספות:
/help - עזרה מפורטת
/status - סטטוס המערכת
/feedback - משוב

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
  `;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// פקודת עזרה
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🆘 איך להשתמש בבוט:

📝 פורמטים נתמכים לשאלות:
• "כדאי לעדכן [יצרן] [דגם] ל[גרסה]?"
• "[דגם] [גרסה] יציב?"
• "בעיות ב[דגם] עדכון [גרסה]?"

🏭 יצרנים נתמכים:
• Samsung (Galaxy S, Note, A, M series)
• Google Pixel (כל הדגמים)
• Xiaomi (Mi, Redmi, POCO)
• OnePlus
• Huawei
• Honor
• Oppo
• Realme
• וכו'...

📊 המידע שאני בודק:
• דיווחי משתמשים מפורומים
• ביקורות מאתרים מקצועיים
• נתונים רשמיים מהיצרנים
• מעקב אחר בעיות ידועות
• מצב הגלגול האזורי

⚡ המלצות נוכחיות מבוססות על:
• רמת יציבות העדכון
• בעיות מדווחות
• זמן מאז השחרור
• דפוסים היסטוריים של היצרן

❓ שאלות נוספות? פשוט כתבו לי!
  `;
  
  bot.sendMessage(chatId, helpMessage);
});

// פקודת סטטוס
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const stats = await Database.getSystemStats();
    const statusMessage = `
📊 סטטוס המערכת:

🔍 סה"כ בדיקות בוצעו: ${stats.totalQueries || 0}
📱 מכשירים במעקב: ${stats.trackedDevices || 0}
🆕 עדכונים נבדקו השבוע: ${stats.weeklyUpdates || 0}
⚡ זמן תגובה ממוצע: ${stats.avgResponseTime || 'N/A'}ms

🌍 מצב שירותי מידע:
${await updateChecker.getServicesStatus()}

✅ המערכת פועלת כרגיל
    `;
    
    bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    console.error(`❌ Error at [status command]:`, error.message);
    bot.sendMessage(chatId, '❌ שגיאה בקבלת סטטוס המערכת. נסו שוב מאוחר יותר.');
  }
});

// טיפול בהודעות כלליות
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  
  // התעלמות מפקודות
  if (messageText && messageText.startsWith('/')) {
    return;
  }
  
  if (!messageText) {
    bot.sendMessage(chatId, '🤔 לא הבנתי. אנא שלחו הודעת טקסט עם השאלה שלכם.');
    return;
  }
  
  try {
    // הצגת אינדיקטור "כותב"
    bot.sendChatAction(chatId, 'typing');
    
    // הודעת המתנה
    const waitingMsg = await bot.sendMessage(chatId, '🔍 בודק מידע על העדכון... זה יכול לקחת מספר שניות');
    
    // ניתוח ההודעה
    const parsedQuery = parseUserMessage(messageText);
    
    if (!parsedQuery.device || !parsedQuery.manufacturer) {
      bot.editMessageText(
        '❌ לא הצלחתי לזהות את פרטי המכשיר. \n\nאנא כתבו בפורמט:\n"כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"',
        { chat_id: chatId, message_id: waitingMsg.message_id }
      );
      return;
    }
    
    // בדיקת פרטי המכשיר
    const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedQuery);
    
    if (!deviceInfo.isValid) {
      bot.editMessageText(
        `❌ לא מצאתי מידע על המכשיר "${parsedQuery.manufacturer} ${parsedQuery.device}".\n\nוודאו שכתבתם את שם המכשיר נכון.`,
        { chat_id: chatId, message_id: waitingMsg.message_id }
      );
      return;
    }
    
    // בדיקת מידע על העדכון
    bot.editMessageText('🔍 אוסף מידע מפורומים ואתרי טכנולוגיה...', {
      chat_id: chatId,
      message_id: waitingMsg.message_id
    });
    
    const updateInfo = await updateChecker.checkUpdate(deviceInfo, parsedQuery);
    
    // יצירת המלצה
    bot.editMessageText('🧠 מנתח נתונים ויוצר המלצה...', {
      chat_id: chatId,
      message_id: waitingMsg.message_id
    });
    
    const recommendation = await recommendationEngine.generateRecommendation(
      deviceInfo,
      updateInfo,
      parsedQuery
    );
    
    // עיצוב התשובה הסופית
    const formattedResponse = formatResponse(deviceInfo, updateInfo, recommendation);
    
    console.log(`📤 Sending update analysis to Telegram`);
    
    // שליחת התשובה עם כפתורי פעולה
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🔍 פרטים נוספים', callback_data: `details_${deviceInfo.device.replace(/\s+/g, '_')}` },
          { text: '🔄 בדוק מכשיר אחר', callback_data: 'check_another' }
        ],
        [
          { text: '❓ עזרה', callback_data: 'help' },
          { text: '📊 סטטיסטיקות', callback_data: 'stats' }
        ]
      ]
    };

    bot.editMessageText(formattedResponse, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });
    
    // שמירת השאילתה במסד הנתונים
    await Database.saveQuery({
      chatId,
      query: messageText,
      deviceInfo,
      updateInfo,
      recommendation,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error(`❌ Error at [message processing]:`, error.message);
    
    try {
      bot.editMessageText(
        '❌ אירעה שגיאה בעיבוד השאלה. אנא נסו שוב מאוחר יותר.\n\nאם הבעיה נמשכת, אנא צרו קשר עם התמיכה.',
        { chat_id: chatId, message_id: waitingMsg?.message_id }
      );
    } catch (editError) {
      console.error(`❌ Error at [editMessageText]:`, editError.message);
      bot.sendMessage(chatId, '❌ אירעה שגיאה בעיבוד השאלה. אנא נסו שוב מאוחר יותר.');
    }
  }
});

// טיפול בלחיצות על כפתורים
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  try {
    // אישור קבלת הלחיצה
    await bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'check_another') {
      bot.sendMessage(chatId, '🔍 שלחו לי את פרטי המכשיר הבא שתרצו לבדוק:\n\nדוגמה: "כדאי לעדכן Samsung Galaxy S24 לאנדרואיד 14?"');
      
    } else if (data === 'help') {
      const helpMessage = `
🤖 <b>איך להשתמש בבוט:</b>

📝 <b>דוגמאות לשאלות:</b>
• "כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"
• "Samsung Galaxy A54 Android 14 יציב?"
• "בעיות ב Pixel 7 עדכון Android 14"

🔍 <b>מה הבוט בודק:</b>
• יציבות העדכון
• בעיות מדווחות
• המלצות קהילה
• זמן מאז השחרור

⚡ <b>פקודות נוספות:</b>
• /start - התחלה
• /help - עזרה מפורטת
• /status - סטטוס המערכת

❓ שאלות נוספות? פשוט כתבו לי!
      `;
      
      bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
      
    } else if (data === 'stats') {
      try {
        const stats = await Database.getSystemStats();
        const statusMessage = `
📊 <b>סטטיסטיקות המערכת:</b>

🔍 סה"כ בדיקות: ${stats.totalQueries || 0}
📱 מכשירים במעקב: ${stats.trackedDevices || 0}
🆕 עדכונים השבוע: ${stats.weeklyUpdates || 0}
⚡ זמן תגובה ממוצע: ${stats.avgResponseTime || 'N/A'}ms

✅ המערכת פועלת כרגיל
        `;
        
        bot.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
      } catch (error) {
        bot.sendMessage(chatId, '❌ שגיאה בקבלת סטטיסטיקות. נסו שוב מאוחר יותר.');
      }
      
    } else if (data.startsWith('details_')) {
      const deviceName = data.replace('details_', '').replace(/_/g, ' ');
      const detailsMessage = `
🔍 <b>פרטים נוספים על ${deviceName}:</b>

📋 <b>מידע כללי:</b>
• הבוט בודק מספר מקורות מידע
• כולל פורומים, אתרי טכנולוגיה ודיווחי משתמשים
• ההמלצות מתעדכנות באופן שוטף

🔄 <b>לעדכון נתונים:</b>
שלחו שוב את השאלה שלכם לקבלת מידע מעודכן

⚠️ <b>הערה:</b> המלצות הבוט הן לצורך הכוונה בלבד
      `;
      
      bot.sendMessage(chatId, detailsMessage, { parse_mode: 'HTML' });
    }

  } catch (error) {
    console.error(`❌ Error at [callback query]:`, error.message);
    bot.sendMessage(chatId, '❌ אירעה שגיאה. נסו שוב מאוחר יותר.');
  }
});

// טיפול בשגיאות
bot.on('error', (error) => {
  console.error(`❌ Error at [bot error]:`, error.message);
});

bot.on('polling_error', (error) => {
  console.error(`❌ Error at [polling error]:`, error.message);
});

// הפעלת שרת ה-Express
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Android Update Advisor Bot',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🤖 Bot is ${process.env.NODE_ENV === 'production' ? 'using webhooks' : 'polling'}`);
});

// הפעלת משימות מתוזמנות
require('./src/scheduler');
