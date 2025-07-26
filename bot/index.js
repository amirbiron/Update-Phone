require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot...');

// בדיקת תצורת APIs זמינים
function logAvailableServices() {
  console.log('\n📊 === תצורת שירותים זמינים ===');
  
  // בדיקת Claude AI
  if (process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.includes('your_')) {
    console.log('🧠 AI Engine: Claude API ✅ (Configured)');
  } else {
    console.log('🧠 AI Engine: Basic Analysis ⚠️ (Claude not configured)');
  }
  
  // בדיקת Google Search API
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID && 
      !process.env.GOOGLE_SEARCH_API_KEY.includes('your_') && 
      !process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_')) {
    console.log('🔍 Search Engine: Google Custom Search API ✅ (Primary)');
  } else {
    console.log('🔍 Search Engine: ⚠️ (Google not configured - search will fail)');
  }
  
  // בדיקת MongoDB
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('your_')) {
    console.log('💾 Database: MongoDB ✅ (Connected)');
  } else {
    console.log('💾 Database: ⚠️ (Not configured)');
  }
  
  console.log('=======================================\n');
}

logAvailableServices();

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const Database = require('../common/database');
const { formatResponseWithUserReports, parseUserMessage, logMessageSplit } = require('../common/utils');

// ... (כל קוד העזר והפקודות נשאר זהה)

async function sendQueryLimitMessage(chatId, bot) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const queryLimitInfo = await Database.checkQueryLimit(chatId);
    let statusEmoji = '📊';
    let statusText = '';
    if (queryLimitInfo.remaining === 0) {
      statusEmoji = '🚫';
      statusText = ' (הגעתם למגבלה)';
    } else if (queryLimitInfo.remaining <= 5) {
      statusEmoji = '⚠️';
      statusText = ' (נותרו מעט!)';
    }
    const limitMessage = `${statusEmoji} **שאילתות החודש:** ${queryLimitInfo.remaining}/${queryLimitInfo.limit}${statusText}`;
    await bot.sendMessage(chatId, limitMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error sending query limit message:', error.message);
  }
}

process.on('uncaughtException', (error) => { console.error('Uncaught Exception:', error.message); });
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection:', reason); });

const app = express();
const PORT = process.env.PORT || 3000;

async function initializeBot() {
  try {
    await Database.connect();
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: process.env.NODE_ENV !== 'production' });
    const deviceAnalyzer = new DeviceAnalyzer();
    const updateChecker = new UpdateChecker();
    const recommendationEngine = new RecommendationEngine();

    console.log('🤖 Bot initialized successfully');

    // ... (פקודות /start, /help, /stats וכו' נשארות זהות)
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🤖 **ברוכים הבאים לבוט יועץ עדכוני אנדרואיד!**
אני כאן כדי לעזור לכם להחליט אם כדאי לעדכן את מכשיר האנדרואיד שלכם.
שלחו לי את שם המכשיר והעדכון שאתם שוקלים, לדוגמה:
"כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 15?"
`;
        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });


    bot.on('message', async (msg) => {
      if (msg.text && msg.text.startsWith('/')) return;

      const chatId = msg.chat.id;
      const messageText = msg.text;
      if (!messageText) return;

      console.log(`📩 New message from ${chatId}: ${messageText}`);

      let waitingMsg;
      try {
        waitingMsg = await bot.sendMessage(chatId, '⏳ מאתר מידע, אנא המתינו...');

        const parsedMessage = parseUserMessage(messageText);
        console.log('📋 Parsed message:', parsedMessage);
        
        let deviceInfo;
        let updateInfo;
        let analysisResult;

        if (parsedMessage.device && parsedMessage.version) {
          console.log(`\n📊 === Processing Query ===`);
          deviceInfo = await deviceAnalyzer.analyzeDevice(parsedMessage.device, parsedQuery.version);
          
          // ================================================================
          // כאן התיקון המרכזי: מעבירים את שני האובייקטים כפרמטרים
          // ================================================================
          updateInfo = await updateChecker.checkForUpdates(deviceInfo, parsedMessage);
          
          analysisResult = await recommendationEngine.generateRecommendation(deviceInfo, updateInfo, parsedMessage);
        } else {
          // טיפול בשאלה כללית
          deviceInfo = { device: 'General Inquiry' };
          analysisResult = { recommendation: 'wait', reasoning: 'אנא ספק שם מכשיר וגרסה ספציפיים.' };
          updateInfo = { searchResults: { forumDiscussions: [] } };
        }

        const messagesArray = formatResponseWithUserReports(deviceInfo, updateInfo, analysisResult);
        
        await Database.logUserInteraction(chatId, 'question', {
            question: messageText,
            response: messagesArray[0],
            hasUserReports: messagesArray.length > 1,
        });

        for (let i = 0; i < messagesArray.length; i++) {
          if (i === 0 && waitingMsg) {
            await bot.editMessageText(messagesArray[i], { chat_id: chatId, message_id: waitingMsg.message_id, parse_mode: 'HTML' });
          } else {
            await bot.sendMessage(chatId, messagesArray[i], { parse_mode: 'HTML' });
          }
          if (i < messagesArray.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        await sendQueryLimitMessage(chatId, bot);

      } catch (error) {
        console.error('❌ Error processing message:', error.message);
        const errorMessage = '❌ אירעה שגיאה בעיבוד השאלה. אנא נסו שוב מאוחר יותר.';
        if (waitingMsg) {
          await bot.editMessageText(errorMessage, { chat_id: chatId, message_id: waitingMsg.message_id, parse_mode: 'HTML' });
        } else {
          await bot.sendMessage(chatId, errorMessage, { parse_mode: 'HTML' });
        }
      }
    });

    return bot;
  } catch (error) {
    console.error('Failed to initialize bot:', error.message);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Bot server is running on port ${PORT}`);
});

initializeBot();
