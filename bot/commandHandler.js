const DeviceAnalyzer = require('../common/deviceAnalyzer');
const UpdateChecker = require('../common/updateChecker');
const RecommendationEngine = require('../common/recommendationEngine');
const { parseUserMessage, formatResponseWithUserReports } = require('../common/utils');

// Initialize analyzers
const deviceAnalyzer = new DeviceAnalyzer();
const updateChecker = new UpdateChecker();
const recommendationEngine = new RecommendationEngine();

/**
 * Handle /start command
 */
async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        const welcomeMessage = `
🤖 *Welcome to Android Update Advisor!*

I'm here to help you decide whether you should update your Android device.

*How to use:*
• Send me your device info like: "Samsung Galaxy S23 Android 14"
• Ask: "Should I update to Android 15?"
• Get personalized recommendations

*Available commands:*
/start - Show this welcome message
/device [device name] - Get specific device information
/mydevice - Show your device info template

*Example questions:*
• "Samsung S23 Android 14 to 15"
• "Should I update Pixel 7 to Android 14?"
• "Galaxy A54 Android 13 update"

Let's get started! 🚀
        `;
        
        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Error handling start command:', error.message);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
}

/**
 * Handle /device command with device name parameter
 */
async function handleDeviceCommand(bot, msg, match) {
    const chatId = msg.chat.id;
    const deviceQuery = match[1]; // Extract device name from regex match
    
    if (!deviceQuery) {
        await bot.sendMessage(chatId, '❓ Please specify a device name. Example: /device Samsung Galaxy S23');
        return;
    }

    let waitingMsg;
    try {
        waitingMsg = await bot.sendMessage(chatId, '🔍 Searching for device information...');

        // Parse the device query
        const parsedMessage = parseUserMessage(deviceQuery);
        console.log('📋 Parsed device command:', parsedMessage);
        
        if (!parsedMessage.device) {
            throw new Error("Could not identify the device. Please be more specific, e.g., '/device Samsung Galaxy S23'.");
        }

        // Analyze the device
        const deviceInfo = await deviceAnalyzer.analyzeDevice(parsedMessage.device);
        
        if (!deviceInfo.isValid) {
            throw new Error(`Could not find information about "${deviceQuery}". Please check the device name and try again.`);
        }

        // Create device information message
        const deviceMessage = `
📱 *${deviceInfo.manufacturer} ${deviceInfo.device}*

*Device Information:*
• Model: ${deviceInfo.model || 'Unknown'}
• Latest Android: ${deviceInfo.latestAndroid || 'Unknown'}
• Security Updates: ${deviceInfo.securitySupport || 'Unknown'}
• Release Year: ${deviceInfo.releaseYear || 'Unknown'}

*To get update recommendations:*
Send me a message like: "${deviceInfo.manufacturer} ${deviceInfo.device} Android [your current version]"

Example: "${deviceInfo.manufacturer} ${deviceInfo.device} Android 13"
        `;

        await bot.editMessageText(deviceMessage, {
            chat_id: chatId,
            message_id: waitingMsg.message_id,
            parse_mode: 'Markdown'
        });

    } catch (error) {
        console.error('❌ Error handling device command:', error.stack);
        const errorMessage = `❌ ${error.message}`;
        
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

module.exports = {
    handleStart,
    handleDeviceCommand
};