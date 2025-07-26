#!/usr/bin/env node

/**
 * סקריפט לבדיקה ואנליזה של כלי החיפוש שהבוט משתמש בהם
 * Script to analyze and report on search tools used by the bot
 */

const fs = require('fs');
const path = require('path');

class SearchToolsAnalyzer {
  constructor() {
    this.toolsFound = {};
    this.apiEndpoints = [];
    this.searchMethods = [];
    this.dataSources = [];
    this.analysisTools = [];
  }

  // ניתוח קבצי הקוד לזיהוי כלי החיפוש
  async analyzeCodebase() {
    console.log('🔍 מתחיל ניתוח כלי החיפוש של הבוט...\n');
    
    // קריאת קבצי הקוד העיקריים
    const filesToAnalyze = [
      'src/updateChecker.js',
      'src/deviceAnalyzer.js',
      'src/recommendationEngine.js',
      'src/database.js',
      'index.js'
    ];

    for (const file of filesToAnalyze) {
      if (fs.existsSync(file)) {
        await this.analyzeFile(file);
      }
    }

    this.generateReport();
  }

  // ניתוח קובץ בודד
  async analyzeFile(filePath) {
    console.log(`📄 מנתח קובץ: ${filePath}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // זיהוי API endpoints
      this.findApiEndpoints(content, filePath);
      
      // זיהוי מתודות חיפוש
      this.findSearchMethods(content, filePath);
      
      // זיהוי מקורות מידע
      this.findDataSources(content, filePath);
      
      // זיהוי כלי ניתוח
      this.findAnalysisTools(content, filePath);
      
    } catch (error) {
      console.error(`❌ שגיאה בניתוח קובץ ${filePath}:`, error.message);
    }
  }

  // זיהוי API endpoints
  findApiEndpoints(content, filePath) {
    const apiPatterns = [
      { pattern: /https:\/\/oauth\.reddit\.com/g, name: 'Reddit OAuth API', type: 'social' },
      { pattern: /https:\/\/www\.reddit\.com\/api/g, name: 'Reddit API', type: 'social' },
      { pattern: /https:\/\/api\.anthropic\.com/g, name: 'Claude API (Anthropic)', type: 'ai' },
      { pattern: /https:\/\/www\.xda-developers\.com/g, name: 'XDA Developers', type: 'forum' },
      { pattern: /https:\/\/www\.androidpolice\.com/g, name: 'Android Police', type: 'news' },
      { pattern: /https:\/\/www\.androidauthority\.com/g, name: 'Android Authority', type: 'news' },
      { pattern: /https:\/\/www\.gsmarena\.com/g, name: 'GSMArena', type: 'specs' },
      { pattern: /https:\/\/security\.samsungmobile\.com/g, name: 'Samsung Security', type: 'official' },
      { pattern: /https:\/\/source\.android\.com/g, name: 'Android Source', type: 'official' }
    ];

    apiPatterns.forEach(({ pattern, name, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        if (!this.apiEndpoints.find(api => api.name === name)) {
          this.apiEndpoints.push({
            name,
            type,
            file: filePath,
            occurrences: matches.length,
            status: 'detected'
          });
        }
      }
    });
  }

  // זיהוי מתודות חיפוש
  findSearchMethods(content, filePath) {
    const searchMethodPatterns = [
      { pattern: /async\s+searchReddit\s*\(/g, name: 'searchReddit', description: 'חיפוש ב-Reddit' },
      { pattern: /async\s+searchTechForums\s*\(/g, name: 'searchTechForums', description: 'חיפוש בפורומים טכניים' },
      { pattern: /async\s+searchOfficialSources\s*\(/g, name: 'searchOfficialSources', description: 'חיפוש במקורות רשמיים' },
      { pattern: /async\s+gatherInformation\s*\(/g, name: 'gatherInformation', description: 'איסוף מידע כללי' },
      { pattern: /async\s+analyzeWithClaude\s*\(/g, name: 'analyzeWithClaude', description: 'ניתוח עם Claude AI' },
      { pattern: /async\s+checkUpdate\s*\(/g, name: 'checkUpdate', description: 'בדיקת עדכונים' },
      { pattern: /generateXDAUserReports\s*\(/g, name: 'generateXDAUserReports', description: 'יצירת דיווחי משתמשים XDA' },
      { pattern: /generateAndroidPoliceReports\s*\(/g, name: 'generateAndroidPoliceReports', description: 'יצירת דיווחי משתמשים Android Police' },
      { pattern: /generateAndroidAuthorityReports\s*\(/g, name: 'generateAndroidAuthorityReports', description: 'יצירת דיווחי משתמשים Android Authority' }
    ];

    searchMethodPatterns.forEach(({ pattern, name, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        if (!this.searchMethods.find(method => method.name === name)) {
          this.searchMethods.push({
            name,
            description,
            file: filePath,
            occurrences: matches.length,
            type: 'method'
          });
        }
      }
    });
  }

  // זיהוי מקורות מידע
  findDataSources(content, filePath) {
    const sourcePatterns = [
      { pattern: /reddit\.com/gi, name: 'Reddit', category: 'Social Media' },
      { pattern: /xda-developers/gi, name: 'XDA Developers', category: 'Tech Forum' },
      { pattern: /androidpolice/gi, name: 'Android Police', category: 'Tech News' },
      { pattern: /androidauthority/gi, name: 'Android Authority', category: 'Tech News' },
      { pattern: /gsmarena/gi, name: 'GSMArena', category: 'Device Specs' },
      { pattern: /samsung.*security/gi, name: 'Samsung Security Bulletins', category: 'Official' },
      { pattern: /android.*source/gi, name: 'Android Source', category: 'Official' }
    ];

    sourcePatterns.forEach(({ pattern, name, category }) => {
      const matches = content.match(pattern);
      if (matches) {
        const existingSource = this.dataSources.find(source => source.name === name);
        if (!existingSource) {
          this.dataSources.push({
            name,
            category,
            file: filePath,
            mentions: matches.length
          });
        } else {
          existingSource.mentions += matches.length;
        }
      }
    });
  }

  // זיהוי כלי ניתוח
  findAnalysisTools(content, filePath) {
    const analysisPatterns = [
      { pattern: /claude-sonnet-4/gi, name: 'Claude Sonnet 4', type: 'AI Analysis' },
      { pattern: /anthropic/gi, name: 'Anthropic API', type: 'AI Service' },
      { pattern: /sentiment/gi, name: 'Sentiment Analysis', type: 'Text Analysis' },
      { pattern: /parseClaudeResponse/gi, name: 'Claude Response Parser', type: 'Response Processing' },
      { pattern: /calculateRelevance/gi, name: 'Relevance Calculator', type: 'Scoring Algorithm' },
      { pattern: /isUserReport/gi, name: 'User Report Detector', type: 'Content Classification' },
      { pattern: /extractUserExperience/gi, name: 'Experience Extractor', type: 'Content Analysis' }
    ];

    analysisPatterns.forEach(({ pattern, name, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        if (!this.analysisTools.find(tool => tool.name === name)) {
          this.analysisTools.push({
            name,
            type,
            file: filePath,
            usage: matches.length
          });
        }
      }
    });
  }

  // בדיקת זמינות API
  async checkApiAvailability() {
    console.log('\n🌐 בודק זמינות APIs...');
    
    const apiChecks = [
      {
        name: 'Reddit API',
        check: () => process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET,
        status: process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET ? '✅ זמין' : '❌ חסרים credentials'
      },
      {
        name: 'Claude API',
        check: () => process.env.CLAUDE_API_KEY,
        status: process.env.CLAUDE_API_KEY ? '✅ זמין' : '❌ חסר API key'
      }
    ];

    apiChecks.forEach(api => {
      console.log(`  ${api.name}: ${api.status}`);
    });
  }

  // יצירת דוח מפורט
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 דוח מפורט על כלי החיפוש והניתוח של הבוט');
    console.log('='.repeat(80));

    // API Endpoints
    console.log('\n🔗 API Endpoints שזוהו:');
    console.log('-'.repeat(50));
    if (this.apiEndpoints.length === 0) {
      console.log('  לא נמצאו API endpoints');
    } else {
      this.apiEndpoints.forEach(api => {
        console.log(`  ✓ ${api.name} (${api.type})`);
        console.log(`    📄 קובץ: ${api.file}`);
        console.log(`    🔢 מופיע: ${api.occurrences} פעמים\n`);
      });
    }

    // Search Methods
    console.log('\n🔍 מתודות חיפוש:');
    console.log('-'.repeat(50));
    if (this.searchMethods.length === 0) {
      console.log('  לא נמצאו מתודות חיפוש');
    } else {
      this.searchMethods.forEach(method => {
        console.log(`  ⚙️  ${method.name}`);
        console.log(`    📝 תיאור: ${method.description}`);
        console.log(`    📄 קובץ: ${method.file}\n`);
      });
    }

    // Data Sources
    console.log('\n📚 מקורות מידע:');
    console.log('-'.repeat(50));
    if (this.dataSources.length === 0) {
      console.log('  לא נמצאו מקורות מידע');
    } else {
      this.dataSources.forEach(source => {
        console.log(`  📖 ${source.name} (${source.category})`);
        console.log(`    🔢 אזכורים: ${source.mentions}`);
        console.log(`    📄 קובץ: ${source.file}\n`);
      });
    }

    // Analysis Tools
    console.log('\n🧠 כלי ניתוח:');
    console.log('-'.repeat(50));
    if (this.analysisTools.length === 0) {
      console.log('  לא נמצאו כלי ניתוח');
    } else {
      this.analysisTools.forEach(tool => {
        console.log(`  🔧 ${tool.name} (${tool.type})`);
        console.log(`    🔢 שימוש: ${tool.usage} פעמים`);
        console.log(`    📄 קובץ: ${tool.file}\n`);
      });
    }

    // Summary
    console.log('\n📈 סיכום:');
    console.log('-'.repeat(50));
    console.log(`  🔗 סה"כ API Endpoints: ${this.apiEndpoints.length}`);
    console.log(`  🔍 סה"כ מתודות חיפוש: ${this.searchMethods.length}`);
    console.log(`  📚 סה"כ מקורות מידע: ${this.dataSources.length}`);
    console.log(`  🧠 סה"כ כלי ניתוח: ${this.analysisTools.length}`);

    // Environment Check
    this.checkApiAvailability();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ניתוח הושלם בהצלחה!');
    console.log('='.repeat(80));
  }

  // שמירת הדוח לקובץ
  saveReportToFile() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        apiEndpoints: this.apiEndpoints.length,
        searchMethods: this.searchMethods.length,
        dataSources: this.dataSources.length,
        analysisTools: this.analysisTools.length
      },
      details: {
        apiEndpoints: this.apiEndpoints,
        searchMethods: this.searchMethods,
        dataSources: this.dataSources,
        analysisTools: this.analysisTools
      }
    };

    const filename = `search_tools_report_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 דוח נשמר לקובץ: ${filename}`);
  }
}

// הרצת הניתוח
async function main() {
  const analyzer = new SearchToolsAnalyzer();
  
  try {
    await analyzer.analyzeCodebase();
    analyzer.saveReportToFile();
  } catch (error) {
    console.error('❌ שגיאה בהרצת הניתוח:', error.message);
    process.exit(1);
  }
}

// הרצה רק אם הקובץ הורץ ישירות
if (require.main === module) {
  main();
}

module.exports = SearchToolsAnalyzer;