require('dotenv').config();

// בדיקה מוקדמת אם זה הרצת משימה של cron - אם כן, לא להפעיל את הבוט
if (process.env.RUN_TASK_NOW === 'true' || process.env.CRON_MODE === 'true' || process.env.SCHEDULED_JOB === 'true') {
  console.log('🔧 Running in CRON/SCHEDULED mode - bot initialization is DISABLED');
  console.log('📋 Available environment flags:');
  console.log(`   - RUN_TASK_NOW: ${process.env.RUN_TASK_NOW}`);
  console.log(`   - CRON_MODE: ${process.env.CRON_MODE}`);
  console.log(`   - SCHEDULED_JOB: ${process.env.SCHEDULED_JOB}`);
  console.log('🚫 Bot will NOT be started. Exiting immediately.');
  process.exit(0);
}

// בדיקה נוספת - אם זה הרצה של cron-task.js או משימה מתוזמנת
if (process.argv[0].includes('cron-task') || process.argv[1].includes('cron-task')) {
  console.log('🔧 Detected cron-task execution - bot initialization is DISABLED');
  process.exit(0);
}

console.log('🤖 Starting in BOT mode - bot initialization is ENABLED');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('./src/deviceAnalyzer');
const UpdateChecker = require('./src/updateChecker');
const RecommendationEngine = require('./src/recommendationEngine');
const Database = require('./src/database');
const { formatResponse, formatResponseWithSplit, parseUserMessage, logMessageSplit } = require('./src/utils');

// טיפול גלובלי בחריגות בלתי מטופלות
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error?.message || error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// מוסיפים את זה רק בסביבת פיתוח (development) לפני יצירת אובייקט הבוט
async function initializeBot() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const tempBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      await tempBot.deleteWebHook();
      console.log('🧹 Webhook deleted for development environment');
    }

    // יצירת הבוט - רק לאחר מחיקת webhook ב-development
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      webHook: process.env.NODE_ENV === 'production' ? {
        port: PORT,
        host: '0.0.0.0'
      } : false,
      polling: process.env.NODE_ENV !== 'production'
    });

    // הוספת מאזין לשגיאות כדי לזהות קונפליקטים
    bot.on('error', (error) => {
      if (error.code === 'ETELEGRAM' && error.response?.body?.description?.includes('conflict')) {
        console.error('⚠️ Bot conflict detected - another instance might be running!');
        console.error('🔍 Check if there are multiple bot instances or cron jobs running the main bot code');
        process.exit(1);
      } else {
        console.error('Bot error:', error?.message || error);
      }
    });

    bot.on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.response?.body?.description?.includes('conflict')) {
        console.error('⚠️ Polling conflict detected - another bot instance is already running!');
        console.error('🔍 Make sure only one instance of the bot is running');
        process.exit(1);
      } else {
        console.error('Polling error:', error?.message || error);
      }
    });

    return bot;
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error?.message || error);
    if (error.response?.body?.description?.includes('conflict')) {
      console.error('⚠️ Bot conflict detected during initialization');
      console.error('🔍 Another instance of the bot might already be running');
    }
    throw error;
  }
}

// אתחול הבוט
let bot;
initializeBot().then(botInstance => {
  bot = botInstance;
  setupBotHandlers(bot);
  console.log(`🤖 Bot initialized in ${process.env.NODE_ENV === 'production' ? 'webhook' : 'polling'} mode`);
}).catch(error => {
  console.error('❌ Failed to initialize bot:', error?.message || error);
  process.exit(1);
});

// פונקציה להגדרת handlers של הבוט
function setupBotHandlers(bot) {
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

  // פקודת התחלה
  bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  // בדיקת מספר השאילתות הנותרות
  const limitCheck = await Database.checkUserQueryLimit(chatId);
  const remainingInfo = `📊 <b>שאילתות נותרות החודש: ${limitCheck.remaining}/${limitCheck.limit}</b>\n\n`;
  
  const welcomeMessage = `
🤖 ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!

${remainingInfo}אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

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
• 🆕 **חיפוש מידע לכל דגם מכשיר!**

💬 דוגמאות לשאלות:
• "כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"
• "יש בעיות בעדכון One UI 6.0 ל-Galaxy A54?"
• "מה עם עדכון ל-Pixel 8 לאנדרואיד 14?"

🔢 <b>הגבלות שימוש:</b>
• כל משתמש יכול לשאול עד 30 שאלות בחודש
• המגבלה מתאפסת בתחילת כל חודש

📞 פקודות נוספות:
/help - עזרה מפורטת
/status - סטטוס המערכת
/feedback - משוב

בואו נתחיל! שאלו אותי על העדכון שלכם 🚀
  `;
  
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
  });

  // פקודת עזרה
  bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  // בדיקת מספר השאילתות הנותרות
  const limitCheck = await Database.checkUserQueryLimit(chatId);
  const remainingInfo = `📊 <b>שאילתות נותרות: ${limitCheck.remaining}/${limitCheck.limit}</b>\n\n`;
  
  const helpMessage = `
🆘 איך להשתמש בבוט:

${remainingInfo}📝 פורמטים נתמכים לשאלות:
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
• 🆕 **וכל יצרן אחר!** (הבוט כעת מחפש מידע לכל דגם)

📊 המידע שאני בודק:
• 👥 דיווחי משתמשים מפורומים
• 💬 חוות דעת מ-Reddit ופורומים טכניים
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

⚠️ <b>🔢 הגבלות שימוש - חשוב לדעת!</b>
• <b>כל משתמש: 30 שאילתות בחודש בלבד</b>
• המגבלה מתאפסת בתחילת כל חודש
• זה מבטיח שירות הוגן לכל המשתמשים
• 📊 מונה השאילתות יופיע אחרי כל תשובה

❓ שאלות נוספות? פשוט כתבו לי!
  `;
  
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
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
      // בדיקת הגבלת שאילתות חודשית
      const limitCheck = await Database.checkUserQueryLimit(chatId);
      
      if (!limitCheck.allowed) {
        const resetDate = limitCheck.resetDate.toLocaleDateString('he-IL');
        bot.sendMessage(chatId, 
          `⚠️ <b>הגעתם למגבלת השאילתות החודשית</b>\n\n` +
          `🔢 השתמשתם ב-${limitCheck.used} מתוך ${limitCheck.limit} שאילתות אפשריות החודש.\n` +
          `📅 המגבלה תתאפס ב-${resetDate}\n\n` +
          `💡 מגבלה זו קיימת כדי להבטיח שירות הוגן לכל המשתמשים.`,
          { parse_mode: 'HTML' }
        );
        return;
      }
      
      // הצגת מספר השאילתות הנותרות
      const remainingMessage = `📊 נותרו לכם <b>${limitCheck.remaining}</b> שאילתות החודש\n\n`;
      
      // הצגת אינדיקטור "כותב"
      bot.sendChatAction(chatId, 'typing');
      
      // הודעת המתנה עם מידע על שאילתות נותרות
      const waitingMsg = await bot.sendMessage(chatId, 
        remainingMessage + '🔍 בודק מידע על העדכון... זה יכול לקחת מספר שניות',
        { parse_mode: 'HTML' }
      );
    
      // ניתוח ההודעה
      const parsedQuery = parseUserMessage(messageText);
      
      if (!parsedQuery.device || !parsedQuery.manufacturer) {
        bot.editMessageText(
          remainingMessage + '❌ לא הצלחתי לזהות את פרטי המכשיר. \n\nאנא כתבו בפורמט:\n"כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"',
          { chat_id: chatId, message_id: waitingMsg.message_id, parse_mode: 'HTML' }
        );
        return;
      }
    
      // בדיקת פרטי המכשיר
      const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedQuery);
      
      if (!deviceInfo.isValid) {
        bot.editMessageText(
          remainingMessage + `❌ לא מצאתי מידע על המכשיר "${parsedQuery.manufacturer} ${parsedQuery.device}".\n\nוודאו שכתבתם את שם המכשיר נכון.`,
          { chat_id: chatId, message_id: waitingMsg.message_id, parse_mode: 'HTML' }
        );
        return;
      }
      
      // בדיקת מידע על העדכון
      bot.editMessageText('🔍 אוסף מידע מפורומים ו-Reddit...', {
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
          console.error(`❌ Error sending message chunk ${i}:`, messageError?.message || messageError);
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
      
      // שליחת הודעת מונה השאילתות הנותרות
      const updatedLimitCheck = await Database.checkUserQueryLimit(chatId);
      const counterMessage = `📊 <b>נשארו לך עוד ${updatedLimitCheck.remaining} שאלות לבוט החודש</b>`;
      
      // המתנה קצרה לפני שליחת הודעת המונה
      await new Promise(resolve => setTimeout(resolve, 1500));
      await bot.sendMessage(chatId, counterMessage, { parse_mode: 'HTML' });
    
    } catch (error) {
      console.error('Error processing message:', error?.message || error);
      
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
    console.error('Bot error:', error?.message || error);
  });

  bot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 409) {
      console.warn('⚠️ Conflict – ייתכן ויש מופע נוסף של הבוט. מתעלמים זמנית.');
    } else {
      console.error('Polling error:', error?.message || error);
    }
  });
}

// middleware להגנה
app.use(express.static('public'));

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

// הפעלת משימות מתוזמנות - רק אם מופעל הסקדג'ולר
if (process.env.ENABLE_SCHEDULER !== 'false') {
  console.log('🕒 Loading scheduler...');
  require('./src/scheduler');
} else {
  console.log('🚫 Scheduler is DISABLED via ENABLE_SCHEDULER=false');
}
