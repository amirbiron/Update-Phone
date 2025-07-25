# 🚀 מדריך פריסה - בוט יועץ עדכוני אנדרואיד

מדריך זה יעזור לכם לפרוס את הבוט בצורה מהירה ויעילה.

## 📋 רשימת בדיקות לפני פריסה

### ✅ הכנות בסיסיות

- [ ] **טלגרם בוט** - יצרתם בוט חדש ב-@BotFather וקיבלתם token
- [ ] **מסד נתונים** - MongoDB Atlas account או מסד נתונים מקומי מוכן
- [ ] **GitHub** - העלתם את הקוד ל-repository
- [ ] **קבצי הגדרה** - עדכנתם את כל הקבצים הדרושים

### ✅ משתני סביבה

```bash
# בדקו שיש לכם את המשתנים החיוניים האלה:
TELEGRAM_BOT_TOKEN=your_bot_token_here
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
PORT=3000
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
```

## 🌐 פריסה ב-Render (מומלץ)

### שלב 1: הכנת Repository
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### שלב 2: יצירת שירות ב-Render

1. **כניסה ל-Render**
   - גשו ל-[render.com](https://render.com)
   - התחברו עם GitHub

2. **יצירת Web Service חדש**
   - לחצו על "New" → "Web Service"
   - בחרו את ה-repository שלכם
   - השם המומלץ: `android-update-advisor-bot`

3. **הגדרות בסיסיות**
   ```
   Name: android-update-advisor-bot
   Region: Oregon (USA) או Frankfurt (EU)
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

### שלב 3: הגדרת משתני סביבה

ב-Environment Variables, הוסיפו:

```
NODE_ENV=production
PORT=3000
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
RENDER_EXTERNAL_URL=https://YOUR_APP_NAME.onrender.com
WEBHOOK_ENABLED=true
ENABLE_SCHEDULER=true
LOG_LEVEL=info
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### שלב 4: פריסה ראשונה

1. לחצו על "Create Web Service"
2. חכו לסיום הבנייה (3-5 דקות)
3. בדקו שהשירות פועל על: `https://your-app-name.onrender.com/health`

### שלב 5: הגדרת Webhook

אחרי שהשירות פועל, הגדירו את ה-webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app-name.onrender.com/bot<YOUR_BOT_TOKEN>"}'
```

## 🐳 פריסה עם Docker

### שלב 1: בניית Container

```bash
# בניית image
docker build -t android-advisor-bot .

# הפעלה מקומית לבדיקה
docker run --name android-bot -d \
  -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e MONGODB_URI=your_mongodb_uri \
  android-advisor-bot
```

### שלב 2: פריסה ב-Docker Hub

```bash
# תיוג ל-Docker Hub
docker tag android-advisor-bot your-username/android-advisor-bot:latest

# העלאה
docker push your-username/android-advisor-bot:latest
```

### שלב 3: פריסה בשרת

```yaml
# docker-compose.yml לפריסה
version: '3.8'
services:
  bot:
    image: your-username/android-advisor-bot:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - MONGODB_URI=${MONGODB_URI}
      - NODE_ENV=production
```

## ☁️ פריסה ב-Railway

### התקנת Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### פריסה
```bash
railway init
railway add
railway up
```

### הגדרת משתנים
```bash
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set MONGODB_URI=your_mongodb_uri
railway variables set NODE_ENV=production
```

## 💾 הגדרת MongoDB

### אופציה 1: MongoDB Atlas (מומלץ)

1. **יצירת חשבון**
   - גשו ל-[mongodb.com/atlas](https://www.mongodb.com/atlas)
   - צרו חשבון חינמי

2. **יצירת Cluster**
   - בחרו ב-M0 Sandbox (חינמי)
   - בחרו אזור קרוב אליכם

3. **יצירת משתמש**
   - Database Access → Add New Database User
   - שמרו את שם המשתמש והסיסמה

4. **הגדרת רשת**
   - Network Access → Add IP Address
   - לפיתוח: 0.0.0.0/0 (כל הכתובות)
   - לפריסה: כתובת IP של השרת

5. **קבלת Connection String**
   - Databases → Connect → Connect your application
   - העתיקו את connection string

### אופציה 2: MongoDB מקומי עם Docker

```bash
# הפעלת MongoDB בcontainer
docker run --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v mongodb_data:/data/db \
  -d mongo:6.0
```

## 🔧 בדיקות אחרי פריסה

### 1. בדיקת בריאות השירות
```bash
curl https://your-app-name.onrender.com/health
# תשובה צפויה: {"status":"healthy","timestamp":"..."}
```

### 2. בדיקת הבוט בטלגרם
```
/start
# הבוט אמור להגיב עם הודעת ברוכים הבאים
```

### 3. בדיקת שאילתה
```
כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?
# הבוט אמור להגיב עם ניתוח מפורט
```

### 4. בדיקת לוגים
```bash
# ב-Render: לחצו על "Logs" בדשבורד
# ב-Docker: docker logs android-bot
```

## 🔒 אבטחה

### הגדרות בסיסיות

1. **משתני סביבה**
   - לעולם אל תעלו קבצי .env ל-Git
   - השתמשו במשתני סביבה של הפלטפורמה

2. **Rate Limiting**
   ```javascript
   RATE_LIMIT_WINDOW=60000
   RATE_LIMIT_MAX_REQUESTS=10
   ```

3. **HTTPS**
   - ודאו שכל התקשורת מוצפנת
   - Render מספק HTTPS אוטומטית

### הגדרות מתקדמות

1. **Firewall Rules**
   - הגבילו גישה רק לכתובות IP נדרשות
   - חסמו פורטים לא נחוצים

2. **Monitoring**
   - הגדירו התראות על שגיאות
   - עקבו אחר זמני תגובה

## 📊 ניטור ותחזוקה

### הגדרת התראות

```javascript
// הוספה לקוד - התראות על שגיאות
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // שליחת התראה למנהל
});
```

### בדיקות תקופתיות

1. **יומיות**
   - בדיקת לוגים לשגיאות
   - מעקב אחר זמני תגובה

2. **שבועיות**
   - בדיקת עדכוני תלויות
   - ניקוי נתונים ישנים

3. **חודשיות**
   - ביקורת אבטחה
   - אופטימיזציה של ביצועים

## 🚨 פתרון בעיות נפוצות

### הבוט לא מגיב

1. **בדיקת webhook**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. **בדיקת לוגים**
   - חפשו שגיאות בלוגים
   - ודאו שהמסד נתונים מחובר

3. **בדיקת משתני סביבה**
   - ודאו שכל המשתנים מוגדרים נכון

### ביצועים איטיים

1. **אופטימיזציה**
   ```javascript
   MAX_CONCURRENT_REQUESTS=3
   REQUEST_TIMEOUT=20000
   ```

2. **קישינג**
   - הפעילו Redis אם אפשר
   - הגדירו cache TTL נמוך יותר

### שגיאות מסד נתונים

1. **בדיקת חיבור**
   ```bash
   # בדיקת connection string
   echo $MONGODB_URI
   ```

2. **הרשאות**
   - ודאו שהמשתמש יש הרשאות קריאה/כתיבה

## 🎯 צ'קליסט לפריסה מוכנה

- [ ] ✅ הבוט מגיב לפקודות בסיסיות
- [ ] ✅ מסד הנתונים מחובר ופועל  
- [ ] ✅ Webhook מוגדר נכון
- [ ] ✅ לוגים נרשמים כמו שצריך
- [ ] ✅ בדיקות ביצועים עוברות
- [ ] ✅ משתני סביבה מוגדרים
- [ ] ✅ אבטחה מוגדרת (rate limiting, HTTPS)
- [ ] ✅ ניטור והתראות פעילים
- [ ] ✅ תיעוד עודכן
- [ ] ✅ גיבויים מוגדרים

## 🎉 הצלחה!

אם עברתם את כל השלבים, הבוט שלכם אמור לפעול בהצלחה! 

לתמיכה נוספת, פתחו issue ב-GitHub או צרו קשר.

**זכרו: עדכנו את התיעוד אחרי כל שינוי משמעותי!**
