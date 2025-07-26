require('dotenv').config();

console.log('🚀 Android Update Advisor - Main Entry Point');

// בדיקה מוקדמת אם זה הרצת משימה של cron - אם כן, לא להפעיל את הבוט
if (process.env.RUN_TASK_NOW === 'true' || process.env.CRON_MODE === 'true' || process.env.SCHEDULED_JOB === 'true') {
  console.log('🔧 Running in CRON/SCHEDULED mode - bot initialization is DISABLED');
  console.log('📋 Available environment flags:');
  console.log(`   - RUN_TASK_NOW: ${process.env.RUN_TASK_NOW}`);
  console.log(`   - CRON_MODE: ${process.env.CRON_MODE}`);
  console.log(`   - SCHEDULED_JOB: ${process.env.SCHEDULED_JOB}`);
  console.log('🚫 Bot will NOT be started. Exiting immediately.');
  process.exit(0);
}

// בדיקה נוספת - אם זה הרצה של cron-task.js או משימה מתוזמנת
if (process.argv[0].includes('cron-task') || process.argv[1].includes('cron-task')) {
  console.log('🔧 Detected cron-task execution - bot initialization is DISABLED');
  process.exit(0);
}

// בדיקה איזה רכיב להפעיל
const component = process.env.COMPONENT || 'both';

console.log(`📋 Component mode: ${component}`);

switch (component.toLowerCase()) {
  case 'bot':
    console.log('🤖 Starting BOT ONLY mode');
    require('./bot/index.js');
    break;
    
  case 'scheduler':
    console.log('🕒 Starting SCHEDULER ONLY mode');
    require('./scheduler/index.js');
    break;
    
  case 'both':
  default:
    console.log('🔄 Starting BOTH bot and scheduler');
    
    // הפעלת הבוט
    console.log('🤖 Starting bot component...');
    require('./bot/index.js');
    
    // המתנה קצרה ואז הפעלת הסקג'ולר
    setTimeout(() => {
      console.log('🕒 Starting scheduler component...');
      require('./scheduler/index.js');
    }, 2000);
    break;
}
