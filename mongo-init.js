// קובץ אתחול למסד הנתונים MongoDB
// קובץ זה רץ פעם אחת כשמסד הנתונים נוצר לראשונה

// מעבר למסד הנתונים של הבוט
db = db.getSiblingDB('android-update-advisor');

// יצירת משתמש עבור הבוט
db.createUser({
  user: 'bot-user',
  pwd: 'bot-password-change-me',
  roles: [
    {
      role: 'readWrite',
      db: 'android-update-advisor'
    }
  ]
});

// יצירת collections בסיסיים
db.createCollection('queries');
db.createCollection('updatetrackings');
db.createCollection('systemstats');
db.createCollection('feedbacks');

// יצירת אינדקסים בסיסיים לביצועים
print('Creating indexes...');

// אינדקסים לשאילתות
db.queries.createIndex({ "chatId": 1, "timestamp": -1 });
db.queries.createIndex({ "deviceInfo.manufacturerKey": 1, "deviceInfo.deviceKey": 1 });
db.queries.createIndex({ "timestamp": -1 });

// אינדקסים למעקב עדכונים
db.updatetrackings.createIndex({ 
  "manufacturerKey": 1, 
  "deviceKey": 1, 
  "version": 1 
}, { unique: true });
db.updatetrackings.createIndex({ "lastChecked": -1 });

// אינדקסים לסטטיסטיקות
db.systemstats.createIndex({ "date": -1 });

// אינדקסים למשוב
db.feedbacks.createIndex({ "chatId": 1, "timestamp": -1 });
db.feedbacks.createIndex({ "timestamp": -1 });

// הוספת נתונים ראשוניים לדוגמה
print('Inserting sample data...');

// נתוני יצרנים פופולריים
db.systemstats.insertOne({
  date: new Date(),
  totalQueries: 0,
  uniqueUsers: 0,
  avgResponseTime: 0,
  topDevices: [],
  recommendationDistribution: {
    recommended: 0,
    recommendedWithCaution: 0,
    wait: 0,
    notRecommended: 0
  },
  errorRate: 0
});

// מכשירים פופולריים לטסט
const popularDevices = [
  {
    manufacturerKey: 'samsung',
    deviceKey: 's23',
    version: 'Android 14',
    stabilityRating: 8,
    reportedIssues: [],
    benefits: ['Better battery life', 'Improved security'],
    rolloutStatus: {
      stage: 'wide',
      percentage: 80,
      regions: ['US', 'EU', 'Asia']
    },
    lastChecked: new Date(),
    dataQuality: 'high'
  },
  {
    manufacturerKey: 'google',
    deviceKey: 'pixel 7',
    version: 'Android 14',
    stabilityRating: 9,
    reportedIssues: [],
    benefits: ['New features', 'Better performance'],
    rolloutStatus: {
      stage: 'complete',
      percentage: 100,
      regions: ['Global']
    },
    lastChecked: new Date(),
    dataQuality: 'high'
  },
  {
    manufacturerKey: 'xiaomi',
    deviceKey: '13',
    version: 'MIUI 14',
    stabilityRating: 7,
    reportedIssues: [
      {
        issue: 'Battery drain in some cases',
        severity: 'medium',
        frequency: 15,
        reportedAt: new Date()
      }
    ],
    benefits: ['New MIUI features', 'Security updates'],
    rolloutStatus: {
      stage: 'gradual',
      percentage: 60,
      regions: ['China', 'India', 'EU']
    },
    lastChecked: new Date(),
    dataQuality: 'medium'
  }
];

db.updatetrackings.insertMany(popularDevices);

print('Database initialization completed successfully!');
print('Created user: bot-user');
print('Created collections: queries, updatetrackings, systemstats, feedbacks');
print('Created indexes for better performance');
print('Inserted sample data');

print('🎉 MongoDB ready for Android Update Advisor Bot!');
