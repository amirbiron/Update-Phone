# מבנה הפרויקט החדש - Android Update Advisor Bot

## סקירה כללית

הפרויקט הופרד לשלושה רכיבים עיקריים:
- **Bot** - הבוט של טלגרם
- **Scheduler** - משימות מתוזמנות
- **Common** - קבצים משותפים

## מבנה התיקיות

```
├── bot/                    # רכיב הבוט
│   └── index.js           # קובץ הכניסה לבוט
├── scheduler/             # רכיב הסקג'ולר
│   ├── index.js          # קובץ הכניסה לסקג'ולר
│   └── cron-task.js      # הרצת משימות cron בודדות
├── common/               # קבצים משותפים
│   ├── database.js       # ניהול מסד נתונים
│   ├── deviceAnalyzer.js # ניתוח מכשירים
│   ├── recommendationEngine.js # מנוע המלצות
│   ├── scheduler.js      # לוגיקת הסקג'ולר
│   ├── updateChecker.js  # בדיקת עדכונים
│   └── utils.js         # כלים משותפים
├── index.js             # קובץ כניסה ראשי (יכול להפעיל הכל)
└── package.json         # תלויות וסקריפטים
```

## אפשרויות הפעלה

### 1. הפעלת הבוט בלבד
```bash
npm run start:bot
# או
node bot/index.js
```

### 2. הפעלת הסקג'ולר בלבד
```bash
npm run start:scheduler
# או
node scheduler/index.js
```

### 3. הפעלת שני הרכיבים יחד
```bash
npm start
# או
node index.js
```

### 4. הפעלת רכיב ספציפי דרך משתנה סביבה
```bash
# הפעלת הבוט בלבד
COMPONENT=bot npm start

# הפעלת הסקג'ולר בלבד
COMPONENT=scheduler npm start

# הפעלת שניהם (ברירת מחדל)
COMPONENT=both npm start
```

## משימות Cron

### הרצת משימה בודדת
```bash
# משימה יומית
npm run cron:daily

# משימה שבועית
npm run cron:weekly

# משימה חודשית
npm run cron:monthly

# בדיקת מכשירים פופולריים
npm run cron:popular
```

### הרצה ישירה
```bash
node scheduler/cron-task.js daily
node scheduler/cron-task.js weekly
node scheduler/cron-task.js monthly
node scheduler/cron-task.js popular-check
```

## סקריפטי פיתוח

```bash
# פיתוח עם nodemon - בוט בלבד
npm run dev:bot

# פיתוח עם nodemon - סקג'ולר בלבד
npm run dev:scheduler

# פיתוח עם nodemon - הכל יחד
npm run dev
```

## משתני סביבה

### משתנים קיימים
- `TELEGRAM_BOT_TOKEN` - טוקן הבוט
- `MONGODB_URI` - חיבור למסד הנתונים
- `NODE_ENV` - סביבת הרצה
- `PORT` - פורט השרת

### משתנים חדשים
- `COMPONENT` - איזה רכיב להפעיל (`bot`, `scheduler`, `both`)
- `ENABLE_SCHEDULER` - האם להפעיל סקג'ולר (`true`/`false`)

## יתרונות המבנה החדש

### 1. הפרדה ברורה
- כל רכיב עם אחריות מוגדרת
- קל לתחזוקה ופיתוח
- אפשרות להפעיל רכיבים בנפרד

### 2. גמישות בפריסה
- ניתן להפעיל הבוט בשרת אחד והסקג'ולר באחר
- חיסכון במשאבים - הפעלת רק מה שנדרש
- קלות בהרחבה עתידית

### 3. ניהול תלויות
- קבצים משותפים בתיקיה אחת
- אין כפילות קוד
- עדכונים נעשים במקום אחד

### 4. בדיקות ופיתוח
- אפשרות לבדוק כל רכיב בנפרד
- פיתוח מקביל של רכיבים שונים
- דיבוג קל יותר

## הערות חשובות

1. **תלויות**: כל הקבצים ב-`common` נגישים לכל הרכיבים
2. **נתיבים**: שימוש בנתיבים יחסיים (`../common/...`)
3. **התאמה לקיים**: הסקריפטים הקיימים ממשיכים לעבוד
4. **תאימות לאחור**: `npm start` עדיין מפעיל את כל המערכת

## פתרון בעיות

### בעיית imports
אם יש שגיאות של require, וודאו שהנתיבים נכונים:
- מ-bot ל-common: `require('../common/...')`
- מ-scheduler ל-common: `require('../common/...')`
- בתוך common זה לזה: `require('./...')`

### בעיית פורטים
אם הבוט והסקג'ולר רצים יחד, השרת ייפתח רק פעם אחת על ידי הבוט.

### בעיית משימות cron
וודאו שאתם משתמשים בנתיב הנכון:
- חדש: `node scheduler/cron-task.js`
- ישן: `node cron-task.js` (לא יעבוד יותר)