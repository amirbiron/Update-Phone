require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('./src/deviceAnalyzer');
const UpdateChecker = require('./src/updateChecker');
const RecommendationEngine = require('./src/recommendationEngine');
const Database = require('./src/database');
const { formatResponse, formatResponseWithSplit, parseUserMessage, logMessageSplit } = require('./src/utils');

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
4. 👥 **חדש!** אציג לכם דיווחי משתמשים!

⭐ מה מיוחד בבוט:
• דיווחי משתמשים מפורומים ו-Reddit
• ציטוטים ישירים מחוות דעת של משתמשים אחרים
• קישורים למקורות כדי שתוכלו לקרוא עוד
• ניתוח מקצועי משולב עם חוות דעת אמיתיות

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
• 👥 דיווחי משתמשים מפורומים
• 💬 חוות דעת מ-Reddit ואתרי טכנולוגיה
• 📰 ביקורות מאתרים מקצועיים
• 🏢 נתונים רשמיים מהיצרנים
• 🔍 מעקב אחר בעיות ידועות
• 🌍 מצב הגלגול האזורי

⭐ מה חדש:
• הבוט מציג עכשיו דיווחי משתמשים!
• תוכלו לראות בדיוק מה משתמשים אחרים אומרים
• כולל ציטוטים ישירים מפורומים ו-Reddit
• עם פרטי המשתמש, תאריכים וקישורים

⚡ המלצות נוכחיות מבוססות על:
• רמת יציבות העדכון
• בעיות מדווחות על ידי משתמשים
• זמן מאז השחרור
• דפוסים היסטוריים של היצרן
• ניתוח סנטימנט של דיווחי משתמשים

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
    
    // עיצוב התשובה הסופית עם פיצול אוטומטי
    const messageChunks = formatResponseWithSplit(deviceInfo, updateInfo, recommendation);
    
    // לוג פרטי הפיצול
    logMessageSplit(messageChunks);
    
    // שליחת ההודעה הראשונה (עריכת הודעת ההמתנה)
    await bot.editMessageText(messageChunks[0], {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
      parse_mode: 'HTML'
    });
    
    // שליחת שאר ההודעות (דיווחי משתמשים)
    if (messageChunks.length > 1) {
      console.log(`📤 Sending ${messageChunks.length - 1} additional user report messages...`);
    }
    
    for (let i = 1; i < messageChunks.length; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // המתנה של שנייה בין הודעות
        await bot.sendMessage(chatId, messageChunks[i], {
          parse_mode: 'HTML'
        });
        console.log(`✅ Sent message chunk ${i}/${messageChunks.length - 1}`);
      } catch (messageError) {
        console.error(`❌ Error sending message chunk ${i}:`, messageError);
        // המשך לשלוח את שאר ההודעות גם אם אחת נכשלה
      }
    }
    
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
    console.error('Error processing message:', error);
    
    try {
      bot.editMessageText(
        '❌ אירעה שגיאה בעיבוד השאלה. אנא נסו שוב מאוחר יותר.\n\nאם הבעיה נמשכת, אנא צרו קשר עם התמיכה.',
        { chat_id: chatId, message_id: waitingMsg?.message_id }
      );
    } catch (editError) {
      bot.sendMessage(chatId, '❌ אירעה שגיאה בעיבוד השאלה. אנא נסו שוב מאוחר יותר.');
    }
  }
});

// טיפול בשגיאות
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
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
