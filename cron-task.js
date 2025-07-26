#!/usr/bin/env node

// סקריפט להרצת משימות cron בלי להפעיל את הבוט הראשי
require('dotenv').config();

// הגדרת משתני סביבה מרובים כדי למנוע מהבוט הראשי להתחיל
process.env.RUN_TASK_NOW = 'true';
process.env.CRON_MODE = 'true';
process.env.SCHEDULED_JOB = 'true';

console.log('🔧 CRON TASK MODE ACTIVATED');
console.log('🚫 Bot initialization is COMPLETELY DISABLED');
console.log('📋 Environment flags set:');
console.log(`   - RUN_TASK_NOW: ${process.env.RUN_TASK_NOW}`);
console.log(`   - CRON_MODE: ${process.env.CRON_MODE}`);
console.log(`   - SCHEDULED_JOB: ${process.env.SCHEDULED_JOB}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const scheduler = require('./src/scheduler');

// פונקציה להרצת משימה ספציפית
async function runTask(taskName) {
  console.log(`🔧 Running cron task: ${taskName}`);
  console.log(`⏰ Task started at: ${new Date().toISOString()}`);
  
  try {
    switch (taskName) {
      case 'daily':
        await scheduler.runTaskNow('daily');
        console.log('✅ Daily task completed successfully');
        break;
        
      case 'weekly':
        await scheduler.runTaskNow('weekly');
        console.log('✅ Weekly task completed successfully');
        break;
        
      case 'monthly':
        await scheduler.runTaskNow('monthly');
        console.log('✅ Monthly task completed successfully');
        break;
        
      case 'popular-check':
        await scheduler.runTaskNow('popular-check');
        console.log('✅ Popular devices check completed successfully');
        break;
        
      default:
        console.error(`❌ Unknown task: ${taskName}`);
        console.log('📋 Available tasks: daily, weekly, monthly, popular-check');
        process.exit(1);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Cron task finished successfully');
    console.log(`⏰ Task completed at: ${new Date().toISOString()}`);
    process.exit(0);
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Cron task failed:', error?.message || error);
    console.error(`⏰ Task failed at: ${new Date().toISOString()}`);
    if (error.stack) {
      console.error('📋 Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// קבלת שם המשימה מהארגומנטים
const taskName = process.argv[2];

if (!taskName) {
  console.error('❌ Please specify a task name');
  console.log('📋 Usage: node cron-task.js <task-name>');
  console.log('📋 Available tasks: daily, weekly, monthly, popular-check');
  console.log('📋 Example: node cron-task.js daily');
  process.exit(1);
}

// הרצת המשימה
runTask(taskName);