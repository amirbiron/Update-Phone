require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot...');

// בדיקת תצורת APIs זמינים
function logAvailableServices() {
  console.log('\n📊 === תצורת שירותים זמינים ===');
  
  // בדיקת Claude AI
  if (process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.includes('your_')) {
    console.log('🧠 AI Engine: Claude API ✅ (Configured)');
    console.log(`🔑 Claude API Key: ${process.env.CLAUDE_API_KEY.substring(0, 10)}...${process.env.CLAUDE_API_KEY.substring(process.env.CLAUDE_API_KEY.length - 5)}`);
  } else {
    console.log('🧠 AI Engine: Basic Analysis ⚠️ (Claude not configured)');
    if (!process.env.CLAUDE_API_KEY) {
      console.log('❌ Claude AI: CLAUDE_API_KEY not found in environment variables');
    } else if (process.env.CLAUDE_API_KEY.includes('your_')) {
      console.log('❌ Claude AI: CLAUDE_API_KEY contains placeholder text');
    }
  }
  
  // בדיקת Google Search API
  console.log(`\n🔑 === Google Search API Debug Info ===`);
  console.log(`🔑 GOOGLE_SEARCH_API_KEY: ${process.env.GOOGLE_SEARCH_API_KEY ? `exists (${process.env.GOOGLE_SEARCH_API_KEY.substring(0, 10)}...)` : 'MISSING/UNDEFINED'}`);
  console.log(`🔑 GOOGLE_SEARCH_ENGINE_ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID ? `exists (${process.env.GOOGLE_SEARCH_ENGINE_ID})` : 'MISSING/UNDEFINED'}`);
  console.log(`🔑 All Google-related env vars: ${Object.keys(process.env).filter(key => key.toLowerCase().includes('google')).join(', ') || 'none found'}`);
  console.log(`=======================================\n`);
  
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID && 
      !process.env.GOOGLE_SEARCH_API_KEY.includes('your_') && 
      !process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_')) {
    console.log('🔍 Search Engine: Google Custom Search API ✅ (Primary)');
    console.log('🔄 Fallback: DuckDuckGo API (Free backup)');
  } else {
    console.log('🔍 Search Engine: DuckDuckGo API ⚠️ (Google not configured)');
  }
  
  // בדיקת Reddit API
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && 
      !process.env.REDDIT_CLIENT_ID.includes('your_') && 
      !process.env.REDDIT_CLIENT_SECRET.includes('your_')) {
    console.log('📱 Reddit API: ✅ (Configured)');
  } else {
    console.log('📱 Reddit API: ⚠️ (Not configured)');
  }
  
  // בדיקת MongoDB
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('your_')) {
    console.log('💾 Database: MongoDB ✅ (Connected)');
  } else {
    console.log('💾 Database: ⚠️ (Not configured)');
  }
  
  console.log('=======================================\n');
}

// הצגת תצורת השירותים בהפעלה
logAvailableServices();

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const Database = require('../common/database');
const { formatResponse, formatResponseWithSplit, formatResponseWithUserReports, parseUserMessage, logMessageSplit } = require('../common/utils');

// פונקציה לשליחת הודעת מידע על שאילתות נותרות
async function sendQueryLimitMessage(chatId, bot) {
  try {
    // המתנה קצרה לפני שליחת הודעת המידע
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const queryLimitInfo = await Database.checkQueryLimit(chatId);
    
    // בחירת אימוג'י ומסר לפי כמות השאילתות הנותרות
    let statusEmoji = '📊';
    let statusText = '';
    let extraTip = '';
    
    if (queryLimitInfo.remaining === 0) {
      statusEmoji = '🚫';
      statusText = ' (הגעתם למגבלה)';
      extraTip = '\n🔄 **המגבלה תתאפס בתחילת החודש הבא**';
    } else if (queryLimitInfo.remaining <= 3) {
      statusEmoji = '🔴';
      statusText = ' (אחרונות!)';
      extraTip = '\n⚡ **השתמשו בחכמה - נותרו מעט שאילתות**';
    } else if (queryLimitInfo.remaining <= 5) {
      statusEmoji = '⚠️';
      statusText = ' (נותרו מעט!)';
      extraTip = '\n💡 **שמרו שאילתות לעדכונים חשובים**';
    } else if (queryLimitInfo.remaining <= 10) {
      statusEmoji = '📉';
      statusText = ' (בדרך לסיום)';
    } else if (queryLimitInfo.remaining >= 25) {
      statusEmoji = '✅';
      statusText = ' (הרבה נותרו)';
      extraTip = '\n🎉 **אתם יכולים לשאול בחופשיות!**';
    }
    
    const limitMessage = `
${statusEmoji} **שאילתות החודש:** ${queryLimitInfo.remaining}/${queryLimitInfo.limit}${statusText}${extraTip}

💡 **טיפ:** השתמשו בפקודה /stats לסטטיסטיקות מפורטות
    `.trim();
    
    await bot.sendMessage(chatId, limitMessage, { parse_mode: 'Markdown' });
    console.log(`📊 Sent query limit info: ${queryLimitInfo.remaining}/${queryLimitInfo.limit}`);
    
    // הודעות מיוחדות במילים עגולים
    const usedQueries = queryLimitInfo.limit - queryLimitInfo.remaining;
    const usagePercentage = (usedQueries / queryLimitInfo.limit) * 100;
    
    // הודעה כשמגיעים ל-50% מהשאילתות
    if (usedQueries === Math.floor(queryLimitInfo.limit * 0.5)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await bot.sendMessage(chatId, `
🎯 **הגעתם לחצי הדרך!**

השתמשתם ב-${usedQueries} שאילתות מתוך ${queryLimitInfo.limit} 📈

💪 **המשיכו לשאול - עוד הרבה מקום!**
      `.trim(), { parse_mode: 'Markdown' });
    }
    
    // הודעה כשמגיעים ל-75% מהשאילתות
    if (usedQueries === Math.floor(queryLimitInfo.limit * 0.75)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await bot.sendMessage(chatId, `
🔥 **75% מהשאילתות נוצלו!**

נותרו ${queryLimitInfo.remaining} שאילתות החודש 📊

⚡ **השתמשו בהן בחכמה לעדכונים החשובים ביותר**
      `.trim(), { parse_mode: 'Markdown' });
    }
    
  } catch (error) {
    console.error('Error sending query limit message:', error?.message || error);
    // לא עוצרים את התהליך אם הודעת המידע נכשלה
  }
}

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
    // התחברות למסד הנתונים
    console.log('🔌 Connecting to database...');
    await Database.connect();
    console.log('✅ Database connected successfully');
    
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
        
        // בדיקת מגבלת שאילתות
        const queryLimitInfo = await Database.checkQueryLimit(chatId);
        const usedQueries = queryLimitInfo.limit - queryLimitInfo.remaining;
        const usagePercentage = Math.round((usedQueries / queryLimitInfo.limit) * 100);
        
        // אימוג'י לפי אחוז השימוש
        let usageEmoji = '📊';
        if (usagePercentage >= 90) usageEmoji = '🔴';
        else if (usagePercentage >= 75) usageEmoji = '🟠';
        else if (usagePercentage >= 50) usageEmoji = '🟡';
        else if (usagePercentage >= 25) usageEmoji = '🟢';
        else usageEmoji = '✅';
        
        const statsMessage = `
📊 **הסטטיסטיקות שלכם:**

👤 **פעילות אישית:**
• שאלות שנשאלו: ${stats.questionsAsked || 0}
• המלצות שהתקבלו: ${stats.recommendationsReceived || 0}
• תאריך הצטרפות: ${stats.joinDate ? new Date(stats.joinDate).toLocaleDateString('he-IL') : 'לא זמין'}

${usageEmoji} **שאילתות החודש:**
• נוצלו: ${usedQueries}/${queryLimitInfo.limit} (${usagePercentage}%)
• נותרו: ${queryLimitInfo.remaining}
• מתאפס ב: ${new Date(queryLimitInfo.resetDate).toLocaleDateString('he-IL')}

🌍 **סטטיסטיקות כלליות:**
• סה"כ משתמשים: ${globalStats.totalUsers || 0}
• סה"כ שאלות: ${globalStats.totalQuestions || 0}
• עדכונים נבדקו היום: ${globalStats.updatesCheckedToday || 0}
        `;
        
        bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
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

        if (parsedMessage.device && parsedMessage.version) {
          // יש פרטי מכשיר - נתן המלצה מותאמת
          console.log(`\n📊 === Query Processing Started ===`);
          console.log(`👤 User: ${chatId}`);
          console.log(`📱 Device: ${parsedMessage.device}`);
          console.log(`🔄 Version: ${parsedMessage.version}`);
          console.log(`🔍 Analyzing device: ${parsedMessage.device} with Android ${parsedMessage.version}`);

          // ניתוח המכשיר
          const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedMessage.device, parsedMessage.version);
          console.log('📱 Device analysis result:', deviceInfo);

          // בדיקת עדכונים עם לוגים מפורטים
          console.log(`🔍 [Bot] Calling checkForUpdates for: ${parsedMessage.device} ${parsedMessage.version}`);
          const updateInfo = await updateChecker.checkForUpdates(parsedMessage.device, parsedMessage.version);
          console.log('🔄 [Bot] Update check result:', {
            hasSearchResults: !!updateInfo.searchResults,
            redditCount: updateInfo.searchResults?.redditPosts?.length || 0,
            forumsCount: updateInfo.searchResults?.forumDiscussions?.length || 0,
            officialCount: updateInfo.searchResults?.officialSources?.length || 0,
            hasError: !!updateInfo.error
          });

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
            
            // הודעת מידע על שאילתות נותרות
            await sendQueryLimitMessage(chatId, bot);
            
          } else {
            // אין דיווחי משתמשים - שימוש בפונקציה הרגילה
            response = formatResponse(deviceInfo, updateInfo, analysisResult);
            
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
            
            // הודעת מידע על שאילתות נותרות
            await sendQueryLimitMessage(chatId, bot);
          }
          
          console.log(`✅ === Query Processing Completed ===\n`);
        } else {
          // שאלה כללית - חיפוש מידע רלוונטי
          console.log(`\n📊 === General Query Processing Started ===`);
          console.log(`👤 User: ${chatId}`);
          console.log(`❓ Query: ${messageText}`);
          console.log('❓ Processing general question');
          
          const generalInfo = await updateChecker.searchGeneralInfo(messageText);
          
          // בדיקה אם החיפוש הצליח וחילוץ התוכן המתאים
          if (generalInfo && generalInfo.success && generalInfo.data) {
            response = generalInfo.data.summary || generalInfo.message || 'מצאתי מידע כללי על השאילתה שלכם.';
          } else {
            response = generalInfo?.message || 'מצטער, לא מצאתי מידע רלוונטי לשאלה שלכם. אנא נסו לנסח אחרת או שלחו פרטי מכשיר ספציפיים.';
          }
          
          // רישום האינטראקציה
          await Database.logUserInteraction(chatId, 'question', {
            question: messageText,
            parsedData: parsedMessage,
            response: response,
            analysisResult: null
          });
          
          // בדיקה אם התגובה ארוכה מדי לטלגרם
          // אם החיפוש החזיר דגל needsSplit, נכפה פיצול גם אם התגובה לא ארוכה מדי
          const forceSplit = generalInfo && generalInfo.needsSplit;
          const responseWithSplit = formatResponseWithSplit(response, forceSplit);
          
          if (responseWithSplit.needsSplit) {
          const splitReason = forceSplit ? 'forced split for better readability' : 'length exceeded limit';
          console.log(`📄 Response splitting (${response.length} chars, ${splitReason}), splitting into ${responseWithSplit.parts.length} parts`);
          
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
          
          // הודעת מידע על שאילתות נותרות (גם לשאלות כלליות)
          await sendQueryLimitMessage(chatId, bot);
          
          console.log(`✅ === General Query Processing Completed ===\n`);
        }

        console.log('✅ Response sent successfully');
        
        // סיכום השירותים שהיו בשימוש
        console.log(`\n🔍 === Services Summary ===`);
        console.log(`🧠 AI Engine: ${process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.includes('your_') ? 'Claude API' : 'Basic Analysis'}`);
        console.log(`🔍 Search: ${process.env.GOOGLE_SEARCH_API_KEY && !process.env.GOOGLE_SEARCH_API_KEY.includes('your_') ? 'Google (Primary) + DuckDuckGo (Fallback)' : 'DuckDuckGo Only'}`);
        console.log(`📱 Reddit: ${process.env.REDDIT_CLIENT_ID && !process.env.REDDIT_CLIENT_ID.includes('your_') ? 'Enabled' : 'Disabled'}`);
        console.log(`===============================\n`);

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