require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot...');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const Database = require('../common/database');
const { formatResponse, formatResponseWithSplit, parseUserMessage, logMessageSplit } = require('../common/utils');

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
      polling: process.env.NODE_ENV !== 'production' 
    });

    // יצירת מופעי השירותים
    const deviceAnalyzer = new DeviceAnalyzer();
    const updateChecker = new UpdateChecker();
    const recommendationEngine = new RecommendationEngine();

    console.log('🤖 Bot initialized successfully');

    // פקודת התחלה
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
🤖 שלום! אני בוט יועץ עדכוני אנדרואיד

📱 אני יכול לעזור לכם לקבל החלטות חכמות לגבי עדכון המכשיר שלכם!

💡 פשוט שלחו לי את פרטי המכשיר שלכם בפורמט הבא:
\`דגם: [שם המכשיר]
גרסה נוכחית: [גרסת אנדרואיד]\`

או לחלופין:
\`Samsung Galaxy S21
Android 12\`

🔍 אני אבדוק עבורכם:
• האם יש עדכונים זמינים
• האם העדכון מומלץ
• מה החדש בעדכון
• בעיות ידועות (אם יש)

📊 תוכלו גם לשאול שאלות כלליות על עדכוני אנדרואיד!
      `;
      
      bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      
      // רישום פעילות
      try {
        await Database.logUserInteraction(chatId, 'start_command', { command: '/start' });
      } catch (error) {
        console.error('Error logging start command:', error?.message || error);
      }
    });

    // פקודת עזרה
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
🆘 עזרה - בוט יועץ עדכוני אנדרואיד

📋 פקודות זמינות:
• \`/start\` - התחלת השיחה
• \`/help\` - הצגת הודעה זו
• \`/stats\` - סטטיסטיקות שימוש

📱 איך להשתמש:
1️⃣ שלחו את פרטי המכשיר שלכם
2️⃣ אקבל המלצה מותאמת אישית
3️⃣ תוכלו לשאול שאלות נוספות

💡 דוגמאות לשאלות:
• "Samsung Galaxy S22, Android 13"
• "Pixel 6 Pro, Android 12"
• "מה חדש באנדרואיד 14?"
• "האם כדאי לעדכן לאנדרואיד 13?"

🔧 בעיות? צרו קשר עם המפתח.
      `;
      
      bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      
      try {
        await Database.logUserInteraction(chatId, 'help_command', { command: '/help' });
      } catch (error) {
        console.error('Error logging help command:', error?.message || error);
      }
    });

    // פקודת סטטיסטיקות
    bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        const stats = await Database.getUserStats(chatId);
        const globalStats = await Database.getGlobalStats();
        
        const statsMessage = `
📊 הסטטיסטיקות שלכם:
• שאלות שנשאלו: ${stats.questionsAsked || 0}
• המלצות שהתקבלו: ${stats.recommendationsReceived || 0}
• תאריך הצטרפות: ${stats.joinDate ? new Date(stats.joinDate).toLocaleDateString('he-IL') : 'לא זמין'}

🌍 סטטיסטיקות כלליות:
• סה"כ משתמשים: ${globalStats.totalUsers || 0}
• סה"כ שאלות: ${globalStats.totalQuestions || 0}
• עדכונים נבדקו היום: ${globalStats.updatesCheckedToday || 0}
        `;
        
        bot.sendMessage(chatId, statsMessage);
      } catch (error) {
        console.error('Error getting stats:', error?.message || error);
        bot.sendMessage(chatId, '❌ שגיאה בקבלת הסטטיסטיקות. נסו שוב מאוחר יותר.');
      }
    });

    // טיפול בהודעות טקסט רגילות
    bot.on('message', async (msg) => {
      // התעלמות מפקודות (הן מטופלות בנפרד)
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const messageText = msg.text;

      if (!messageText) {
        bot.sendMessage(chatId, '❌ אנא שלחו הודעת טקסט עם פרטי המכשיר שלכם.');
        return;
      }

      console.log(`📩 New message from ${chatId}: ${messageText}`);

      let waitingMsg;
      try {
        // שליחת הודעת המתנה
        waitingMsg = await bot.sendMessage(chatId, '⏳ מעבד את השאלה שלכם, אנא המתינו...');

        // ניתוח ההודעה
        const parsedMessage = parseUserMessage(messageText);
        console.log('📋 Parsed message:', parsedMessage);

        let response = '';
        let analysisResult = null;

        if (parsedMessage.deviceModel && parsedMessage.currentVersion) {
          // יש פרטי מכשיר - נתן המלצה מותאמת
          console.log(`🔍 Analyzing device: ${parsedMessage.deviceModel} with Android ${parsedMessage.currentVersion}`);

          // ניתוח המכשיר
          const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedMessage.deviceModel, parsedMessage.currentVersion);
          console.log('📱 Device analysis result:', deviceInfo);

          // בדיקת עדכונים
          const updateInfo = await updateChecker.checkForUpdates(parsedMessage.deviceModel, parsedMessage.currentVersion);
          console.log('🔄 Update check result:', updateInfo);

          // יצירת המלצה
          analysisResult = await recommendationEngine.generateRecommendation(deviceInfo, updateInfo, parsedMessage);
          console.log('💡 Recommendation generated:', analysisResult);

          response = formatResponse(analysisResult);
        } else {
          // שאלה כללית - חיפוש מידע רלוונטי
          console.log('❓ Processing general question');
          
          const generalInfo = await updateChecker.searchGeneralInfo(messageText);
          response = generalInfo || 'מצטער, לא מצאתי מידע רלוונטי לשאלה שלכם. אנא נסו לנסח אחרת או שלחו פרטי מכשיר ספציפיים.';
        }

        // רישום האינטראקציה
        await Database.logUserInteraction(chatId, 'question', {
          question: messageText,
          parsedData: parsedMessage,
          response: response,
          analysisResult: analysisResult
        });

        // בדיקה אם התגובה ארוכה מדי לטלגרם
        const responseWithSplit = formatResponseWithSplit(response);
        
        if (responseWithSplit.needsSplit) {
          console.log(`📄 Response is long (${response.length} chars), splitting into ${responseWithSplit.parts.length} parts`);
          
          // מחיקת הודעת ההמתנה לפני שליחת החלקים
          await bot.deleteMessage(chatId, waitingMsg.message_id);
          
          // שליחת החלקים
          for (let i = 0; i < responseWithSplit.parts.length; i++) {
            const part = responseWithSplit.parts[i];
            const isLast = i === responseWithSplit.parts.length - 1;
            
            const partHeader = responseWithSplit.parts.length > 1 ? 
              `📄 חלק ${i + 1}/${responseWithSplit.parts.length}\n\n` : '';
            
            await bot.sendMessage(chatId, partHeader + part, { parse_mode: 'HTML' });
            
            // רישום פיצול ההודעה
            logMessageSplit(chatId, messageText, i + 1, responseWithSplit.parts.length, part.length);
            
            // המתנה קצרה בין חלקים (מלבד החלק האחרון)
            if (!isLast) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        } else {
          // תגובה רגילה - עריכת הודעת ההמתנה
          await bot.editMessageText(response, {
            chat_id: chatId,
            message_id: waitingMsg.message_id,
            parse_mode: 'HTML'
          });
        }

        console.log('✅ Response sent successfully');

        // עדכון מונה השאלות והודעת מידע נוספת
        try {
          const userStats = await Database.getUserStats(chatId);
          const questionCount = (userStats.questionsAsked || 0) + 1;
          
          await Database.updateUserStats(chatId, { questionsAsked: questionCount });
          
          // הודעת מידע כל 5 שאלות
          const counterMessage = questionCount % 5 === 0 ? 
            `📊 זו השאלה מספר ${questionCount} שלכם! תודה שאתם משתמשים בבוט 🙏` :
            null;
          
          if (counterMessage) {
            // המתנה ארוכה יותר לפני שליחת הודעת המונה כדי לא להפריע לתצוגה
            await new Promise(resolve => setTimeout(resolve, 3000));
            await bot.sendMessage(chatId, counterMessage, { parse_mode: 'HTML' });
            console.log('✅ Counter message sent successfully');
          }
        } catch (counterError) {
          console.error('❌ Error sending counter message:', counterError?.message || counterError);
          // אל תעצור את התהליך אם הודעת המונה נכשלה
        }
      
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

    return bot;
  } catch (error) {
    console.error('Error initializing bot:', error?.message || error);
    throw error;
  }
}

// middleware להגנה
app.use(express.static('public'));

// הפעלת שרת ה-Express
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Android Update Advisor Bot',
    version: '1.0.0',
    component: 'bot'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Bot server is running on port ${PORT}`);
  console.log(`🤖 Bot is ${process.env.NODE_ENV === 'production' ? 'using webhooks' : 'polling'}`);
});

// הפעלת הבוט
initializeBot().catch(error => {
  console.error('Failed to initialize bot:', error?.message || error);
  process.exit(1);
});