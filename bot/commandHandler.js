const { getDeviceDetails, getSupportedModels } = require('../common/utils');

function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const supportedModels = getSupportedModels();
    const modelsText = supportedModels.map(m => `- ${m}`).join('\n');
    const welcomeMessage = `
ברוך הבא לבוט עדכון המכשירים! 👋
אני כאן כדי לעזור לך למצוא את המכשיר שמתאים לך.

תוכל להשתמש בפקודה /device ואחריה שם הדגם כדי לקבל מידע.
לדוגמה: \`/device iPhone 15 Pro\`

רשימת הדגמים הנתמכים כרגע:
${modelsText}

בהצלחה!
    `;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

function handleDeviceCommand(bot, msg, match) {
    const chatId = msg.chat.id;
    const modelName = match[1].trim();
    const deviceDetails = getDeviceDetails(modelName);

    if (deviceDetails) {
        const message = `
*פרטי מכשיר: ${deviceDetails.name}*

*יצרן:* ${deviceDetails.manufacturer}
*דגם:* ${deviceDetails.model}
*שנת יציאה:* ${deviceDetails.releaseYear}
*מערכת הפעלה:* ${deviceDetails.os}

*המלצה:*
${deviceDetails.recommendation}
        `;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `מצטער, לא מצאתי מידע על הדגם "${modelName}". נסה דגם אחר מהרשימה הנתמכת.`);
    }
}

module.exports = {
    handleStart,
    handleDeviceCommand,
};