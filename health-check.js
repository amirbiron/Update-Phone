#!/usr/bin/env node
require('dotenv').config();

const express = require('express');
const Database = require('./common/database');
const UpdateChecker = require('./common/updateChecker');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      environment: {
        nodeEnv: process.env.NODE_ENV,
        component: process.env.COMPONENT,
        port: PORT
      }
    };

    // בדיקת מסד נתונים
    try {
      const dbHealth = await Database.healthCheck();
      healthStatus.services.database = dbHealth;
    } catch (error) {
      healthStatus.services.database = { status: 'error', error: error.message };
      healthStatus.status = 'degraded';
    }

    // בדיקת UpdateChecker
    try {
      const updateChecker = new UpdateChecker();
      const servicesStatus = await updateChecker.getServicesStatus();
      healthStatus.services.updateChecker = { status: 'healthy', details: servicesStatus };
    } catch (error) {
      healthStatus.services.updateChecker = { status: 'error', error: error.message };
      healthStatus.status = 'degraded';
    }

    // בדיקת API Keys
    const apiKeys = {
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      claude: !!process.env.CLAUDE_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
      mongodb: !!process.env.MONGODB_URI
    };
    
    healthStatus.services.apiKeys = apiKeys;

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Status endpoint עם מידע מפורט יותר
app.get('/status', async (req, res) => {
  try {
    const status = {
      bot: {
        name: 'Android Update Advisor Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      functions: {
        checkQueryLimit: 'available',
        logUserInteraction: 'available', 
        searchGeneralInfo: 'available'
      }
    };

    // בדיקת פונקציות שתיקנו
    try {
      await Database.checkQueryLimit('health_check');
      await Database.logUserInteraction('health_check', 'status_check');
      
      const updateChecker = new UpdateChecker();
      await updateChecker.searchGeneralInfo('test query');
      
      status.functions.status = 'all_working';
    } catch (error) {
      status.functions.status = 'error';
      status.functions.error = error.message;
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: '🤖 Android Update Advisor Bot is running!',
    endpoints: {
      health: '/health',
      status: '/status'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🏥 Health check server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📋 Status: http://localhost:${PORT}/status`);
  });
}

module.exports = app;