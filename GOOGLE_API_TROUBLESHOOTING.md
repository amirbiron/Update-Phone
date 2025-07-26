# 🔧 פתרון בעיות Google Search API

## 🚨 השגיאה הנפוצה
```
❌ [Google Search API] UNKNOWN ERROR: Google Search API key not configured
```

## 📋 צעדי פתרון שלב אחר שלב

### 1️⃣ בדיקה מקומית
```bash
# הרץ את סקריפט הבדיקה
node check-env.js
```

### 2️⃣ בדיקה ב-Render
1. היכנס ל-**Render Dashboard**
2. בחר את השירות שלך
3. לך ל-**Environment** 
4. ודא שיש משתנה בשם המדויק: `GOOGLE_SEARCH_API_KEY`
5. ודא שיש משתנה בשם המדויק: `GOOGLE_SEARCH_ENGINE_ID`

### 3️⃣ שמות המשתנים - חשוב מאוד!
✅ **נכון:**
```
GOOGLE_SEARCH_API_KEY=AIzaSyC-your-actual-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
```

❌ **לא נכון:**
```
google_search_api_key=...          # אותיות קטנות
GOOGLE_API_KEY=...                 # שם שונה
GOOGLE_SEARCH_KEY=...              # שם שונה
GOOGLE SEARCH API KEY=...          # רווחים
```

### 4️⃣ Manual Deploy ב-Render
**חובה לעשות Manual Deploy אחרי כל שינוי ב-Environment Variables!**

1. לך ל-**Deployments**
2. לחץ על **Manual Deploy**
3. בחר **Deploy latest commit**
4. המתן עד שהפעלה מסתיימת

### 5️⃣ בדיקת הערכים
ודא שהערכים לא מכילים:
- `your_` (טקסט placeholder)
- רווחים בתחילת או סוף הערך
- תווים מיוחדים לא רצויים

### 6️⃣ אם אתה מריץ כ-Scheduled Job
ב-Render, אם יש לך **Cron Job** או **Background Worker**, ודא ש:
1. משתני הסביבה מוגדרים גם עבור הסרביס הזה
2. לא רק עבור ה-Web Service הראשי

## 🔍 כלי דיבאג נוספים

### בדיקה בקוד
הוספתי לוגים מפורטים שיעזרו לך לראות מה קורה:

```javascript
// בתחילת הבוט תראה:
🔑 === Google Search API Debug Info ===
🔑 GOOGLE_SEARCH_API_KEY: exists (AIzaSyC-yo...) או MISSING/UNDEFINED
🔑 GOOGLE_SEARCH_ENGINE_ID: exists (your-id) או MISSING/UNDEFINED
```

### בדיקה בלוגים של Render
1. לך ל-**Logs** בדשבורד של Render
2. חפש את השורות שמתחילות ב-`🔑`
3. בדוק מה רשום שם

## 🛠️ פתרונות נפוצים

### בעיה: המשתנה לא נטען
**פתרון:** ודא ש-`require('dotenv').config()` נקרא בתחילת הקוד

### בעיה: עובד מקומית אבל לא ב-Render
**פתרון:** 
1. ודא Manual Deploy אחרי הוספת משתני הסביבה
2. ודא שהשמות זהים ב-`.env` וב-Render

### בעיה: יש Cron Job נפרד
**פתרון:** הוסף את משתני הסביבה גם לשירות ה-Cron

## 🚀 בדיקה מהירה
רוץ את הפקודות הבאות כדי לוודא שהכל עובד:

```bash
# בדיקת משתני סביבה
node check-env.js

# בדיקת קישוריות ל-API (אם יש credentials)
node test-google-api.js

# אם הכל תקין, תראה:
✅ Google Search API: PROPERLY CONFIGURED
🎉 Google Search API is working correctly!
```

## 🔧 קבצים שנוספו לדיבאג
- `check-env.js` - בדיקת משתני סביבה
- `test-google-api.js` - בדיקת קישוריות ל-API
- `GOOGLE_API_TROUBLESHOOTING.md` - המדריך הזה

## 📝 שינויים שנעשו בקוד
1. **הוספת לוגים מפורטים** ב-`bot/index.js` ו-`common/updateChecker.js`
2. **עדכון `render.yaml`** עם משתני הסביבה הנדרשים
3. **כלי דיבאג חדשים** לבדיקת התצורה

## 📞 עזרה נוספת
אם עדיין יש בעיות, שלח לי:
1. הפלט של `node check-env.js`
2. הפלט של `node test-google-api.js` (אם יש credentials)
3. צילום מסך של Environment Variables ב-Render
4. הלוגים מה-Render Dashboard (חפש שורות שמתחילות ב-🔑)