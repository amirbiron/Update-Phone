const { getDeviceDetails } = require('../common/utils');
const { sendLongMessage, removeMarkdownFormatting } = require('../common/utils');

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
פרטי המכשיר (דוגמה): ${deviceDetails.name}

המלצה:
${deviceDetails.recommendation}
        `;
        // Use sendLongMessage which now automatically removes markdown
        await sendLongMessage(bot, chatId, message);
    }
}

module.exports = {
    handleUpdate,
    handleCallbackQuery,
    handleMyDeviceInfo
};