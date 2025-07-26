const { format } = require('date-fns');
const { he } = require('date-fns/locale');

// ניתוח הודעת המשתמש
function parseUserMessage(messageText) {
  const text = messageText.toLowerCase().trim();
  
  // דפוסי חיפוש נפוצים
  const patterns = [
    // פורמט: "כדאי לעדכן Samsung Galaxy S23 לאנדרואיד 14?"
    /כדאי\s+לעדכן\s+(.+?)\s+ל(.+?)[\?\.]?$/,
    // פורמט: "Samsung Galaxy S23 Android 14 יציב?"
    /(.+?)\s+(.+?)\s+יציב[\?\.]?$/,
    // פורמט: "בעיות ב Samsung Galaxy S23 עדכון Android 14"
    /בעיות\s+ב\s*(.+?)\s+עדכון\s+(.+?)[\?\.]?$/,
    // פורמט באנגלית: "Should I update Samsung Galaxy S23 to Android 14?"
    /should\s+i\s+update\s+(.+?)\s+to\s+(.+?)[\?\.]?$/,
    // פורמט כללי: "Samsung Galaxy S23 Android 14"
    /^(.+?)\s+(android\s+\d+|one\s+ui\s+[\d\.]+|miui\s+\d+)(.*)$/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseDeviceAndVersion(match[1], match[2]);
    }
  }
  
  // אם לא נמצא דפוס, ננסה ניתוח חופשי
  return parseFreetextMessage(text);
}

// ניתוח מכשיר וגרסה
function parseDeviceAndVersion(devicePart, versionPart) {
  const deviceText = devicePart.trim();
  const versionText = versionPart.trim();
  
  // זיהוי יצרן ומכשיר
  const deviceInfo = extractDeviceInfo(deviceText);
  
  return {
    manufacturer: deviceInfo.manufacturer,
    device: deviceInfo.device,
    version: versionText,
    confidence: deviceInfo.confidence,
    originalText: `${deviceText} ${versionText}`
  };
}

// חילוץ מידע מכשיר
function extractDeviceInfo(deviceText) {
  const text = deviceText.toLowerCase();
  
  // יצרנים נפוצים ודפוסי זיהוי
  const manufacturers = {
    samsung: {
      patterns: ['samsung', 'galaxy'],
      devices: ['s24', 's23', 's22', 's21', 'a54', 'a53', 'a52', 'note']
    },
    google: {
      patterns: ['google', 'pixel'],
      devices: ['pixel 8', 'pixel 7', 'pixel 6', 'pixel 5']
    },
    xiaomi: {
      patterns: ['xiaomi', 'mi', 'redmi', 'poco'],
      devices: ['14', '13', '12', 'note 13', 'note 12', 'f5', 'f4']
    },
    oneplus: {
      patterns: ['oneplus', 'op', 'nord'],
      devices: ['12', '11', '10', '9', 'nord 3', 'nord 2']
    }
  };
  
  let detectedManufacturer = null;
  let confidence = 0;
  
  // זיהוי יצרן
  for (const [manufacturer, data] of Object.entries(manufacturers)) {
    for (const pattern of data.patterns) {
      if (text.includes(pattern)) {
        detectedManufacturer = manufacturer;
        confidence = 0.8;
        break;
      }
    }
    if (detectedManufacturer) break;
  }
  
  // אם לא נמצא יצרן, ננסה לנחש לפי שמות מכשירים
  if (!detectedManufacturer) {
    if (text.includes('galaxy')) {
      detectedManufacturer = 'samsung';
      confidence = 0.9;
    } else if (text.includes('pixel')) {
      detectedManufacturer = 'google';
      confidence = 0.9;
    } else if (text.includes('redmi') || text.includes('poco')) {
      detectedManufacturer = 'xiaomi';
      confidence = 0.8;
    }
  }
  
  return {
    manufacturer: detectedManufacturer,
    device: deviceText,
    confidence: confidence
  };
}

// ניתוח הודעה חופשית
function parseFreetextMessage(text) {
  // חיפוש של מילות מפתח
  const deviceKeywords = ['galaxy', 'pixel', 'redmi', 'poco', 'oneplus'];
  const versionKeywords = ['android', 'one ui', 'miui', 'oxygen'];
  
  let device = null;
  let version = null;
  
  // חיפוש מכשיר
  for (const keyword of deviceKeywords) {
    if (text.includes(keyword)) {
      const deviceMatch = text.match(new RegExp(`(${keyword}[\\s\\w]*(?:\\d+|pro|ultra|plus)?)`, 'i'));
      if (deviceMatch) {
        device = deviceMatch[1];
        break;
      }
    }
  }
  
  // חיפוש גרסה
  for (const keyword of versionKeywords) {
    if (text.includes(keyword)) {
      const versionMatch = text.match(new RegExp(`(${keyword}\\s*[\\d\\.]+)`, 'i'));
      if (versionMatch) {
        version = versionMatch[1];
        break;
      }
    }
  }
  
  const deviceInfo = device ? extractDeviceInfo(device) : { manufacturer: null, device: null, confidence: 0 };
  
  return {
    manufacturer: deviceInfo.manufacturer,
    device: deviceInfo.device || device,
    version: version,
    confidence: Math.min(deviceInfo.confidence, version ? 0.7 : 0.3),
    originalText: text
  };
}

// עיצוב תשובה סופית
function formatResponse(deviceInfo, updateInfo, recommendation) {
  const emoji = getRecommendationEmoji(recommendation.recommendation);
  const stabilityStars = getStabilityStars(recommendation.stabilityRating);
  
  let response = `${emoji} <b>ניתוח עדכון: ${deviceInfo.device}</b>\n\n`;
  
  // דירוג יציבות
  response += `📊 <b>דירוג יציבות:</b> ${recommendation.stabilityRating}/10 ${stabilityStars}\n`;
  response += `🎯 <b>רמת ביטחון:</b> ${getConfidenceText(recommendation.confidence)}\n\n`;
  
  // המלצה עיקרית
  response += `💡 <b>המלצה:</b> ${getRecommendationText(recommendation.recommendation)}\n\n`;
  
  // יתרונות
  if (recommendation.benefits && recommendation.benefits.length > 0) {
    response += `✅ <b>יתרונות העדכון:</b>\n`;
    recommendation.benefits.slice(0, 4).forEach(benefit => {
      response += `• ${benefit}\n`;
    });
    response += '\n';
  }
  
  // סיכונים/בעיות
  if (recommendation.risks && recommendation.risks.length > 0 && 
      !recommendation.risks.includes('לא נמצאו בעיות משמעותיות')) {
    response += `⚠️ <b>בעיות מדווחות:</b>\n`;
    recommendation.risks.slice(0, 4).forEach(risk => {
      response += `• ${risk}\n`;
    });
    response += '\n';
  }
  
  // דיווחי משתמשים - החלק החדש שהמשתמש ביקש!
  if (updateInfo && updateInfo.searchResults && hasUserReports(updateInfo.searchResults)) {
    response += `👥 <b>דיווחי משתמשים אמיתיים:</b>\n`;
    response += formatUserReports(updateInfo.searchResults);
    response += '\n';
  }
  
  // הסבר
  if (recommendation.reasoning) {
    response += `📋 <b>הסבר:</b>\n${recommendation.reasoning}\n\n`;
  }
  
  // לוח זמנים
  if (recommendation.timeline) {
    response += `⏰ <b>לוח זמנים:</b>\n`;
    response += `• ${recommendation.timeline.action}`;
    if (recommendation.timeline.timeframe) {
      response += ` (${recommendation.timeline.timeframe})`;
    }
    response += '\n';
    
    if (recommendation.timeline.nextCheck) {
      response += `• בדיקה חוזרת: ${recommendation.timeline.nextCheck}\n`;
    }
    response += '\n';
  }
  
  // הערות מיוחדות
  if (recommendation.specialNotes && recommendation.specialNotes.length > 0) {
    response += `📝 <b>הערות חשובות:</b>\n`;
    recommendation.specialNotes.slice(0, 2).forEach(note => {
      response += `• ${note}\n`;
    });
    response += '\n';
  }
  
  // המלצות לפי סוג משתמש
  if (recommendation.userTypeRecommendations) {
    response += `👥 <b>המלצות מותאמות:</b>\n`;
    response += `• <b>משתמש רגיל:</b> ${getRecommendationText(recommendation.userTypeRecommendations.regularUser.recommendation)}\n`;
    response += `• <b>משתמש טכני:</b> ${getRecommendationText(recommendation.userTypeRecommendations.technicalUser.recommendation)}\n`;
    response += `• <b>שימוש עסקי:</b> ${getRecommendationText(recommendation.userTypeRecommendations.businessUser.recommendation)}\n\n`;
  }
  
  // מידע נוסף
  response += `🔍 <b>מקורות נבדקו:</b> ${updateInfo.sources?.length || 0} מקורות\n`;
  response += `🕒 <b>עודכן:</b> ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;
  
  response += `❓ <b>שאלות נוספות?</b> שלחו /help לעזרה מפורטת`;
  
  return response;
}

// אימוג'י לפי המלצה
function getRecommendationEmoji(recommendation) {
  const emojis = {
    'recommended': '✅',
    'recommended_with_caution': '⚡',
    'wait': '⏳',
    'not_recommended': '❌'
  };
  
  return emojis[recommendation] || '❓';
}

// כוכבים לדירוג יציבות
function getStabilityStars(rating) {
  if (!rating) return '';
  
  const fullStars = Math.floor(rating / 2);
  const halfStar = (rating % 2) >= 1;
  
  let stars = '⭐'.repeat(fullStars);
  if (halfStar) stars += '✨';
  
  return stars;
}

// טקסט רמת ביטחון
function getConfidenceText(confidence) {
  const texts = {
    'high': 'גבוהה 🎯',
    'medium': 'בינונית 🎲',
    'low': 'נמוכה ⚠️'
  };
  
  return texts[confidence] || 'לא ברור';
}

// טקסט המלצה
function getRecommendationText(recommendation) {
  const texts = {
    'recommended': 'מומלץ לעדכן ✅',
    'recommended_with_caution': 'מומלץ לעדכן בזהירות ⚡',
    'wait': 'כדאי להמתין ⏳',
    'not_recommended': 'לא מומלץ לעדכן כרגע ❌'
  };
  
  return texts[recommendation] || 'לא ברור';
}

// הסרת HTML tags
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

// קיצור טקסט
function truncateText(text, maxLength = 200) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ניקוי טקסט
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')           // החלפת רווחים מרובים ברווח יחיד
    .replace(/[^\w\s\u0590-\u05FF\-\.]/g, '') // השארת רק אותיות, מספרים, רווחים ועברית
    .trim();
}

// בדיקת תקינות URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// המרת זמן יחסי
function timeAgo(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 60) {
    return `לפני ${diffInMinutes} דקות`;
  } else if (diffInHours < 24) {
    return `לפני ${diffInHours} שעות`;
  } else if (diffInDays < 7) {
    return `לפני ${diffInDays} ימים`;
  } else {
    return format(date, 'dd/MM/yyyy');
  }
}

// יצירת hash ייחודי
function generateHash(text) {
  let hash = 0;
  if (text.length === 0) return hash;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// ולידציה של פרמטרים
function validateDeviceQuery(query) {
  const errors = [];
  
  if (!query.manufacturer) {
    errors.push('לא זוהה יצרן המכשיר');
  }
  
  if (!query.device) {
    errors.push('לא זוהה דגם המכשיר');
  }
  
  if (!query.version) {
    errors.push('לא זוהתה גרסת האנדרואיד המבוקשת');
  }
  
  if (query.confidence < 0.5) {
    errors.push('רמת הביטחון בזיהוי נמוכה מדי');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// יצירת מזהה ייחודי לשאילתה
function generateQueryId(deviceInfo, parsedQuery) {
  const key = `${deviceInfo.manufacturerKey}-${deviceInfo.deviceKey}-${parsedQuery.version}`.toLowerCase();
  return generateHash(key);
}

// פורמט מידע לדיבאג
function formatDebugInfo(data) {
  return JSON.stringify(data, null, 2);
}

// בדיקה אם יש דיווחי משתמשים
function hasUserReports(searchResults) {
  return (searchResults.redditPosts && searchResults.redditPosts.length > 0) ||
         (searchResults.forumDiscussions && searchResults.forumDiscussions.length > 0);
}

// עיצוב דיווחי משתמשים
function formatUserReports(searchResults) {
  let reports = '';
  
  // דיווחים מ-Reddit
  if (searchResults.redditPosts && searchResults.redditPosts.length > 0) {
    reports += `\n🔸 <b>מ-Reddit:</b>\n`;
    
    // מיון לפי relevance ו-score
    const topRedditPosts = searchResults.redditPosts
      .filter(post => post.score > 0) // רק פוסטים עם ציון חיובי
      .sort((a, b) => (b.relevance * b.score) - (a.relevance * a.score))
      .slice(0, 3);
    
    topRedditPosts.forEach(post => {
      const sentimentEmoji = getSentimentEmoji(post.sentiment);
      reports += `• ${sentimentEmoji} <b>"${truncateText(post.title, 60)}"</b>\n`;
      reports += `  👤 ${post.author} | 👍 ${post.score} | 💬 ${post.numComments} | ${timeAgo(post.created)}\n`;
      
      if (post.selftext && post.selftext.trim().length > 0) {
        const cleanedText = cleanText(post.selftext);
        if (cleanedText.length > 0) {
          reports += `  📝 ${truncateText(cleanedText, 150)}\n`;
        }
      }
      
      reports += `  🔗 <a href="${post.url}">קרא עוד</a>\n\n`;
    });
  }
  
  // דיווחים מפורומים טכניים - כולל דיווחי המשתמשים החדשים
  if (searchResults.forumDiscussions && searchResults.forumDiscussions.length > 0) {
    reports += `🔸 <b>מפורומים טכניים:</b>\n`;
    
    searchResults.forumDiscussions.slice(0, 2).forEach(discussion => {
      reports += `• <b>${truncateText(discussion.title, 60)}</b>\n`;
      reports += `  📍 ${discussion.source}\n`;
      
      if (discussion.summary) {
        reports += `  📝 ${truncateText(discussion.summary, 150)}\n`;
      }
      
      // הוספת דיווחי המשתמשים הספציפיים
      if (discussion.userReports && discussion.userReports.length > 0) {
        reports += `  <b>דיווחי משתמשים:</b>\n`;
        discussion.userReports.slice(0, 2).forEach(userReport => {
          const sentimentEmoji = getSentimentEmoji(userReport.sentiment);
          reports += `    ${sentimentEmoji} <i>"${truncateText(userReport.content, 100)}"</i>\n`;
          reports += `    👤 ${userReport.author} | ${timeAgo(userReport.date)}\n`;
        });
      }
      
      reports += `  🔗 <a href="${discussion.url}">קרא עוד</a>\n\n`;
    });
  }
  
  // דיווחים מחיפוש כללי
  if (searchResults.webSearchResults && searchResults.webSearchResults.length > 0) {
    const relevantWebResults = searchResults.webSearchResults
      .filter(result => result.relevance && result.relevance > 0.5)
      .slice(0, 2);
    
    if (relevantWebResults.length > 0) {
      reports += `🔸 <b>מאתרי טכנולוגיה:</b>\n`;
      
      relevantWebResults.forEach(result => {
        reports += `• <b>${truncateText(result.title, 60)}</b>\n`;
        if (result.snippet) {
          reports += `  📝 ${truncateText(result.snippet, 150)}\n`;
        }
        reports += `  🔗 <a href="${result.url}">קרא עוד</a>\n\n`;
      });
    }
  }
  
  if (reports.trim() === '') {
    reports = `לא נמצאו דיווחי משתמשים ספציפיים לעדכון זה.\nמומלץ לבדוק בפורומים ידנית או להמתין למידע נוסף.\n`;
  }
  
  return reports;
}

// אימוג'י לפי סנטימנט
function getSentimentEmoji(sentiment) {
  const emojis = {
    'positive': '😊',
    'negative': '😞', 
    'mixed': '😐',
    'neutral': '😐'
  };
  
  return emojis[sentiment] || '😐';
}

module.exports = {
  parseUserMessage,
  formatResponse,
  stripHtml,
  truncateText,
  cleanText,
  isValidUrl,
  timeAgo,
  generateHash,
  validateDeviceQuery,
  generateQueryId,
  formatDebugInfo
};
