const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const { parseUserMessage, formatResponseWithUserReports } = require('../common/utils');

// Initialize analyzers
const deviceAnalyzer = new DeviceAnalyzer();
const updateChecker = new UpdateChecker();
const recommendationEngine = new RecommendationEngine();

/**
 * Handle general message updates from users
 */
async function handleUpdate(bot, msg) {
    if (msg.text && msg.text.startsWith('/')) return; // Skip commands
    
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
                await bot.editMessageText(messagesArray[i], { 
                    chat_id: chatId, 
                    message_id: waitingMsg.message_id, 
                    parse_mode: 'HTML', 
                    disable_web_page_preview: true 
                });
            } else {
                await bot.sendMessage(chatId, messagesArray[i], { 
                    parse_mode: 'HTML', 
                    disable_web_page_preview: true 
                });
            }
            if (i < messagesArray.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

    } catch (error) {
        console.error('❌ Error processing message:', error.stack);
        const errorMessage = `❌ An error occurred: ${error.message}\nPlease try again.`;
        if (waitingMsg) {
            await bot.editMessageText(errorMessage, { 
                chat_id: chatId, 
                message_id: waitingMsg.message_id 
            });
        } else {
            await bot.sendMessage(chatId, errorMessage);
        }
    }
}

/**
 * Handle callback queries (inline keyboard responses)
 */
async function handleCallbackQuery(bot, callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
        // Acknowledge the callback query
        await bot.answerCallbackQuery(callbackQuery.id);

        // Handle different callback data
        if (data === 'more_info') {
            await bot.sendMessage(chatId, '📱 For more detailed information, please ask specific questions about your device updates.');
        } else if (data === 'check_again') {
            await bot.sendMessage(chatId, '🔄 Please send me your device information again to check for updates.');
        } else {
            await bot.sendMessage(chatId, '❓ Unknown action. Please try again.');
        }
    } catch (error) {
        console.error('❌ Error handling callback query:', error.message);
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'An error occurred. Please try again.',
            show_alert: true
        });
    }
}

/**
 * Handle /mydevice command - show user's device info
 */
async function handleMyDeviceInfo(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        const userDeviceInfo = `
📱 *Your Device Information*

To get personalized update advice, please tell me:
• Device manufacturer (Samsung, Google, etc.)
• Device model (Galaxy S23, Pixel 7, etc.)
• Current Android version

Example: "Samsung Galaxy S23 Android 14"
        `;
        
        await bot.sendMessage(chatId, userDeviceInfo, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Error handling mydevice command:', error.message);
        await bot.sendMessage(chatId, '❌ An error occurred while fetching device information.');
    }
}

module.exports = {
    handleUpdate,
    handleCallbackQuery,
    handleMyDeviceInfo
};