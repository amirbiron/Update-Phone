const { CronJob } = require('cron');
const Database = require('../common/database');
const { logMessageSplit } = require('../common/utils');

class Scheduler {
  constructor(bot) {
    this.bot = bot;
    // הגדרת המשימות מבלי להפעיל אותן מיד
    this.jobs = {
      'daily-stats': new CronJob('0 9 * * *', () => this.sendDailyStats(), null, false, 'Asia/Jerusalem'),
      'weekly-cleanup': new CronJob('0 0 * * 0', () => this.cleanupOldLogs(), null, false, 'Asia/Jerusalem'),
      'popular-updates': new CronJob('0 12 * * 1', () => this.reportPopularUpdates(), null, false, 'Asia/Jerusalem'),
      'monthly-report': new CronJob('0 10 1 * *', () => this.sendMonthlyReport(), null, false, 'Asia/Jerusalem'),
    };
  }

  startAll() {
    console.log('🚀 Starting all scheduled tasks...');
    Object.entries(this.jobs).forEach(([name, job]) => {
      try {
        job.start();
        console.log(`✅ Started ${name} task.`);
      } catch (e) {
        console.error(`❌ Failed to start ${name} task: ${e.message}`);
      }
    });
  }

  stopAll() {
    console.log('🛑 Stopping scheduled tasks...');
    Object.entries(this.jobs).forEach(([name, job]) => {
      try {
        job.stop();
        console.log(`✅ Stopped ${name} task`);
      } catch (e) {
        console.error(`❌ Failed to stop ${name} task: ${e.message}`);
      }
    });
  }

  async sendDailyStats() {
    console.log('📊 Running daily stats task...');
    try {
      const count = await Database.getUserCount();
      const adminId = process.env.ADMIN_ID;
      if (adminId) {
        await this.bot.sendMessage(adminId, `📊 **Daily Stats:**\nTotal users: ${count}`);
      }
    } catch (error) {
      console.error('Error in daily stats task:', error.message);
    }
  }

  async cleanupOldLogs() {
    console.log('🧹 Running weekly cleanup task...');
    try {
      const result = await Database.cleanupOldLogs();
      console.log(`Cleanup finished. Deleted ${result.deletedCount} old logs.`);
    } catch (error) {
      console.error('Error in weekly cleanup task:', error.message);
    }
  }

  async reportPopularUpdates() {
    console.log('📈 Running popular updates task...');
    try {
      const popularUpdates = await Database.getPopularUpdates();
      const adminId = process.env.ADMIN_ID;
      if (adminId && popularUpdates.length > 0) {
        let message = '📈 **Most Queried Updates This Week:**\n';
        popularUpdates.forEach(update => {
          message += `- ${update.device} | ${update.version} (${update.count} queries)\n`;
        });
        await this.bot.sendMessage(adminId, message);
      }
    } catch (error) {
      console.error('Error in popular updates task:', error.message);
    }
  }

  async sendMonthlyReport() {
    console.log('📅 Running monthly report task...');
    try {
        const report = await Database.getMonthlyReport();
        const adminId = process.env.ADMIN_ID;
        if (adminId) {
            const message = `
📅 **Monthly Report**
- Total Users: ${report.totalUsers}
- New Users This Month: ${report.newUsers}
- Total Queries: ${report.totalQueries}
            `;
            await this.bot.sendMessage(adminId, message.trim());
        }
    } catch (error) {
        console.error('Error in monthly report task:', error.message);
    }
  }
}

module.exports = Scheduler;
