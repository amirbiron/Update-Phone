# הגדרת Google Search API לבוט

הבוט משתמש ב-Google Custom Search API כמנגנון חיפוש ראשי, עם DuckDuckGo כ-fallback. מדריך זה יסביר איך להגדיר את ה-API.

## למה Google Search API?

- 🔍 **איכות תוצאות מעולה** - האלגוריתם הטוב ביותר
- 📊 **נתונים עשירים** - snippet, title, meta-description
- 🎯 **רלוונטיות גבוהה** - תוצאות מדויקות יותר
- 🔧 **אפשרויות מתקדמות** - חיפוש לפי אתר, תאריך, סוג קובץ

## שלבי ההגדרה

### 1. יצירת Google Cloud Project

1. כנסו ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צרו פרויקט חדש או בחרו פרויקט קיים
3. ודאו שהפרויקט פעיל (בפינה השמאלית העליונה)

### 2. הפעלת Custom Search API

1. כנסו ל-[Google Cloud Console - APIs](https://console.cloud.google.com/apis/library)
2. חפשו "Custom Search API"
3. לחצו על "Enable" להפעלת ה-API

### 3. יצירת API Key

1. כנסו ל-[Credentials](https://console.cloud.google.com/apis/credentials)
2. לחצו "Create Credentials" → "API Key"
3. העתיקו את ה-API Key שנוצר
4. **חשוב:** הגבילו את ה-API Key רק ל-Custom Search API (בהגדרות האבטחה)

### 4. יצירת Custom Search Engine

1. כנסו ל-[Google Custom Search Engine](https://cse.google.com/cse/)
2. לחצו "Add" ליצירת מנוע חיפוש חדש
3. **הגדרות מומלצות:**
   - **Sites to search:** `*` (כדי לחפש בכל האינטרנט)
   - **Language:** Hebrew/English
   - **SafeSearch:** Moderate
   - **Image search:** Off (לא נדרש)

4. אחרי יצירת המנוע:
   - לחצו על "Control Panel"
   - העתיקו את ה-**Search engine ID** (מתחת ל-"Basics")

### 5. הגדרת משתני הסביבה

הוסיפו ל-`.env`:

```bash
# Google Search API - Primary search engine
GOOGLE_SEARCH_API_KEY=AIzaSyC-your-actual-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
```

## מגבלות ועלויות

### חינם (Free Tier)
- **100 שאילתות ליום** - חינם
- מתאפס כל יום ב-00:00 PST

### תשלום
- **$5 לכל 1,000 שאילתות נוספות**
- עד 10,000 שאילתות ליום מקסימום

### ניטור שימוש
ניתן לעקוב אחרי השימוש ב-[Google Cloud Console - Quotas](https://console.cloud.google.com/iam-admin/quotas)

## בדיקת התצורה

אחרי ההגדרה, בדקו שהבוט עובד:

```bash
# הריצו את הבוט
npm start

# בלוגים תראו:
✅ Google Search API returned X results
```

אם יש בעיה:
```bash
⚠️ Google Search API failed: [error message], falling back to DuckDuckGo
```

## שגיאות נפוצות ופתרונות

### `Google Search API credentials not configured`
**פתרון:** ודאו שהמשתנים `GOOGLE_SEARCH_API_KEY` ו-`GOOGLE_SEARCH_ENGINE_ID` מוגדרים ב-`.env`

### `Google Search API quota exceeded`
**פתרון:** הגעתם למגבלת 100 שאילתות ליום. הבוט יעבור אוטומטית ל-DuckDuckGo

### `Google Search API error: API key not valid`
**פתרון:** 
1. ודאו שה-API Key נכון
2. ודאו שה-Custom Search API מופעל בפרויקט
3. ודאו שה-API Key מוגבל רק ל-Custom Search API

### `Google Search API error: Invalid Value`
**פתרון:** ודאו שה-Search Engine ID נכון (אורך של כ-21 תווים)

## אופטימיזציה

### שיפור איכות התוצאות
ב-Custom Search Engine settings:
- הוסיפו **Refinement Labels** לנושאים ספציפיים
- הגדירו **Synonyms** למילות מפתח נפוצות
- השתמשו ב-**Promotions** לאתרים מהימנים

### חיסכון בשאילתות
הבוט כבר מכיל אופטימיזציות:
- שימוש ב-DuckDuckGo כ-fallback
- מטמון תוצאות (אם מוגדר)
- הגבלת מספר התוצאות ל-5 בלבד

## תמיכה

אם יש בעיות:
1. בדקו את הלוגים של הבוט
2. ודאו שהמשתנים מוגדרים נכון
3. בדקו את מגבלות השימוש ב-Google Cloud Console

הבוט ימשיך לעבוד גם בלי Google Search API, אבל עם איכות תוצאות נמוכה יותר.