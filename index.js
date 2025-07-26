require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot...');

function logAvailableServices() {
  console.log('\n📊 === Service Configuration ===');
  const hasClaude = process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.includes('your_');
  const hasGoogle = process.env.GOOGLE_SEARCH_API_KEY && !process.env.GOOGLE_SEARCH_ENGINE_ID && !process.env.GOOGLE_SEARCH_API_KEY.includes('your_');
  const hasMongo = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('your_');

  console.log(`🧠 AI Engine: ${hasClaude ? 'Claude API ✅' : 'Basic Analysis ⚠️'}`);
  console.log(`🔍 Search Engine: ${hasGoogle ? 'Google Custom Search API ✅' : '⚠️ (Not Configured - Search will fail)'}`);
  console.log(`💾 Database: ${hasMongo ? 'MongoDB ✅' : '⚠️ (Not Configured)'}`);
  console.log('=======================================\n');
}

logAvailableServices();

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('./common/deviceAnalyzer');
const UpdateChecker = require('./common/updateChecker');
const RecommendationEngine = require('./common/recommendationEngine');
const Database = require('./common/database');
const { formatResponseWithUserReports, parseUserMessage } = require('./common/utils');
const Scheduler = require('./scheduler');

process.on('uncaughtException', (error) => { console.error('Uncaught Exception:', error.stack); });
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection:', reason); });

const app = express();
const PORT = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.WEBHOOK_URL;

if (!token) {
    console.error('FATAL ERROR: TELEGRAM_BOT_TOKEN must be set.');
    process.exit(1);
}

async function initializeBot() {
  try {
    await Database.connect();
    
    let bot;
    if (process.env.NODE_ENV === 'production' && url) {
        console.log('🚀 Production mode: Initializing bot with Webhook.');
        bot = new TelegramBot(token);
        bot.setWebHook(`${url}/bot${token}`).catch(err => console.error('Webhook Error:', err.message));
        app.post(`/bot${token}`, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });
    } else {
        console.log('🚀 Development mode: Initializing bot with Polling.');
        const tempBot = new TelegramBot(token);
        await tempBot.deleteWebHook().catch(() => {}); // Attempt to delete webhook to prevent conflict
        bot = new TelegramBot(token, { polling: true });
    }

    // ================================================================
    // התיקון נמצא כאן
    // ================================================================
    const scheduler = new Scheduler(bot); // יצירת מופע ישירות מהקלאס שיובא
    scheduler.startAll();

    const deviceAnalyzer = new DeviceAnalyzer();
    const updateChecker = new UpdateChecker();
    const recommendationEngine = new RecommendationEngine();

    console.log('🤖 Bot initialized successfully.');

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, '🤖 Welcome! Ask me if you should update your Android device.\nExample: "Should I update Samsung Galaxy S23 to Android 15?"', { parse_mode: 'Markdown' });
    });

    bot.on('message', async (msg) => {
        if (msg.text && msg.text.startsWith('/')) return;
        if (!msg.text) return;

        const chatId = msg.chat.id;
        console.log(`\n\n📩 New message from ${chatId}: ${msg.text}`);
        let waitingMsg;
        try {
            waitingMsg = await bot.sendMessage(chatId, '⏳ Searching for information, please wait...');
            const parsedMessage = parseUserMessage(msg.text);
            console.log('📋 Parsed message:', parsedMessage);

            if (!parsedMessage.device || !parsedMessage.version) {
                throw new Error("Could not identify device and version from your message. Please be more specific, e.g., 'Samsung S23 Android 15'.");
            }

            const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedMessage.device);
            const updateInfo = await updateChecker.checkForUpdates(deviceInfo, parsedMessage);
            const analysisResult = await recommendationEngine.generateRecommendation(deviceInfo, updateInfo, parsedMessage);
            const messagesArray = formatResponseWithUserReports(deviceInfo, updateInfo, analysisResult);
            
            console.log(`✅ Found ${messagesArray.length} message parts to send.`);
            for (let i = 0; i < messagesArray.length; i++) {
                const options = { parse_mode: 'HTML', disable_web_page_preview: true };
                if (i === 0 && waitingMsg) {
                    await bot.editMessageText(messagesArray[i], { chat_id: chatId, message_id: waitingMsg.message_id, ...options });
                } else {
                    await bot.sendMessage(chatId, messagesArray[i], options);
                }
                if (i < messagesArray.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('❌ Error processing message:', error.stack);
            const errorMessage = `❌ An error occurred: ${error.message}\nPlease try again.`;
            if (waitingMsg) {
                await bot.editMessageText(errorMessage, { chat_id: chatId, message_id: waitingMsg.message_id });
            } else {
                await bot.sendMessage(chatId, errorMessage);
            }
        }
    });

    bot.on('polling_error', (error) => console.error(`Polling Error: ${error.code} - ${error.message}.`));

  } catch (error) {
    console.error('Failed to initialize bot:', error.stack);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});

// Delay initialization to allow server to start
setTimeout(initializeBot, 2000);
