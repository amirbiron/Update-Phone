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
    response += `👥 <b>דיווחי משתמשים:</b>\n`;
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

// בדיקה אם יש דיווחי משתמשים משמעותיים
function hasUserReports(searchResults) {
  // בדיקת דיווחי Reddit
  const hasRedditReports = searchResults.redditPosts && 
    searchResults.redditPosts.length > 0 && 
    searchResults.redditPosts.some(post => post.score > 0 || post.selftext?.trim().length > 20);
  
  // בדיקת דיווחי פורומים - רק אם יש תוכן אמיתי ולא רק קישורי חיפוש
  const hasForumReports = searchResults.forumDiscussions && 
    searchResults.forumDiscussions.length > 0 &&
    searchResults.forumDiscussions.some(discussion => 
      discussion.userReports && 
      discussion.userReports.length > 0 &&
      !discussion.userReports.every(report => 
        report.content.includes('מאמרים וביקורות') || 
        report.content.includes('דיונים קהילתיים') ||
        report.content.length < 30
      )
    );
  
  return hasRedditReports || hasForumReports;
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
      .slice(0, 10);
    
    topRedditPosts.forEach(post => {
      const sentimentEmoji = getSentimentEmoji(post.sentiment);
      reports += `• ${sentimentEmoji} <b>"${truncateText(post.title, 60)}"</b>\n`;
      
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
    
    searchResults.forumDiscussions.slice(0, 10).forEach(discussion => {
      reports += `• <b>${truncateText(discussion.title, 60)}</b>\n`;
      reports += `  📍 ${discussion.source}\n`;
      
      // הוספת דיווחי המשתמשים הספציפיים
      if (discussion.userReports && discussion.userReports.length > 0) {
        reports += `  <b>דיווחי משתמשים:</b>\n`;
        discussion.userReports.slice(0, 10).forEach(userReport => {
          const sentimentEmoji = getSentimentEmoji(userReport.sentiment);
          reports += `    ${sentimentEmoji} <i>"${userReport.content}"</i>\n`;
          reports += `    👤 ${userReport.author} | ${timeAgo(userReport.date)}\n`;
        });
      }
      
      reports += `  🔗 <a href="${discussion.url}">קרא עוד</a>\n\n`;
    });
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

// פיצול הודעה ארוכה לכמה הודעות
const TELEGRAM_MESSAGE_LIMIT = 4096; // מגבלת טלגרם

function splitLongMessage(message) {
  if (message.length <= TELEGRAM_MESSAGE_LIMIT) {
    return [message];
  }
  
  const messages = [];
  let currentMessage = '';
  const lines = message.split('\n');
  
  for (const line of lines) {
    // אם הוספת השורה הנוכחית תחרוג מהמגבלה
    if ((currentMessage + '\n' + line).length > TELEGRAM_MESSAGE_LIMIT) {
      // שמור את ההודעה הנוכחית ותתחיל חדשה
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim());
      }
      currentMessage = line;
    } else {
      // הוסף את השורה להודעה הנוכחית
      currentMessage += (currentMessage ? '\n' : '') + line;
    }
  }
  
  // הוסף את ההודעה האחרונה
  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }
  
  return messages;
}

// פיצול דיווחי משתמשים לחלקים קטנים יותר
function splitUserReports(searchResults) {
  const reportSections = [];
  
  // דיווחים מ-Reddit
  if (searchResults.redditPosts && searchResults.redditPosts.length > 0) {
    const redditReports = formatRedditReports(searchResults.redditPosts);
    // בדיקה שהתוכן אינו ריק ולא מכיל רק תוכן כללי
    if (redditReports.trim() && redditReports.length > 50) {
      reportSections.push({
        title: '👥 דיווחי משתמשים - Reddit',
        content: redditReports
      });
    }
  }
  
  // דיווחים מפורומים
  if (searchResults.forumDiscussions && searchResults.forumDiscussions.length > 0) {
    const forumReports = formatForumReports(searchResults.forumDiscussions);
    // בדיקה שהתוכן אינו ריק ולא מכיל רק הודעת ברירת מחדל
    if (forumReports.trim() && !forumReports.includes('לא נמצאו דיווחי משתמשים ספציפיים')) {
      reportSections.push({
        title: '👥 דיווחי משתמשים - פורומים טכניים',
        content: forumReports
      });
    }
  }

  // אם אין דיווחים משמעותיים, לא נוסיף כלום
  if (reportSections.length === 0) {
    console.log('ℹ️  No meaningful user reports found, skipping user reports section');
    return [];
  }

  // הגבלת מספר החלקים למקסימום 2 (במקום 4) כדי למנוע ספאם
  if (reportSections.length > 2) {
    const truncatedSections = reportSections.slice(0, 2);
    const lastSection = truncatedSections[truncatedSections.length - 1];
    lastSection.content += `\n\n<i>📊 הוגבל מספר הדיווחים כדי למנוע ספאם. סה"כ ${reportSections.length} מקורות נבדקו.</i>`;
    return truncatedSections;
  }
  
  return reportSections;
}

// עיצוב דיווחי Reddit בנפרד
function formatRedditReports(redditPosts) {
  let reports = '';
  
  const topRedditPosts = redditPosts
    .filter(post => post.score > 0)
    .sort((a, b) => (b.relevance * b.score) - (a.relevance * a.score))
    .slice(0, 10); // מגביל ל-10 דיווחים
  
  topRedditPosts.forEach(post => {
    const sentimentEmoji = getSentimentEmoji(post.sentiment);
    reports += `• ${sentimentEmoji} <b>"${truncateText(post.title, 60)}"</b>\n`;
    
    if (post.selftext && post.selftext.trim().length > 0) {
      const cleanedText = cleanText(post.selftext);
      if (cleanedText.length > 0) {
        reports += `  📝 ${truncateText(cleanedText, 120)}\n`;
      }
    }
    
    reports += `  🔗 <a href="${post.url}">קרא עוד</a>\n\n`;
  });
  
  return reports;
}

// עיצוב דיווחי פורומים בנפרד
function formatForumReports(forumDiscussions) {
  let reports = '';
  
  // סינון דיווחים דומים כדי למנוע חזרות
  const uniqueDiscussions = [];
  const seenTitles = new Set();
  
  for (const discussion of forumDiscussions) {
    // יצירת מפתח ייחודי בהתבסס על כותרת מקוצרת
    const titleKey = discussion.title.substring(0, 30).toLowerCase();
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      uniqueDiscussions.push(discussion);
    }
  }
  
  // הגבלה ל-6 דיווחים ייחודיים (במקום 10) כדי למנוע ספאם
  uniqueDiscussions.slice(0, 6).forEach(discussion => {
    reports += `• <b>${truncateText(discussion.title, 60)}</b>\n`;
    reports += `  📍 ${discussion.source}\n`;
    
    if (discussion.userReports && discussion.userReports.length > 0) {
      reports += `  <b>דיווחי משתמשים:</b>\n`;
      // הגבלה ל-3 דיווחים פנימיים (במקום 8) כדי למנוע עומס
      discussion.userReports.slice(0, 3).forEach(userReport => {
        const sentimentEmoji = getSentimentEmoji(userReport.sentiment);
        reports += `    ${sentimentEmoji} <i>"${userReport.content}"</i>\n`;
      });
    } else {
      reports += `  📝 <i>אין דיווחי משתמשים ספציפיים</i>\n`;
    }
    
    reports += `  🔗 <a href="${discussion.url}">קרא עוד</a>\n\n`;
  });
  
  if (uniqueDiscussions.length === 0) {
    reports = `לא נמצאו דיווחי משתמשים ספציפיים לעדכון זה.\nמומלץ לבדוק בפורומים ידנית או להמתין למידע נוסף.\n`;
  }
  
  return reports;
}



// פונקציה לתרגום תוכן לעברית
function translateToHebrew(text) {
  if (!text) return text;
  
  // מילון תרגומים בסיסי
  const translations = {
    'Android': 'אנדרואיד',
    'android': 'אנדרואיד',
    'Update': 'עדכון',
    'update': 'עדכון',
    'updates': 'עדכונים',
    'Device': 'מכשיר',
    'device': 'מכשיר',
    'devices': 'מכשירים',
    'Phone': 'טלפון',
    'phone': 'טלפון',
    'Smartphone': 'סמארטפון',
    'smartphone': 'סמארטפון',
    'Battery': 'סוללה',
    'battery': 'סוללה',
    'Performance': 'ביצועים',
    'performance': 'ביצועים',
    'Camera': 'מצלמה',
    'camera': 'מצלמה',
    'Screen': 'מסך',
    'screen': 'מסך',
    'Display': 'תצוגה',
    'display': 'תצוגה',
    'Bug': 'באג',
    'bug': 'באג',
    'bugs': 'באגים',
    'Issue': 'בעיה',
    'issue': 'בעיה',
    'issues': 'בעיות',
    'Problem': 'בעיה',
    'problem': 'בעיה',
    'problems': 'בעיות',
    'Fix': 'תיקון',
    'fix': 'תיקון',
    'fixes': 'תיקונים',
    'Feature': 'תכונה',
    'feature': 'תכונה',
    'features': 'תכונות',
    'Security': 'אבטחה',
    'security': 'אבטחה',
    'Stable': 'יציב',
    'stable': 'יציב',
    'Beta': 'בטא',
    'beta': 'בטא',
    'Release': 'שחרור',
    'release': 'שחרור',
    'Version': 'גרסה',
    'version': 'גרסה',
    'Software': 'תוכנה',
    'software': 'תוכנה',
    'System': 'מערכת',
    'system': 'מערכת',
    'User': 'משתמש',
    'user': 'משתמש',
    'users': 'משתמשים',
    'Experience': 'חוויה',
    'experience': 'חוויה',
    'Review': 'ביקורת',
    'review': 'ביקורת',
    'reviews': 'ביקורות',
    'Rating': 'דירוג',
    'rating': 'דירוג',
    'Good': 'טוב',
    'good': 'טוב',
    'Bad': 'רע',
    'bad': 'רע',
    'Better': 'יותר טוב',
    'better': 'יותר טוב',
    'Worse': 'יותר גרוע',
    'worse': 'יותר גרוע',
    'Fast': 'מהיר',
    'fast': 'מהיר',
    'Slow': 'איטי',
    'slow': 'איטי',
    'New': 'חדש',
    'new': 'חדש',
    'Old': 'ישן',
    'old': 'ישן',
    'Latest': 'אחרון',
    'latest': 'אחרון',
    'Recent': 'אחרון',
    'recent': 'אחרון'
  };
  
  let translatedText = text;
  
  // החלפת מילים לפי המילון
  for (const [english, hebrew] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedText = translatedText.replace(regex, hebrew);
  }
  
  return translatedText;
}

// עיצוב תשובה סופית עם פיצול אוטומטי
function formatResponseWithSplit(deviceInfo, updateInfo, recommendation) {
  // יצירת ההודעה הראשית (בלי דיווחי משתמשים)
  const mainResponse = formatMainResponse(deviceInfo, updateInfo, recommendation);
  const messages = [mainResponse];
  
  // הוספת דיווחי משתמשים כהודעות נפרדות
  if (updateInfo && updateInfo.searchResults && hasUserReports(updateInfo.searchResults)) {
    const reportSections = splitUserReports(updateInfo.searchResults);
    
    reportSections.forEach(section => {
      let sectionMessage = `<b>${section.title}</b>\n\n${section.content}`;
      
      // פיצול נוסף אם החלק עדיין ארוך מדי
      const splitSectionMessages = splitLongMessage(sectionMessage);
      messages.push(...splitSectionMessages);
    });
  }
  
  return messages;
}

// עיצוב התשובה הראשית (בלי דיווחי משתמשים)
function formatMainResponse(deviceInfo, updateInfo, recommendation) {
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
  
  // הודעה על דיווחי משתמשים
  if (updateInfo && updateInfo.searchResults && hasUserReports(updateInfo.searchResults)) {
    const reportSections = splitUserReports(updateInfo.searchResults);
    const numReports = reportSections.length;
    
    if (numReports > 0) {
      response += `📢 <b>דיווחי משתמשים יישלחו ב-${numReports} הודעות נפרדות...</b>\n\n`;
    }
  }
  
  response += `❓ <b>שאלות נוספות?</b> שלחו /help לעזרה מפורטת`;
  
  return response;
}

// בדיקת אורך הודעה
function checkMessageLength(message) {
  const length = message.length;
  const isValid = length <= TELEGRAM_MESSAGE_LIMIT;
  
  if (!isValid) {
    console.warn(`⚠️ Message too long: ${length} characters (limit: ${TELEGRAM_MESSAGE_LIMIT})`);
  }
  
  return {
    length,
    isValid,
    remaining: TELEGRAM_MESSAGE_LIMIT - length
  };
}

// לוג פרטי הודעות מפוצלות
function logMessageSplit(messages) {
  console.log(`📨 Split message into ${messages.length} parts:`);
  messages.forEach((msg, index) => {
    console.log(`  Part ${index + 1}: ${msg.length} characters`);
  });
}

module.exports = {
  parseUserMessage,
  formatResponse,
  formatResponseWithSplit, // הפונקציה החדשה
  splitLongMessage,        // פונקציות עזר חדשות
  checkMessageLength,      // פונקציות דיבאג חדשות
  logMessageSplit,
  translateToHebrew,       // פונקציה חדשה לתרגום
  stripHtml,
  truncateText,
  cleanText,
  isValidUrl,
  timeAgo,
  generateHash,
  validateDeviceQuery,
  generateQueryId,
  formatDebugInfo,
  // פונקציות לטיפול בדיווחי משתמשים
  splitUserReports,
  formatForumReports,
  hasUserReports
};
