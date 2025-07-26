#!/usr/bin/env node

// סקריפט להרצת משימות cron בלי להפעיל את הבוט הראשי
require('dotenv').config();

console.log('🔧 CRON TASK MODE ACTIVATED');
console.log('🚫 Bot initialization is COMPLETELY DISABLED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const scheduler = require('../common/scheduler');

// פונקציה להרצת משימה ספציפית
async function runTask(taskName) {
  console.log(`🔧 Running cron task: ${taskName}`);
  console.log(`⏰ Task started at: ${new Date().toISOString()}`);
  
  try {
    const schedulerInstance = new scheduler();
    
    switch (taskName) {
      case 'daily':
        await schedulerInstance.runTaskNow('daily');
        console.log('✅ Daily task completed successfully');
        break;
        
      case 'weekly':
        await schedulerInstance.runTaskNow('weekly');
        console.log('✅ Weekly task completed successfully');
        break;
        
      case 'monthly':
        await schedulerInstance.runTaskNow('monthly');
        console.log('✅ Monthly task completed successfully');
        break;
        
      case 'popular-check':
        await schedulerInstance.runTaskNow('popular-check');
        console.log('✅ Popular devices check completed successfully');
        break;
        
      default:
        console.error(`❌ Unknown task: ${taskName}`);
        console.log('📋 Available tasks: daily, weekly, monthly, popular-check');
        process.exit(1);
    }
    
    console.log(`⏰ Task completed at: ${new Date().toISOString()}`);
    console.log('✅ Cron task execution finished successfully');
    
  } catch (error) {
    console.error(`❌ Error running task ${taskName}:`, error?.message || error);
    process.exit(1);
  }
}

// קבלת שם המשימה מארגומנטים
const taskName = process.argv[2];

if (!taskName) {
  console.error('❌ No task name provided');
  console.log('📋 Usage: node cron-task.js <task-name>');
  console.log('📋 Available tasks: daily, weekly, monthly, popular-check');
  process.exit(1);
}

// הרצת המשימה
runTask(taskName);