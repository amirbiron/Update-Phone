const { getDeviceDetails } = require('../common/utils');
const { sendLongMessage } = require('../common/utils');

function handleUpdate(bot, msg) {
    const chatId = msg.chat.id;
    if (msg.text && !msg.text.startsWith('/')) {
        // You can add a default reply here if you want
    }
}

function handleCallbackQuery(bot, callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    bot.answerCallbackQuery(callbackQuery.id);
    bot.sendMessage(chatId, `בחרת: ${data}`);
}

async function handleMyDeviceInfo(bot, msg) {
    const chatId = msg.chat.id;
    const defaultDevice = "iPhone 14 Pro"; // Example
    const deviceDetails = getDeviceDetails(defaultDevice);
    if (deviceDetails) {
        const message = `
*פרטי המכשיר (דוגמה): ${deviceDetails.name}*

*המלצה:*
${deviceDetails.recommendation}
        `;
        // Use sendLongMessage instead of bot.sendMessage for device info
        await sendLongMessage(bot, chatId, message, { parse_mode: 'Markdown' });
    }
}

module.exports = {
    handleUpdate,
    handleCallbackQuery,
    handleMyDeviceInfo
};