const mongoose = require('mongoose');

// Schema לשאילתות משתמשים
const QuerySchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  queryText: { type: String, required: true },
  deviceInfo: {
    manufacturer: String,
    device: String,
    deviceKey: String,
    manufacturerKey: String,
    marketSegment: String,
    deviceYear: Number
  },
  updateInfo: {
    version: String,
    analysisMethod: String,
    sources: [String]
  },
  recommendation: {
    recommendation: String,
    confidence: String,
    stabilityRating: Number,
    score: Number
  },
  timestamp: { type: Date, default: Date.now },
  responseTime: Number, // milliseconds
  userFeedback: {
    rating: Number,
    comment: String,
    wasHelpful: Boolean
  }
});

// Schema למעקב אחר עדכונים
const UpdateTrackingSchema = new mongoose.Schema({
  manufacturerKey: { type: String, required: true },
  deviceKey: { type: String, required: true },
  version: { type: String, required: true },
  releaseDate: Date,
  stabilityRating: { type: Number, default: 6 },
  reportedIssues: [{
    issue: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    frequency: Number,
    reportedAt: { type: Date, default: Date.now }
  }],
  benefits: [String],
  rolloutStatus: {
    stage: { type: String, enum: ['beta', 'limited', 'gradual', 'wide', 'complete'] },
    percentage: Number,
    regions: [String]
  },
  lastChecked: { type: Date, default: Date.now },
  dataQuality: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
});

// Schema לסטטיסטיקות מערכת
const SystemStatsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  totalQueries: Number,
  uniqueUsers: Number,
  avgResponseTime: Number,
  topDevices: [{
    device: String,
    count: Number
  }],
  recommendationDistribution: {
    recommended: Number,
    recommendedWithCaution: Number,
    wait: Number,
    notRecommended: Number
  },
  errorRate: Number
});

// Schema למשוב משתמשים
const FeedbackSchema = new mongoose.Schema({
  chatId: String,
  queryId: mongoose.Schema.Types.ObjectId,
  rating: { type: Number, min: 1, max: 5 },
  wasAccurate: Boolean,
  comment: String,
  timestamp: { type: Date, default: Date.now }
});

// יצירת המודלים
const Query = mongoose.model('Query', QuerySchema);
const UpdateTracking = mongoose.model('UpdateTracking', UpdateTrackingSchema);
const SystemStats = mongoose.model('SystemStats', SystemStatsSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

class Database {
  constructor() {
    this.isConnected = false;
  }

  // התחברות למסד הנתונים
  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/android-update-advisor';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB');
      
      // יצירת אינדקסים
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    }
  }

  // יצירת אינדקסים לביצועים טובים יותר
  async createIndexes() {
    try {
      await Query.collection.createIndex({ chatId: 1, timestamp: -1 });
      await Query.collection.createIndex({ 'deviceInfo.manufacturerKey': 1, 'deviceInfo.deviceKey': 1 });
      await UpdateTracking.collection.createIndex({ manufacturerKey: 1, deviceKey: 1, version: 1 });
      await SystemStats.collection.createIndex({ date: -1 });
      await Feedback.collection.createIndex({ chatId: 1, timestamp: -1 });
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  // שמירת שאילתה
  async saveQuery(queryData) {
    if (!this.isConnected) return null;
    
    try {
      const query = new Query({
        chatId: queryData.chatId,
        queryText: queryData.query,
        deviceInfo: queryData.deviceInfo,
        updateInfo: {
          version: queryData.parsedQuery?.version,
          analysisMethod: queryData.updateInfo?.analysis?.analysisMethod,
          sources: queryData.updateInfo?.sources?.map(s => s.name) || []
        },
        recommendation: {
          recommendation: queryData.recommendation?.recommendation,
          confidence: queryData.recommendation?.confidence,
          stabilityRating: queryData.recommendation?.stabilityRating,
          score: queryData.recommendation?.score
        },
        timestamp: queryData.timestamp || new Date(),
        responseTime: queryData.responseTime
      });
      
      const savedQuery = await query.save();
      
      // עדכון סטטיסטיקות
      await this.updateDailyStats();
      
      return savedQuery._id;
    } catch (error) {
      console.error('Error saving query:', error);
      return null;
    }
  }

  // עדכון או יצירת מעקב עדכון
  async updateOrCreateUpdateTracking(deviceInfo, updateData) {
    if (!this.isConnected) return null;
    
    try {
      const filter = {
        manufacturerKey: deviceInfo.manufacturerKey,
        deviceKey: deviceInfo.deviceKey,
        version: updateData.version
      };
      
      const update = {
        $set: {
          lastChecked: new Date(),
          stabilityRating: updateData.stabilityRating,
          dataQuality: updateData.dataQuality || 'medium'
        },
        $addToSet: {
          reportedIssues: { $each: updateData.issues || [] },
          benefits: { $each: updateData.benefits || [] }
        }
      };
      
      const options = { upsert: true, new: true };
      
      return await UpdateTracking.findOneAndUpdate(filter, update, options);
    } catch (error) {
      console.error('Error updating update tracking:', error);
      return null;
    }
  }

  // קבלת היסטוריית עדכונים למכשיר
  async getUpdateHistory(manufacturerKey, deviceKey) {
    if (!this.isConnected) return [];
    
    try {
      return await UpdateTracking.find({
        manufacturerKey,
        deviceKey
      }).sort({ lastChecked: -1 }).limit(10);
    } catch (error) {
      console.error('Error getting update history:', error);
      return [];
    }
  }

  // עדכון סטטיסטיקות יומיות
  async updateDailyStats() {
    if (!this.isConnected) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // חישוב סטטיסטיקות
      const totalQueries = await Query.countDocuments({
        timestamp: { $gte: today }
      });
      
      const uniqueUsers = await Query.distinct('chatId', {
        timestamp: { $gte: today }
      });
      
      const avgResponseTime = await Query.aggregate([
        { $match: { timestamp: { $gte: today }, responseTime: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
      ]);
      
      const topDevices = await Query.aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { 
          _id: '$deviceInfo.device', 
          count: { $sum: 1 } 
        }},
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { device: '$_id', count: 1, _id: 0 } }
      ]);
      
      const recommendationDist = await Query.aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { 
          _id: '$recommendation.recommendation', 
          count: { $sum: 1 } 
        }}
      ]);
      
      const distribution = {
        recommended: 0,
        recommendedWithCaution: 0,
        wait: 0,
        notRecommended: 0
      };
      
      recommendationDist.forEach(item => {
        if (item._id === 'recommended') distribution.recommended = item.count;
        if (item._id === 'recommended_with_caution') distribution.recommendedWithCaution = item.count;
        if (item._id === 'wait') distribution.wait = item.count;
        if (item._id === 'not_recommended') distribution.notRecommended = item.count;
      });
      
      // שמירת הסטטיסטיקות
      await SystemStats.findOneAndUpdate(
        { date: today },
        {
          totalQueries,
          uniqueUsers: uniqueUsers.length,
          avgResponseTime: avgResponseTime[0]?.avgTime || 0,
          topDevices,
          recommendationDistribution: distribution,
          errorRate: 0 // TODO: implement error tracking
        },
        { upsert: true }
      );
      
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }

  // קבלת סטטיסטיקות מערכת
  async getSystemStats() {
    if (!this.isConnected) {
      return {
        totalQueries: 0,
        trackedDevices: 0,
        weeklyUpdates: 0,
        avgResponseTime: 'N/A'
      };
    }
    
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const totalQueries = await Query.countDocuments();
      const trackedDevices = await UpdateTracking.countDocuments();
      const weeklyUpdates = await UpdateTracking.countDocuments({
        lastChecked: { $gte: weekAgo }
      });
      
      const avgResponseTime = await Query.aggregate([
        { $match: { responseTime: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
      ]);
      
      return {
        totalQueries,
        trackedDevices,
        weeklyUpdates,
        avgResponseTime: Math.round(avgResponseTime[0]?.avgTime || 0)
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        totalQueries: 0,
        trackedDevices: 0,
        weeklyUpdates: 0,
        avgResponseTime: 'Error'
      };
    }
  }

  // שמירת משוב משתמש
  async saveFeedback(feedbackData) {
    if (!this.isConnected) return null;
    
    try {
      const feedback = new Feedback(feedbackData);
      return await feedback.save();
    } catch (error) {
      console.error('Error saving feedback:', error);
      return null;
    }
  }

  // קבלת משוב לפי משתמש
  async getUserFeedback(chatId, limit = 10) {
    if (!this.isConnected) return [];
    
    try {
      return await Feedback.find({ chatId })
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting user feedback:', error);
      return [];
    }
  }

  // חיפוש שאילתות דומות
  async findSimilarQueries(deviceInfo, limit = 5) {
    if (!this.isConnected) return [];
    
    try {
      return await Query.find({
        'deviceInfo.manufacturerKey': deviceInfo.manufacturerKey,
        'deviceInfo.deviceKey': deviceInfo.deviceKey
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('recommendation timestamp updateInfo');
    } catch (error) {
      console.error('Error finding similar queries:', error);
      return [];
    }
  }

  // קבלת מכשירים פופולריים
  async getPopularDevices(limit = 10) {
    if (!this.isConnected) return [];
    
    try {
      return await Query.aggregate([
        { $group: { 
          _id: {
            manufacturer: '$deviceInfo.manufacturer',
            device: '$deviceInfo.device'
          }, 
          count: { $sum: 1 },
          lastQuery: { $max: '$timestamp' }
        }},
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { 
          manufacturer: '$_id.manufacturer',
          device: '$_id.device',
          count: 1,
          lastQuery: 1,
          _id: 0 
        }}
      ]);
    } catch (error) {
      console.error('Error getting popular devices:', error);
      return [];
    }
  }

  // ניקוי נתונים ישנים
  async cleanup(olderThanDays = 90) {
    if (!this.isConnected) return;
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const deletedQueries = await Query.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      const deletedStats = await SystemStats.deleteMany({
        date: { $lt: cutoffDate }
      });
      
      console.log(`Cleanup completed: ${deletedQueries.deletedCount} queries, ${deletedStats.deletedCount} stats`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // בדיקת בריאות מסד הנתונים
  async healthCheck() {
    if (!this.isConnected) {
      return { status: 'disconnected', error: 'Not connected to database' };
    }
    
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // סגירת חיבור
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}

// יצירת מופע יחיד
const database = new Database();

module.exports = database;
