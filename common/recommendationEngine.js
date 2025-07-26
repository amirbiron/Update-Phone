const { format, subDays } = require('date-fns');

class RecommendationEngine {
  constructor() {
    this.weights = {
      stabilityRating: 0.4,
      deviceAge: 0.2,
      manufacturerHistory: 0.2,
      marketSegment: 0.1,
      timeFromRelease: 0.1
    };
    
    this.manufacturerProfiles = this.initializeManufacturerProfiles();
  }

  // פרופילים של יצרנים בהתבסס על היסטוריה
  initializeManufacturerProfiles() {
    return {
      samsung: {
        averageStability: 7.2,
        quickFixTime: 14, // ימים
        majorIssueFrequency: 0.3,
        reliabilityScore: 8.5,
        notes: 'סמסונג נוהגת לשחרר עדכוני תיקון מהר יחסית'
      },
      google: {
        averageStability: 8.1,
        quickFixTime: 7,
        majorIssueFrequency: 0.2,
        reliabilityScore: 9.0,
        notes: 'פיקסל מקבלים עדכונים ישירות מגוגל ובדרך כלל יציבים'
      },
      xiaomi: {
        averageStability: 6.8,
        quickFixTime: 21,
        majorIssueFrequency: 0.4,
        reliabilityScore: 7.0,
        notes: 'MIUI לעיתים מציגה בעיות ב adaptation לאנדרואיד חדש'
      },
      oneplus: {
        averageStability: 7.5,
        quickFixTime: 18,
        majorIssueFrequency: 0.25,
        reliabilityScore: 7.8,
        notes: 'OnePlus משפרת עם הזמן אבל עדכונים ראשוניים עלולים להיות בעייתיים'
      }
    };
  }

  // יצירת המלצה עיקרית
  async generateRecommendation(deviceInfo, updateInfo, parsedQuery) {
    try {
      // בדיקה אם updateInfo קיים ולא null
      if (!updateInfo) {
        console.error('❌ [RecommendationEngine] updateInfo is null or undefined');
        return this.getDefaultRecommendation(deviceInfo);
      }

      const analysis = updateInfo.analysis;
      
      // בדיקה אם analysis קיים ולא null
      if (!analysis) {
        console.error('❌ [RecommendationEngine] updateInfo.analysis is null or undefined');
        return this.getDefaultRecommendation(deviceInfo);
      }

      console.log(`🎯 [RecommendationEngine] Processing analysis type: ${typeof analysis}`);
      console.log(`📊 [RecommendationEngine] Analysis preview: ${JSON.stringify(analysis).substring(0, 100)}...`);
      
      // חישוב ציון המלצה משוקלל
      const recommendationScore = this.calculateRecommendationScore(deviceInfo, analysis);
      
      // קביעת המלצה בסיסית
      const baseRecommendation = this.getBaseRecommendation(recommendationScore, analysis);
      
      // התאמות ספציפיות
      const adjustedRecommendation = this.adjustRecommendation(
        baseRecommendation, 
        deviceInfo, 
        analysis
      );
      
      // יצירת הסבר מפורט
      const reasoning = this.generateReasoning(deviceInfo, analysis, adjustedRecommendation);
      
      // הערות מיוחדות
      const specialNotes = this.generateSpecialNotes(deviceInfo, analysis);
      
      // המלצות למשתמשים שונים
      const userTypeRecommendations = this.generateUserTypeRecommendations(
        adjustedRecommendation,
        deviceInfo,
        analysis
      );

      return {
        recommendation: adjustedRecommendation.action,
        confidence: adjustedRecommendation.confidence,
        stabilityRating: analysis.stabilityRating || 6,
        score: recommendationScore,
        reasoning: reasoning,
        benefits: this.extractBenefits(analysis),
        risks: this.extractRisks(analysis),
        timeline: this.generateTimeline(adjustedRecommendation, deviceInfo),
        specialNotes: specialNotes,
        userTypeRecommendations: userTypeRecommendations,
        lastUpdated: new Date(),
        sources: updateInfo.sources || []
      };

    } catch (error) {
      console.error('Error generating recommendation:', error?.message || error);
      return this.getFallbackRecommendation(deviceInfo, parsedQuery);
    }
  }

  // חישוב ציון המלצה משוקלל
  calculateRecommendationScore(deviceInfo, analysis) {
    let score = 0;
    
    // ציון יציבות (0-10)
    const stabilityScore = (analysis.stabilityRating || 6) / 10;
    score += stabilityScore * this.weights.stabilityRating;
    
    // ציון גיל מכשיר
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    const ageScore = Math.max(0, (5 - deviceAge) / 5); // ככל שהמכשיר ישן יותר, הציון נמוך יותר
    score += ageScore * this.weights.deviceAge;
    
    // ציון היסטוריית יצרן
    const manufacturerProfile = this.manufacturerProfiles[deviceInfo.manufacturerKey] || {};
    const manufacturerScore = (manufacturerProfile.reliabilityScore || 7) / 10;
    score += manufacturerScore * this.weights.manufacturerHistory;
    
    // ציון מגזר שוק
    const segmentScore = this.getSegmentScore(deviceInfo.marketSegment);
    score += segmentScore * this.weights.marketSegment;
    
    // ציון זמן מאז השחרור (אם יש מידע)
    const timeScore = 0.7; // ברירת מחדל
    score += timeScore * this.weights.timeFromRelease;
    
    return Math.round(score * 100) / 100;
  }

  // ציון מגזר שוק
  getSegmentScore(segment) {
    const scores = {
      flagship: 0.9,
      'mid-range': 0.7,
      'entry-level': 0.5
    };
    
    return scores[segment] || 0.6;
  }

  // קביעת המלצה בסיסית
  getBaseRecommendation(score, analysis) {
    let action, confidence;
    
    if (score >= 0.8) {
      action = 'recommended';
      confidence = 'high';
    } else if (score >= 0.6) {
      action = 'recommended_with_caution';
      confidence = 'medium';
    } else if (score >= 0.4) {
      action = 'wait';
      confidence = 'medium';
    } else {
      action = 'not_recommended';
      confidence = 'high';
    }
    
    // התאמה לפי המלצת הניתוח
    if (analysis.recommendation === 'not_recommended') {
      action = 'not_recommended';
      confidence = 'high';
    } else if (analysis.recommendation === 'wait' && action === 'recommended') {
      action = 'recommended_with_caution';
      confidence = 'medium';
    }
    
    return { action, confidence };
  }

  // התאמות ספציפיות
  adjustRecommendation(baseRecommendation, deviceInfo, analysis) {
    let adjusted = { ...baseRecommendation };
    
    // מכשירים ישנים - זהירות מוגברת
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    if (deviceAge > 3 && adjusted.action === 'recommended') {
      adjusted.action = 'recommended_with_caution';
      adjusted.confidence = 'medium';
    }
    
    // אם יש בעיות מדווחות רבות
    if (analysis.majorIssues && analysis.majorIssues.length > 3) {
      if (adjusted.action === 'recommended') {
        adjusted.action = 'wait';
      }
      adjusted.confidence = 'medium';
    }
    
    // מכשירים בסוף החיים
    if (deviceInfo.expectedSupport && deviceInfo.expectedSupport.status === 'end-of-life') {
      adjusted.action = 'not_recommended';
      adjusted.confidence = 'high';
    }
    
    return adjusted;
  }

  // יצירת הסבר
  generateReasoning(deviceInfo, analysis, recommendation) {
    let reasoning = [];
    
    // הסבר בסיסי
    switch (recommendation.action) {
      case 'recommended':
        reasoning.push('העדכון נראה יציב ומומלץ להתקנה');
        break;
      case 'recommended_with_caution':
        reasoning.push('העדכון נראה בסדר בכללותו, אך כדאי זהירות');
        break;
      case 'wait':
        reasoning.push('מומלץ להמתין לעדכון נוסף או למידע יותר ברור');
        break;
      case 'not_recommended':
        reasoning.push('לא מומלץ לעדכן כרגע עקב בעיות מדווחות');
        break;
    }
    
    // הסבר לפי יציבות
    if (analysis.stabilityRating) {
      if (analysis.stabilityRating >= 8) {
        reasoning.push('דירוג יציבות גבוה מהממוצע');
      } else if (analysis.stabilityRating <= 5) {
        reasoning.push('דירוג יציבות נמוך מהממוצע');
      }
    }
    
    // הסבר לפי גיל מכשיר
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    if (deviceAge <= 1) {
      reasoning.push('מכשיר חדש עם תמיכה מלאה');
    } else if (deviceAge >= 4) {
      reasoning.push('מכשיר ישן יחסית - יש לשקול בזהירות');
    }
    
    // הסבר לפי היסטוריית יצרן
    const manufacturerProfile = this.manufacturerProfiles[deviceInfo.manufacturerKey];
    if (manufacturerProfile) {
      if (manufacturerProfile.reliabilityScore >= 8.5) {
        reasoning.push(`${deviceInfo.manufacturer} בעל מוניטין טוב בעדכונים`);
      } else if (manufacturerProfile.reliabilityScore <= 7) {
        reasoning.push(`${deviceInfo.manufacturer} לעיתים מציג בעיות בעדכונים`);
      }
    }
    
    return reasoning.join('. ') + '.';
  }

  // חילוץ יתרונות
  extractBenefits(analysis) {
    const benefits = analysis.benefits || [];
    
    // יתרונות ברירת מחדל
    const defaultBenefits = [
      'עדכוני אבטחה חדשים',
      'שיפורי ביצועים',
      'תיקוני באגים',
      'תכונות חדשות'
    ];
    
    return benefits.length > 0 ? benefits : defaultBenefits;
  }

  // חילוץ סיכונים
  extractRisks(analysis) {
    const risks = analysis.majorIssues || [];
    
    if (risks.length === 0) {
      return ['לא נמצאו בעיות משמעותיות'];
    }
    
    return risks;
  }

  // יצירת לוח זמנים
  generateTimeline(recommendation, deviceInfo) {
    const now = new Date();
    
    switch (recommendation.action) {
      case 'recommended':
        return {
          action: 'עדכנו עכשיו',
          timeframe: 'מיידי',
          nextCheck: null
        };
        
      case 'recommended_with_caution':
        return {
          action: 'עדכנו בזהירות',
          timeframe: 'מיידי עם גיבוי',
          nextCheck: null
        };
        
      case 'wait':
        const waitDays = this.getWaitDays(deviceInfo);
        return {
          action: 'המתינו',
          timeframe: `${waitDays} ימים`,
          nextCheck: format(subDays(now, -waitDays), 'dd/MM/yyyy'),
          reason: 'להמתין למידע נוסף או עדכון תיקון'
        };
        
      case 'not_recommended':
        return {
          action: 'אל תעדכנו',
          timeframe: 'לא מומלץ כרגע',
          nextCheck: format(subDays(now, -30), 'dd/MM/yyyy'),
          reason: 'בעקבות בעיות מדווחות'
        };
        
      default:
        return {
          action: 'בדקו שוב',
          timeframe: 'לא ברור',
          nextCheck: format(subDays(now, -7), 'dd/MM/yyyy')
        };
    }
  }

  // חישוב ימי המתנה
  getWaitDays(deviceInfo) {
    const manufacturerProfile = this.manufacturerProfiles[deviceInfo.manufacturerKey];
    
    if (manufacturerProfile) {
      return manufacturerProfile.quickFixTime;
    }
    
    return 14; // ברירת מחדל
  }

  // הערות מיוחדות
  generateSpecialNotes(deviceInfo, analysis) {
    const notes = [];
    
    // הערות לפי יצרן
    const manufacturerProfile = this.manufacturerProfiles[deviceInfo.manufacturerKey];
    if (manufacturerProfile && manufacturerProfile.notes) {
      notes.push(manufacturerProfile.notes);
    }
    
    // הערות לפי גיל מכשיר
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    if (deviceAge > 3) {
      notes.push('מכשיר ישן יחסית - עדכונים עתידיים עלולים להיות מוגבלים');
    }
    
    // הערות לפי מגזר שוק
    if (deviceInfo.marketSegment === 'entry-level') {
      notes.push('מכשיר בכניסה לשוק - עדכונים עלולים להשפיע על ביצועים');
    }
    
    // הערות אבטחה
    notes.push('מומלץ תמיד לבצע גיבוי מלא לפני עדכון');
    
    return notes;
  }

  // המלצות לפי סוג משתמש
  generateUserTypeRecommendations(recommendation, deviceInfo, analysis) {
    return {
      technicalUser: {
        recommendation: recommendation.action,
        note: 'משתמש טכני יכול להתמודד עם בעיות אפשריות',
        additionalTips: ['בצעו גיבוי מלא', 'הכינו כלים לחזרה לגרסה קודמת']
      },
      regularUser: {
        recommendation: this.getConservativeRecommendation(recommendation.action),
        note: 'מומלץ זהירות מוגברת למשתמש רגיל',
        additionalTips: ['חכו לחוות דעת נוספות', 'בצעו עדכון בזמן פנוי']
      },
      businessUser: {
        recommendation: this.getBusinessRecommendation(recommendation.action),
        note: 'עבור שימוש עסקי חשוב יציבות מוחלטת',
        additionalTips: ['בדקו תאימות אפליקציות עסקיות', 'תאמו עם מנהל IT']
      }
    };
  }

  // המלצה שמרנית
  getConservativeRecommendation(action) {
    const conservative = {
      'recommended': 'recommended_with_caution',
      'recommended_with_caution': 'wait',
      'wait': 'wait',
      'not_recommended': 'not_recommended'
    };
    
    return conservative[action] || 'wait';
  }

  // המלצה עסקית
  getBusinessRecommendation(action) {
    const business = {
      'recommended': 'wait',
      'recommended_with_caution': 'wait',
      'wait': 'wait',
      'not_recommended': 'not_recommended'
    };
    
    return business[action] || 'wait';
  }

  // המלצה חלופית
  getFallbackRecommendation(deviceInfo, parsedQuery) {
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    
    let action = 'wait';
    let confidence = 'low';
    
    if (deviceAge > 4) {
      action = 'not_recommended';
      confidence = 'medium';
    } else if (deviceInfo.marketSegment === 'flagship' && deviceAge <= 2) {
      action = 'recommended_with_caution';
      confidence = 'medium';
    }
    
    return {
      recommendation: action,
      confidence: confidence,
      stabilityRating: 5,
      score: 0.5,
      reasoning: 'המלצה בסיסית בהעדר מידע מפורט',
      benefits: ['עדכוני אבטחה'],
      risks: ['מידע מוגבל זמין'],
      timeline: {
        action: 'בדקו מקורות נוספים',
        timeframe: 'לא ברור',
        nextCheck: format(subDays(new Date(), -7), 'dd/MM/yyyy')
      },
      specialNotes: ['לא נאסף מספיק מידע לניתוח מקיף'],
      userTypeRecommendations: {
        technicalUser: { recommendation: action, note: 'בדקו מקורות נוספים' },
        regularUser: { recommendation: 'wait', note: 'חכו למידע נוסף' },
        businessUser: { recommendation: 'wait', note: 'חכו לניתוח מקיף יותר' }
      },
      lastUpdated: new Date(),
      sources: []
    };
  }

  // פונקציה לטיפול במקרים שבהם updateInfo הוא null
  getDefaultRecommendation(deviceInfo) {
    console.log('⚠️ [RecommendationEngine] Generating default recommendation due to missing updateInfo');
    
    return {
      recommendation: 'wait',
      confidence: 3,
      stabilityRating: 5,
      score: 0.3,
      reasoning: 'לא ניתן היה לאסוף מידע מספיק על העדכון. מומלץ לחכות ולנסות שוב מאוחר יותר או לבדוק באופן ידני.',
      benefits: ['עדכוני אבטחה חשובים'],
      risks: ['מידע מוגבל זמין', 'לא ניתן לבצע ניתוח מקיף'],
      timeline: {
        action: 'נסו שוב מאוחר יותר או בדקו מקורות רשמיים',
        timeframe: 'תוך מספר שעות',
        nextCheck: new Date(Date.now() + 6 * 60 * 60 * 1000).toLocaleDateString('he-IL') // 6 שעות
      },
      specialNotes: [
        'שגיאה בטעינת מידע העדכון',
        'מומלץ לבדוק באתר היצרן הרשמי',
        'נסו שוב מאוחר יותר'
      ],
      userTypeRecommendations: {
        technicalUser: { 
          recommendation: 'investigate', 
          note: 'בדקו מקורות רשמיים ופורומים טכניים' 
        },
        regularUser: { 
          recommendation: 'wait', 
          note: 'חכו למידע נוסף או פנו לתמיכה טכנית' 
        },
        businessUser: { 
          recommendation: 'wait', 
          note: 'המתינו לניתוח מקיף יותר לפני עדכון מערכות קריטיות' 
        }
      },
      lastUpdated: new Date(),
      sources: []
    };
  }
}

module.exports = RecommendationEngine;
