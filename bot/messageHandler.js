const { getDeviceDetails } = require('../common/utils');

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

function handleMyDeviceInfo(bot, msg) {
    const chatId = msg.chat.id;
    const defaultDevice = "iPhone 14 Pro"; // Example
    const deviceDetails = getDeviceDetails(defaultDevice);
    if (deviceDetails) {
        const message = `
*פרטי המכשיר (דוגמה): ${deviceDetails.name}*

*המלצה:*
${deviceDetails.recommendation}
        `;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
}

module.exports = {
    handleUpdate,
    handleCallbackQuery,
    handleMyDeviceInfo
};