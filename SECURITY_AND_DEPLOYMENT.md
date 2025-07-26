# Security Updates and Bot Conflict Prevention

## עדכוני אבטחה שבוצעו

### 1. עדכון חבילות ישנות ופגיעות אבטחה

#### החבילות שעודכנו:
- **node-telegram-bot-api**: עודכן מ-0.64.0 ל-0.66.0
- **axios**: עודכן מ-1.6.2 ל-1.7.9  
- **express**: עודכן מ-4.18.2 ל-4.21.2
- **mongoose**: עודכן מ-8.0.3 ל-8.16.5
- **puppeteer**: עודכן מ-22.8.2 ל-24.15.0
- **playwright**: עודכן מ-1.40.0 ל-1.54.1
- **dotenv**: עודכן מ-16.3.1 ל-16.4.7
- **cheerio**: עודכן מ-1.0.0-rc.12 ל-1.1.2
- **nodemon**: עודכן מ-3.0.2 ל-3.1.9

#### שימוש ב-npm overrides:
```json
"overrides": {
  "uuid": "^10.0.0",
  "tough-cookie": "^5.0.0", 
  "form-data": "^4.0.1",
  "request": "^2.88.2"
}
```

#### תוצאות העדכון:
- **לפני**: 6 פגיעויות (2 קריטיות, 4 בינוניות)
- **אחרי**: 4 פגיעויות בינוניות בלבד

הפגיעויות הנותרות קשורות לחבילת `request` הישנה ב-`node-telegram-bot-api`, אך הן בינוניות בלבד ולא קריטיות.

### 2. מניעת קונפליקטים בין מופעי הבוט

#### בעיות שטופלו:
- מניעת הפעלת מספר מופעים של הבוט במקביל
- הפרדה בין הבוט הראשי למשימות cron
- זיהוי וטיפול בקונפליקטים אוטומטית

#### שינויים שבוצעו:

##### ב-`index.js`:
```javascript
// בדיקה אם זה הרצת משימה של cron - אם כן, לא להפעיל את הבוט
if (process.env.RUN_TASK_NOW === 'true') {
  console.log('🔧 Running as cron task - bot will not be initialized');
  process.exit(0);
}
```

##### הוספת זיהוי קונפליקטים:
```javascript
bot.on('error', (error) => {
  if (error.code === 'ETELEGRAM' && error.response?.body?.description?.includes('conflict')) {
    console.error('⚠️ Bot conflict detected - another instance might be running!');
    process.exit(1);
  }
});
```

##### ב-`src/scheduler.js`:
```javascript
// הפעלה אוטומטית רק אם לא קוראים ישירות ל-runTaskNow ע"י פקודת cron
if (
  process.env.NODE_ENV !== 'test' &&
  process.env.RUN_TASK_NOW !== 'true'
) {
  scheduler.start();
}
```

#### סקריפט חדש למשימות cron: `cron-task.js`

סקריפט נפרד להרצת משימות cron בלי להפעיל את הבוט הראשי:

```bash
# הרצת משימה יומית
node cron-task.js daily

# הרצת משימה שבועית  
node cron-task.js weekly

# הרצת משימה חודשית
node cron-task.js monthly

# בדיקת מכשירים פופולריים
node cron-task.js popular-check
```

## איך להשתמש במערכת החדשה

### 1. הפעלת הבוט הראשי
```bash
npm start
```

### 2. הגדרת משימות cron (ב-crontab או ב-Render)
```bash
# משימה יומית ב-02:00
0 2 * * * cd /path/to/project && node cron-task.js daily

# משימה שבועית ביום ראשון ב-03:00  
0 3 * * 0 cd /path/to/project && node cron-task.js weekly

# משימה חודשית ב-1 לחודש ב-04:00
0 4 1 * * cd /path/to/project && node cron-task.js monthly

# בדיקת מכשירים פופולריים כל 6 שעות
0 */6 * * * cd /path/to/project && node cron-task.js popular-check
```

### 3. בסביבת Render
הוסף cron jobs בקובץ `render.yaml`:

```yaml
services:
  - type: web
    name: android-bot
    env: node
    buildCommand: npm install
    startCommand: npm start

  - type: cron
    name: daily-task
    env: node
    schedule: "0 2 * * *"
    buildCommand: npm install
    startCommand: node cron-task.js daily

  - type: cron  
    name: weekly-task
    env: node
    schedule: "0 3 * * 0"
    buildCommand: npm install
    startCommand: node cron-task.js weekly
```

## בדיקת תקינות המערכת

### 1. בדיקת פגיעויות אבטחה
```bash
npm audit
```

### 2. בדיקת הפעלת הבוט
```bash
npm start
```

### 3. בדיקת משימות cron
```bash
node cron-task.js daily
```

## הודעות שגיאה חשובות

### קונפליקט בבוט:
```
⚠️ Bot conflict detected - another instance might be running!
🔍 Check if there are multiple bot instances or cron jobs running the main bot code
```

**פתרון**: ודא שרק מופע אחד של הבוט פועל ושמשימות cron משתמשות ב-`cron-task.js`.

### שגיאת polling:
```
⚠️ Polling conflict detected - another bot instance is already running!
```

**פתרון**: עצור את כל מופעי הבוט והפעל רק מופע אחד.

## משתני סביבה חשובים

- `RUN_TASK_NOW=true` - מונע מהבוט הראשי להתחיל (לשימוש במשימות cron)
- `NODE_ENV=production` - משתמש ב-webhooks במקום polling
- `TELEGRAM_BOT_TOKEN` - טוקן הבוט מ-BotFather
- `PORT` - פורט השרת (ברירת מחדל: 3000)