require('dotenv').config();

console.log('🤖 Starting Android Update Advisor Bot in Webhook mode...');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const { parseUserMessage, formatResponseWithUserReports } = require('../common/utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const port = process.env.PORT || 3000;
const url = process.env.WEBHOOK_URL; 

if (!token || !url) {
    console.error('FATAL ERROR: TELEGRAM_BOT_TOKEN and WEBHOOK_URL must be set in environment variables.');
    process.exit(1);
}

const bot = new TelegramBot(token);
const app = express();

app.use(express.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.setWebHook(`${url}/bot${token}`)
  .then(() => {
    console.log(`✅ Webhook set successfully to ${url}`);
  })
  .catch((error) => {
    console.error('❌ Error setting webhook:', error.message);
  });

const deviceAnalyzer = new DeviceAnalyzer();
const updateChecker = new UpdateChecker();
const recommendationEngine = new RecommendationEngine();

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '🤖 Welcome! Ask me if you should update your Android device.\nExample: "Should I update Samsung Galaxy S23 to Android 15?"', { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const messageText = msg.text;
    if (!messageText) return;

    console.log(`\n\n📩 New message from ${chatId}: ${messageText}`);

    let waitingMsg;
    try {
        waitingMsg = await bot.sendMessage(chatId, '⏳ Searching for information, please wait...');

        const parsedMessage = parseUserMessage(messageText);
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
            if (i === 0 && waitingMsg) {
                await bot.editMessageText(messagesArray[i], { chat_id: chatId, message_id: waitingMsg.message_id, parse_mode: 'HTML', disable_web_page_preview: true });
            } else {
                await bot.sendMessage(chatId, messagesArray[i], { parse_mode: 'HTML', disable_web_page_preview: true });
            }
            if (i < messagesArray.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
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

app.listen(port, () => {
    console.log(`🚀 Bot server is listening on port ${port}`);
});
