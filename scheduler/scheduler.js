const cron = require('node-cron');

class Scheduler {
    constructor(bot) {
        this.bot = bot;
        this.subscribedChatIds = [];
    }

    dailyUpdateTask() {
        return cron.schedule('0 9 * * *', () => {
            console.log('Running daily update task...');
            if (this.subscribedChatIds.length > 0) {
                const message = 'בוקר טוב! 👋 זכור לבדוק אם יש עדכונים חדשים למכשיר שלך היום.';
                this.subscribedChatIds.forEach(chatId => {
                    this.bot.sendMessage(chatId, message).catch(err => {
                        console.error(`Failed to send message to ${chatId}:`, err.message);
                    });
                });
            }
        }, {
            scheduled: false,
            timezone: "Asia/Jerusalem"
        });
    }
    
    startAll() {
        this.dailyUpdate = this.dailyUpdateTask();
        this.dailyUpdate.start();
        console.log('Scheduler started with all tasks.');
    }
}

module.exports = Scheduler;