#!/usr/bin/env node

// סקריפט להרצת משימות cron בלי להפעיל את הבוט הראשי
require('dotenv').config();

// הגדרת משתנה סביבה כדי למנוע מהבוט הראשי להתחיל
process.env.RUN_TASK_NOW = 'true';

const scheduler = require('./src/scheduler');

// פונקציה להרצת משימה ספציפית
async function runTask(taskName) {
  console.log(`🔧 Running cron task: ${taskName}`);
  
  try {
    switch (taskName) {
      case 'daily':
        await scheduler.runTaskNow('daily');
        console.log('✅ Daily task completed');
        break;
        
      case 'weekly':
        await scheduler.runTaskNow('weekly');
        console.log('✅ Weekly task completed');
        break;
        
      case 'monthly':
        await scheduler.runTaskNow('monthly');
        console.log('✅ Monthly task completed');
        break;
        
      case 'popular-check':
        await scheduler.runTaskNow('popular-check');
        console.log('✅ Popular devices check completed');
        break;
        
      default:
        console.error(`❌ Unknown task: ${taskName}`);
        console.log('Available tasks: daily, weekly, monthly, popular-check');
        process.exit(1);
    }
    
    console.log('🎉 Cron task finished successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cron task failed:', error?.message || error);
    process.exit(1);
  }
}

// קבלת שם המשימה מהארגומנטים
const taskName = process.argv[2];

if (!taskName) {
  console.error('❌ Please specify a task name');
  console.log('Usage: node cron-task.js <task-name>');
  console.log('Available tasks: daily, weekly, monthly, popular-check');
  process.exit(1);
}

// הרצת המשימה
runTask(taskName);