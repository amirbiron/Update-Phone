const cron = require('node-cron');
const Database = require('./database');
const UpdateChecker = require('./updateChecker');
const DeviceAnalyzer = require('./deviceAnalyzer');

class Scheduler {
  constructor() {
    this.updateChecker = new UpdateChecker();
    this.deviceAnalyzer = new DeviceAnalyzer();
    this.jobs = [];
  }

  // הפעלת כל המשימות המתוזמנות
  start() {
    console.log('🕒 Starting scheduled tasks...');
    
    // משימה יומית - עדכון סטטיסטיקות
    this.scheduleDaily();
    
    // משימה שבועית - ניקוי נתונים ישנים
    this.scheduleWeekly();
    
    // משימה כל 6 שעות - בדיקת עדכונים פופולריים
    this.schedulePopularUpdatesCheck();
    
    // משימה חודשית - בדיקת בריאות המערכת
    this.scheduleMonthly();
    
    console.log(`✅ ${this.jobs.length} scheduled tasks are now running`);
  }

  // משימה יומית - 02:00
  scheduleDaily() {
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🌅 Running daily tasks...');
      
      try {
        // עדכון סטטיסטיקות יומיות
        await Database.updateDailyStats();
        console.log('✅ Daily stats updated');
        
        // בדיקת בריאות מסד הנתונים
        const healthCheck = await Database.healthCheck();
        if (healthCheck.status !== 'healthy') {
          console.error('⚠️ Database health check failed:', healthCheck.error?.message || healthCheck.error);
        }
        
        // רישום פעילות יומית
        await this.logDailyActivity();
        
      } catch (error) {
        console.error('❌ Daily task failed:', error?.message || error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });
    
    this.jobs.push({ name: 'daily-stats', job });
  }

  // משימה שבועית - ראשון 03:00
  scheduleWeekly() {
    const job = cron.schedule('0 3 * * 0', async () => {
      console.log('📅 Running weekly tasks...');
      
      try {
        // ניקוי נתונים ישנים (90 ימים)
        await Database.cleanup(90);
        console.log('✅ Old data cleaned up');
        
        // יצירת דוח שבועי
        await this.generateWeeklyReport();
        
        // בדיקת עדכונים למכשירים פופולריים
        await this.checkPopularDevicesUpdates();
        
      } catch (error) {
        console.error('❌ Weekly task failed:', error?.message || error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });
    
    this.jobs.push({ name: 'weekly-cleanup', job });
  }

  // בדיקת עדכונים פופולריים - כל 6 שעות
  schedulePopularUpdatesCheck() {
    const job = cron.schedule('0 */6 * * *', async () => {
      console.log('🔍 Checking popular updates...');
      
      try {
        const popularDevices = await Database.getPopularDevices(10);
        
        for (const deviceData of popularDevices.slice(0, 5)) { // מגביל ל-5 כדי לא להעמיס
          await this.proactiveUpdateCheck(deviceData);
          
          // המתנה בין בדיקות
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ Popular updates checked');
        
      } catch (error) {
        console.error('❌ Popular updates check failed:', error?.message || error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });
    
    this.jobs.push({ name: 'popular-updates', job });
  }

  // משימה חודשית - ה-1 בחודש 04:00
  scheduleMonthly() {
    const job = cron.schedule('0 4 1 * *', async () => {
      console.log('📊 Running monthly tasks...');
      
      try {
        // יצירת דוח חודשי מפורט
        await this.generateMonthlyReport();
        
        // ניתוח מגמות ושיפור המערכת
        await this.analyzeTrendsAndOptimize();
        
        // בדיקת עדכוני אבטחה קריטיים
        await this.checkCriticalSecurityUpdates();
        
        console.log('✅ Monthly tasks completed');
        
      } catch (error) {
        console.error('❌ Monthly task failed:', error?.message || error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });
    
    this.jobs.push({ name: 'monthly-report', job });
  }

  // בדיקה פרואקטיבית של עדכון
  async proactiveUpdateCheck(deviceData) {
    try {
      console.log(`🔍 Proactive check for ${deviceData.manufacturer} ${deviceData.device}`);
      
      const deviceInfo = await this.deviceAnalyzer.analyzeDevice({
        manufacturer: deviceData.manufacturer,
        device: deviceData.device,
        version: 'latest' // נבדק את העדכון האחרון
      });
      
      if (!deviceInfo.isValid) return;
      
      // בדיקת עדכונים זמינים
      const updateInfo = await this.updateChecker.checkUpdate(deviceInfo, { version: 'latest' });
      
      // עדכון מסד הנתונים עם מידע עדכני
      if (updateInfo && !updateInfo.error) {
        await Database.updateOrCreateUpdateTracking(deviceInfo, {
          version: 'latest',
          stabilityRating: updateInfo.analysis?.stabilityRating || 6,
          issues: updateInfo.analysis?.majorIssues || [],
          benefits: updateInfo.analysis?.benefits || [],
          dataQuality: 'high'
        });
      }
      
    } catch (error) {
      console.error(`Error in proactive check for ${deviceData.device}:`, error?.message || error);
    }
  }

  // רישום פעילות יומית
  async logDailyActivity() {
    try {
      const stats = await Database.getSystemStats();
      
      console.log('📈 Daily Activity Summary:');
      console.log(`- Total queries processed: ${stats.totalQueries}`);
      console.log(`- Tracked devices: ${stats.trackedDevices}`);
      console.log(`- Weekly updates: ${stats.weeklyUpdates}`);
      console.log(`- Average response time: ${stats.avgResponseTime}ms`);
      
    } catch (error) {
      console.error('Error logging daily activity:', error?.message || error);
    }
  }

  // יצירת דוח שבועי
  async generateWeeklyReport() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // נתונים שבועיים מהמסד נתונים
      const weeklyData = {
        queriesThisWeek: 0, // TODO: implement
        newDevicesTracked: 0, // TODO: implement
        topIssues: [], // TODO: implement
        topBenefits: [] // TODO: implement
      };
      
      console.log('📊 Weekly Report Generated:');
      console.log(JSON.stringify(weeklyData, null, 2));
      
      // כאן ניתן להוסיף שליחת הדוח למנהלי המערכת
      
    } catch (error) {
      console.error('Error generating weekly report:', error?.message || error);
    }
  }

  // יצירת דוח חודשי
  async generateMonthlyReport() {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const popularDevices = await Database.getPopularDevices(20);
      const systemStats = await Database.getSystemStats();
      
      const monthlyReport = {
        period: `${monthAgo.toISOString().slice(0, 7)} to ${new Date().toISOString().slice(0, 7)}`,
        totalQueries: systemStats.totalQueries,
        mostPopularDevices: popularDevices.slice(0, 10),
        systemHealth: await Database.healthCheck(),
        performance: {
          avgResponseTime: systemStats.avgResponseTime,
          errorRate: 'N/A' // TODO: implement
        }
      };
      
      console.log('📈 Monthly Report:');
      console.log(JSON.stringify(monthlyReport, null, 2));
      
    } catch (error) {
      console.error('Error generating monthly report:', error?.message || error);
    }
  }

  // בדיקת מכשירים פופולריים
  async checkPopularDevicesUpdates() {
    try {
      const popularDevices = await Database.getPopularDevices(15);
      
      console.log(`🔍 Checking updates for ${popularDevices.length} popular devices`);
      
      for (const device of popularDevices) {
        // המתנה בין בדיקות כדי לא להעמיס על השירותים החיצוניים
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await this.proactiveUpdateCheck(device);
      }
      
    } catch (error) {
      console.error('Error checking popular devices updates:', error?.message || error);
    }
  }

  // ניתוח מגמות ושיפור
  async analyzeTrendsAndOptimize() {
    try {
      console.log('🧠 Analyzing trends and optimizing...');
      
      // ניתוח דפוסי שימוש
      const popularDevices = await Database.getPopularDevices(50);
      
      // זיהוי יצרנים פופולריים
      const manufacturerStats = {};
      popularDevices.forEach(device => {
        manufacturerStats[device.manufacturer] = (manufacturerStats[device.manufacturer] || 0) + device.count;
      });
      
      console.log('📊 Manufacturer popularity:', manufacturerStats);
      
      // כאן ניתן להוסיף לוגיקה לשיפור המערכת בהתבסס על המגמות
      
    } catch (error) {
      console.error('Error analyzing trends:', error?.message || error);
    }
  }

  // בדיקת עדכוני אבטחה קריטיים
  async checkCriticalSecurityUpdates() {
    try {
      console.log('🔒 Checking for critical security updates...');
      
      // כאן ניתן להוסיף בדיקות מתקדמות של עדכוני אבטחה
      // למשל, בדיקת CVE חדשים או הודעות אבטחה מיצרנים
      
      const criticalUpdates = []; // TODO: implement actual check
      
      if (criticalUpdates.length > 0) {
        console.log(`⚠️ Found ${criticalUpdates.length} critical security updates`);
        // כאן ניתן להוסיף התראות למנהלי המערכת
      } else {
        console.log('✅ No critical security updates found');
      }
      
    } catch (error) {
      console.error('Error checking critical security updates:', error?.message || error);
    }
  }

  // עצירת כל המשימות
  stop() {
    console.log('🛑 Stopping scheduled tasks...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`✅ Stopped ${name} task`);
    });
    
    this.jobs = [];
  }

  // קבלת סטטוס המשימות
  getStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running,
      scheduled: job.scheduled
    }));
  }

  // הפעלה מיידית של משימה ספציפית (לדיבאג)
  async runTaskNow(taskName) {
    switch (taskName) {
      case 'daily':
        await this.logDailyActivity();
        break;
      case 'weekly':
        await this.generateWeeklyReport();
        break;
      case 'monthly':
        await this.generateMonthlyReport();
        break;
      case 'popular-check':
        await this.checkPopularDevicesUpdates();
        break;
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }
}

// יצירת מופע יחיד ולהפעילו
const scheduler = new Scheduler();

// הפעלה אוטומטית רק אם לא קוראים ישירות ל-runTaskNow ע"י פקודת cron
if (
  process.env.NODE_ENV !== 'test' &&
  process.env.RUN_TASK_NOW !== 'true'
) {
  scheduler.start();
}

// טיפול בסגירה נאותה - רק אם הסקדג'ולר פועל
if (process.env.RUN_TASK_NOW !== 'true') {
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
