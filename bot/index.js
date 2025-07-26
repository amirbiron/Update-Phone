require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot...');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const Database = require('../common/database');
const { formatResponse, formatResponseWithSplit, formatResponseWithUserReports, parseUserMessage, logMessageSplit } = require('../common/utils');

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
      
      // בדיקת הגבלת שאילתות
      let queryLimitInfo;
      try {
        queryLimitInfo = await Database.checkQueryLimit(chatId);
      } catch (error) {
        console.error('Error checking query limit:', error?.message || error);
        queryLimitInfo = { remaining: 30, limit: 30 };
      }
      
      const welcomeMessage = `
🤖 **ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!**

📊 **שאילתות נותרות החודש: ${queryLimitInfo.remaining}/${queryLimitInfo.limit}**

אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.

📱 **איך זה עובד:**
1. שלחו לי את פרטי המכשיר שלכם
2. אני אבדוק את המצב של העדכון החדש
3. אתן לכם המלצה מפורטת
4. 👥 **חדש!** אציג לכם דיווחי משתמשים!

⭐ **מה מיוחד בבוט:**
• דיווחי משתמשים מפורומים ו-Reddit
• ציטוטים ישירים מחוות דעת של משתמשים אחרים
• קישורים למקורות כדי שתוכלו לקרוא עוד
• ניתוח מקצועי משולב עם חוות דעת אמיתיות
• 🆕 **חיפוש מידע לכל דגם מכשיר!**

💬 **דוגמאות לשאלות:**
• "כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"
• "יש בעיות בעדכון One UI 6.0 ל-Galaxy A54?"
• "מה עם עדכון ל-Pixel 8 לאנדרואיד 14?"

🔢 **הגבלות שימוש:**
• כל משתמש יכול לשאול עד 30 שאלות בחודש
• המגבלה מתאפסת בתחילת כל חודש

📞 **פקודות נוספות:**
/help - עזרה מפורטת
/status - סטטוס המערכת
/feedback - משוב

**בואו נתחיל! שאלו אותי על העדכון שלכם** 🚀
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
🆘 **עזרה מפורטת - בוט יועץ עדכוני אנדרואיד**

📋 **פקודות זמינות:**
• \`/start\` - התחלת השיחה וברכה
• \`/help\` - הצגת הודעת עזרה זו
• \`/stats\` - סטטיסטיקות שימוש אישיות
• \`/status\` - בדיקת סטטוס המערכת
• \`/feedback\` - שליחת משוב והצעות

📱 **איך להשתמש בבוט:**
1️⃣ **שלחו פרטי מכשיר** - "Samsung Galaxy S23, Android 13"
2️⃣ **אקבלו המלצה מותאמת** עם דיווחי משתמשים אמיתיים
3️⃣ **שאלו שאלות נוספות** על עדכונים ובעיות

💡 **דוגמאות לשאלות שאפשר לשאול:**
• "כדאי לעדכן Samsung Galaxy S22 לאנדרואיד 14?"
• "יש בעיות בעדכון One UI 6.0?"
• "מה חדש באנדרואיד 15?"
• "הסוללה נגמרת מהר אחרי העדכון"

🔍 **מה תקבלו בתשובה:**
• המלצה מקצועית מבוססת נתונים
• דיווחי משתמשים אמיתיים מפורומים
• קישורים למקורות נוספים
• ציטוטים ישירים מחוות דעת

🔧 **בעיות או שאלות?** השתמשו ב-/feedback
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

    // פקודת סטטוס
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const statusMessage = `
🟢 **סטטוס המערכת**

🤖 **בוט:** פעיל ותקין
📊 **מסד נתונים:** מחובר
🔄 **שירותי עדכונים:** פעילים
🌐 **חיבור לאינטרנט:** יציב

⏰ **זמן פעילות:** ${Math.floor(process.uptime() / 3600)} שעות
💾 **זיכרון בשימוש:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

✅ **כל המערכות פועלות תקין!**
      `;
      
      bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      
      try {
        await Database.logUserInteraction(chatId, 'status_command', { command: '/status' });
      } catch (error) {
        console.error('Error logging status command:', error?.message || error);
      }
    });

    // פקודת משוב
    bot.onText(/\/feedback/, async (msg) => {
      const chatId = msg.chat.id;
      const feedbackMessage = `
💬 **משוב ובקשות**

🙏 נשמח לשמוע את דעתכם על הבוט!

📝 **איך לשלוח משוב:**
• שלחו הודעה החל במילה "משוב:"
• לדוגמה: "משוב: הבוט מעולה אבל הייתי רוצה יותר מידע על..."

🐛 **דיווח על באגים:**
• שלחו הודעה החל במילה "באג:"
• לדוגמה: "באג: הבוט לא מזהה את המכשיר Samsung..."

💡 **הצעות לשיפור:**
• שלחו הודעה החל במילה "הצעה:"
• לדוגמה: "הצעה: להוסיף תמיכה במכשירי Xiaomi..."

📧 **יצירת קשר ישירה:**
• אימייל: support@androidupdatebot.com
• טלגרם: @AndroidUpdateSupport

תודה שאתם עוזרים לנו להשתפר! 🚀
      `;
      
      bot.sendMessage(chatId, feedbackMessage, { parse_mode: 'Markdown' });
      
      try {
        await Database.logUserInteraction(chatId, 'feedback_command', { command: '/feedback' });
      } catch (error) {
        console.error('Error logging feedback command:', error?.message || error);
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

      // טיפול בהודעות משוב
      if (messageText.startsWith('משוב:') || messageText.startsWith('באג:') || messageText.startsWith('הצעה:')) {
        try {
          const feedbackType = messageText.startsWith('משוב:') ? 'feedback' : 
                              messageText.startsWith('באג:') ? 'bug' : 'suggestion';
          const feedbackContent = messageText.substring(messageText.indexOf(':') + 1).trim();
          
          await Database.saveFeedback({
            chatId: chatId,
            type: feedbackType,
            content: feedbackContent,
            timestamp: new Date()
          });
          
          const responseMessage = `
✅ **תודה על ${feedbackType === 'feedback' ? 'המשוב' : feedbackType === 'bug' ? 'דיווח הבאג' : 'ההצעה'}!**

📝 **קיבלנו את ההודעה שלכם:**
"${feedbackContent}"

🔄 **נבדוק את הנושא ונחזור אליכם בהקדם**

💬 **רוצים להוסיף עוד פרטים?** פשוט שלחו הודעה נוספת
          `;
          
          bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
          
          await Database.logUserInteraction(chatId, 'feedback_sent', { 
            type: feedbackType, 
            content: feedbackContent.substring(0, 100) 
          });
          
          return;
        } catch (error) {
          console.error('Error handling feedback:', error?.message || error);
          bot.sendMessage(chatId, '❌ שגיאה בשמירת המשוב. אנא נסו שוב מאוחר יותר.');
          return;
        }
      }

      console.log(`📩 New message from ${chatId}: ${messageText}`);

      // בדיקת הגבלת שאילתות
      let queryLimitInfo;
      try {
        queryLimitInfo = await Database.checkQueryLimit(chatId);
        if (!queryLimitInfo.allowed) {
          bot.sendMessage(chatId, `
❌ **הגעתם למגבלת השאילתות החודשית**

📊 **שאילתות שהשתמשתם החודש:** ${queryLimitInfo.used}/${queryLimitInfo.limit}

⏰ **המגבלה תתאפס ב:** ${new Date(queryLimitInfo.resetDate).toLocaleDateString('he-IL')}

💡 **רוצים יותר שאילתות?** 
צרו קשר איתנו באמצעות /feedback לשדרוג החשבון שלכם.
          `);
          return;
        }
      } catch (error) {
        console.error('Error checking query limit:', error?.message || error);
      }

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

          // בדיקה אם יש דיווחי משתמשים - אם כן נשתמש בפונקציה החדשה
          if (updateInfo && updateInfo.searchResults && 
              (updateInfo.searchResults.redditPosts?.length > 0 || 
               updateInfo.searchResults.forumDiscussions?.length > 0)) {
            
            console.log('📊 Found user reports, using formatResponseWithUserReports');
            const messagesArray = formatResponseWithUserReports(deviceInfo, updateInfo, analysisResult);
            
            // רישום האינטראקציה
            await Database.logUserInteraction(chatId, 'question', {
              question: messageText,
              parsedData: parsedMessage,
              response: messagesArray[0], // ההודעה הראשית
              analysisResult: analysisResult,
              hasUserReports: true,
              totalMessages: messagesArray.length
            });
            
            // מחיקת הודעת ההמתנה
            await bot.deleteMessage(chatId, waitingMsg.message_id);
            
            // שליחת כל ההודעות
            for (let i = 0; i < messagesArray.length; i++) {
              const message = messagesArray[i];
              const isFirst = i === 0;
              const isLast = i === messagesArray.length - 1;
              
              await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
              
              // רישום פיצול ההודעה
              logMessageSplit(chatId, messageText, i + 1, messagesArray.length, message.length);
              
              // המתנה קצרה בין הודעות (מלבד ההודעה האחרונה)
              if (!isLast) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            console.log(`✅ Sent ${messagesArray.length} messages with user reports`);
            
          } else {
            // אין דיווחי משתמשים - שימוש בפונקציה הרגילה
            response = formatResponse(analysisResult);
            
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
          }
        } else {
          // שאלה כללית - חיפוש מידע רלוונטי
          console.log('❓ Processing general question');
          
          const generalInfo = await updateChecker.searchGeneralInfo(messageText);
          response = generalInfo || 'מצטער, לא מצאתי מידע רלוונטי לשאלה שלכם. אנא נסו לנסח אחרת או שלחו פרטי מכשיר ספציפיים.';
          
          // רישום האינטראקציה
          await Database.logUserInteraction(chatId, 'question', {
            question: messageText,
            parsedData: parsedMessage,
            response: response,
            analysisResult: null
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
        }

        console.log('✅ Response sent successfully');

        // עדכון מונה השאלות והודעת מידע נוספת
        try {
          const userStats = await Database.getUserStats(chatId);
          const questionCount = (userStats.questionsAsked || 0) + 1;
          
          await Database.updateUserStats(chatId, { questionsAsked: questionCount });
          
          // עדכון מונה השאילתות החודשי
          await Database.updateQueryCount(chatId);
          
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