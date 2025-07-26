const axios = require('axios');

class DeviceAnalyzer {
  constructor() {
    this.deviceDatabase = this.initializeDeviceDatabase();
  }

  // מסד נתונים של מכשירים פופולריים
  initializeDeviceDatabase() {
    return {
      samsung: {
        aliases: ['samsung', 'galaxy'],
        devices: {
          's24': { fullName: 'Galaxy S24', series: 'S', year: 2024, codename: 'muse' },
          's24+': { fullName: 'Galaxy S24+', series: 'S', year: 2024, codename: 'muse1' },
          's24 ultra': { fullName: 'Galaxy S24 Ultra', series: 'S', year: 2024, codename: 'muse2' },
          's23': { fullName: 'Galaxy S23', series: 'S', year: 2023, codename: 'dm1q' },
          's23+': { fullName: 'Galaxy S23+', series: 'S', year: 2023, codename: 'dm2q' },
          's23 ultra': { fullName: 'Galaxy S23 Ultra', series: 'S', year: 2023, codename: 'dm3q' },
          's22': { fullName: 'Galaxy S22', series: 'S', year: 2022, codename: 'dm1q' },
          's22+': { fullName: 'Galaxy S22+', series: 'S', year: 2022, codename: 'dm2q' },
          's22 ultra': { fullName: 'Galaxy S22 Ultra', series: 'S', year: 2022, codename: 'dm3q' },
          's21': { fullName: 'Galaxy S21', series: 'S', year: 2021, codename: 'o1s' },
          's21+': { fullName: 'Galaxy S21+', series: 'S', year: 2021, codename: 'o1s' },
          's21 ultra': { fullName: 'Galaxy S21 Ultra', series: 'S', year: 2021, codename: 'o1s' },
          's20': { fullName: 'Galaxy S20', series: 'S', year: 2020, codename: 'x1s' },
          's20+': { fullName: 'Galaxy S20+', series: 'S', year: 2020, codename: 'y2s' },
          's20 ultra': { fullName: 'Galaxy S20 Ultra', series: 'S', year: 2020, codename: 'z3s' },
          's10': { fullName: 'Galaxy S10', series: 'S', year: 2019, codename: 'beyond1' },
          's10+': { fullName: 'Galaxy S10+', series: 'S', year: 2019, codename: 'beyond2' },
          's10e': { fullName: 'Galaxy S10e', series: 'S', year: 2019, codename: 'beyond0' },
          's10 ultra': { fullName: 'Galaxy S10 Ultra (Tablet)', series: 'Tab', year: 2019, codename: 'gts4lv', isTablet: true },
          'tab s10 ultra': { fullName: 'Galaxy Tab S10 Ultra', series: 'Tab', year: 2024, codename: 'gts10u', isTablet: true },
          'tab s10+': { fullName: 'Galaxy Tab S10+', series: 'Tab', year: 2024, codename: 'gts10p', isTablet: true },
          'tab s10': { fullName: 'Galaxy Tab S10', series: 'Tab', year: 2024, codename: 'gts10', isTablet: true },
          'tab s9 ultra': { fullName: 'Galaxy Tab S9 Ultra', series: 'Tab', year: 2023, codename: 'gts9u', isTablet: true },
          'tab s9+': { fullName: 'Galaxy Tab S9+', series: 'Tab', year: 2023, codename: 'gts9p', isTablet: true },
          'tab s9': { fullName: 'Galaxy Tab S9', series: 'Tab', year: 2023, codename: 'gts9', isTablet: true },
          'tab s8 ultra': { fullName: 'Galaxy Tab S8 Ultra', series: 'Tab', year: 2022, codename: 'gts8u', isTablet: true },
          'tab s8+': { fullName: 'Galaxy Tab S8+', series: 'Tab', year: 2022, codename: 'gts8p', isTablet: true },
          'tab s8': { fullName: 'Galaxy Tab S8', series: 'Tab', year: 2022, codename: 'gts8', isTablet: true },
          'tab s7+': { fullName: 'Galaxy Tab S7+', series: 'Tab', year: 2020, codename: 'gts7l', isTablet: true },
          'tab s7': { fullName: 'Galaxy Tab S7', series: 'Tab', year: 2020, codename: 'gts7', isTablet: true },
          'tab a9+': { fullName: 'Galaxy Tab A9+', series: 'Tab A', year: 2023, codename: 'gta9p', isTablet: true },
          'tab a8': { fullName: 'Galaxy Tab A8', series: 'Tab A', year: 2021, codename: 'gta8', isTablet: true },
          'a54': { fullName: 'Galaxy A54', series: 'A', year: 2023, codename: 'a54x' },
          'a53': { fullName: 'Galaxy A53', series: 'A', year: 2022, codename: 'a53x' },
          'a52': { fullName: 'Galaxy A52', series: 'A', year: 2021, codename: 'a52q' },
          'a34': { fullName: 'Galaxy A34', series: 'A', year: 2023, codename: 'a34x' },
          'a33': { fullName: 'Galaxy A33', series: 'A', year: 2022, codename: 'a33x' },
          'note 20': { fullName: 'Galaxy Note 20', series: 'Note', year: 2020, codename: 'c1s' },
          'note 20 ultra': { fullName: 'Galaxy Note 20 Ultra', series: 'Note', year: 2020, codename: 'c2s' }
        }
      },
      google: {
        aliases: ['google', 'pixel'],
        devices: {
          'pixel 8': { fullName: 'Pixel 8', series: 'Pixel', year: 2023, codename: 'shiba' },
          'pixel 8 pro': { fullName: 'Pixel 8 Pro', series: 'Pixel', year: 2023, codename: 'husky' },
          'pixel 7': { fullName: 'Pixel 7', series: 'Pixel', year: 2022, codename: 'panther' },
          'pixel 7 pro': { fullName: 'Pixel 7 Pro', series: 'Pixel', year: 2022, codename: 'cheetah' },
          'pixel 7a': { fullName: 'Pixel 7a', series: 'Pixel', year: 2023, codename: 'lynx' },
          'pixel 6': { fullName: 'Pixel 6', series: 'Pixel', year: 2021, codename: 'oriole' },
          'pixel 6 pro': { fullName: 'Pixel 6 Pro', series: 'Pixel', year: 2021, codename: 'raven' },
          'pixel 6a': { fullName: 'Pixel 6a', series: 'Pixel', year: 2022, codename: 'bluejay' },
          'pixel 5': { fullName: 'Pixel 5', series: 'Pixel', year: 2020, codename: 'redfin' },
          'pixel 5a': { fullName: 'Pixel 5a', series: 'Pixel', year: 2021, codename: 'barbet' },
          'pixel tablet': { fullName: 'Pixel Tablet', series: 'Pixel', year: 2023, codename: 'tangorpro', isTablet: true }
        }
      },
      xiaomi: {
        aliases: ['xiaomi', 'mi', 'redmi', 'poco'],
        devices: {
          '14': { fullName: 'Xiaomi 14', series: 'Mi', year: 2024, codename: 'houji' },
          '13': { fullName: 'Xiaomi 13', series: 'Mi', year: 2023, codename: 'fuxi' },
          '13 pro': { fullName: 'Xiaomi 13 Pro', series: 'Mi', year: 2023, codename: 'nuwa' },
          '12': { fullName: 'Xiaomi 12', series: 'Mi', year: 2022, codename: 'cupid' },
          '12 pro': { fullName: 'Xiaomi 12 Pro', series: 'Mi', year: 2022, codename: 'zeus' },
          'redmi note 13': { fullName: 'Redmi Note 13', series: 'Redmi', year: 2024, codename: 'sapphire' },
          'redmi note 12': { fullName: 'Redmi Note 12', series: 'Redmi', year: 2023, codename: 'tapas' },
          'pad 6': { fullName: 'Xiaomi Pad 6', series: 'Pad', year: 2023, codename: 'pipa', isTablet: true },
          'pad 5': { fullName: 'Xiaomi Pad 5', series: 'Pad', year: 2021, codename: 'nabu', isTablet: true },
          'redmi pad': { fullName: 'Redmi Pad', series: 'Redmi', year: 2022, codename: 'dagu', isTablet: true },
          'redmi note 11': { fullName: 'Redmi Note 11', series: 'Redmi', year: 2022, codename: 'spes' },
          'poco f5': { fullName: 'POCO F5', series: 'POCO', year: 2023, codename: 'marble' },
          'poco f4': { fullName: 'POCO F4', series: 'POCO', year: 2022, codename: 'munch' },
          'poco x5': { fullName: 'POCO X5', series: 'POCO', year: 2023, codename: 'moonstone' }
        }
      },
      oneplus: {
        aliases: ['oneplus', 'op'],
        devices: {
          '12': { fullName: 'OnePlus 12', series: 'OnePlus', year: 2024, codename: 'pineapple' },
          '11': { fullName: 'OnePlus 11', series: 'OnePlus', year: 2023, codename: 'salami' },
          '10 pro': { fullName: 'OnePlus 10 Pro', series: 'OnePlus', year: 2022, codename: 'ne2213' },
          '9': { fullName: 'OnePlus 9', series: 'OnePlus', year: 2021, codename: 'lemonade' },
          '9 pro': { fullName: 'OnePlus 9 Pro', series: 'OnePlus', year: 2021, codename: 'lemonadep' },
          'nord 3': { fullName: 'OnePlus Nord 3', series: 'Nord', year: 2023, codename: 'larry' },
          'nord 2': { fullName: 'OnePlus Nord 2', series: 'Nord', year: 2021, codename: 'denniz' }
        }
      },
      oppo: {
        aliases: ['oppo', 'find', 'reno'],
        devices: {
          'find x5': { fullName: 'Oppo Find X5', series: 'Find', year: 2022, codename: 'generic' },
          'find x6': { fullName: 'Oppo Find X6', series: 'Find', year: 2023, codename: 'generic' },
          'reno 10': { fullName: 'Oppo Reno 10', series: 'Reno', year: 2023, codename: 'generic' },
          'reno 11': { fullName: 'Oppo Reno 11', series: 'Reno', year: 2024, codename: 'generic' }
        }
      },
      vivo: {
        aliases: ['vivo'],
        devices: {
          'v29 pro': { fullName: 'Vivo V29 Pro', series: 'V', year: 2023, codename: 'generic' },
          'v30 pro': { fullName: 'Vivo V30 Pro', series: 'V', year: 2024, codename: 'generic' },
          'x90 pro': { fullName: 'Vivo X90 Pro', series: 'X', year: 2023, codename: 'generic' }
        }
      },
      realme: {
        aliases: ['realme', 'gt'],
        devices: {
          'gt neo 5': { fullName: 'Realme GT Neo 5', series: 'GT', year: 2023, codename: 'generic' },
          'gt 3': { fullName: 'Realme GT 3', series: 'GT', year: 2023, codename: 'generic' },
          'gt 2': { fullName: 'Realme GT 2', series: 'GT', year: 2022, codename: 'generic' }
        }
      },
      honor: {
        aliases: ['honor'],
        devices: {
          '90 pro': { fullName: 'Honor 90 Pro', series: 'Honor', year: 2023, codename: 'generic' },
          '80 pro': { fullName: 'Honor 80 Pro', series: 'Honor', year: 2022, codename: 'generic' },
          '70 pro': { fullName: 'Honor 70 Pro', series: 'Honor', year: 2022, codename: 'generic' }
        }
      },
      nothing: {
        aliases: ['nothing', 'phone'],
        devices: {
          'phone 1': { fullName: 'Nothing Phone 1', series: 'Phone', year: 2022, codename: 'generic' },
          'phone 2': { fullName: 'Nothing Phone 2', series: 'Phone', year: 2023, codename: 'generic' }
        }
      },
      sony: {
        aliases: ['sony', 'xperia'],
        devices: {
          '1 v': { fullName: 'Sony Xperia 1 V', series: 'Xperia', year: 2023, codename: 'generic' },
          '5 v': { fullName: 'Sony Xperia 5 V', series: 'Xperia', year: 2023, codename: 'generic' },
          '10 v': { fullName: 'Sony Xperia 10 V', series: 'Xperia', year: 2023, codename: 'generic' }
        }
      }
    };
  }

  // ניתוח והזהה המכשיר מההודעה
  async analyzeDevice(parsedQuery) {
    try {
      const { manufacturer, device, version } = parsedQuery;
      
      // זיהוי היצרן
      let manufacturerInfo = this.identifyManufacturer(manufacturer);
      
      // אם לא נמצא היצרן במסד הנתונים, ניצור אחד כללי
      if (!manufacturerInfo) {
        manufacturerInfo = this.createGenericManufacturer(manufacturer);
      }

      // זיהוי המכשיר
      let deviceInfo = this.identifyDevice(manufacturerInfo, device);
      
      // אם לא נמצא המכשיר במסד הנתונים, ניצור אחד כללי
      if (!deviceInfo) {
        deviceInfo = this.createGenericDevice(device);
      }

      // אימות גרסת אנדרואיד
      const androidVersion = this.parseAndroidVersion(version);
      
      const result = {
        isValid: true,
        manufacturer: manufacturerInfo.name,
        manufacturerKey: manufacturerInfo.key,
        device: deviceInfo.fullName,
        deviceKey: deviceInfo.key,
        deviceSeries: deviceInfo.series,
        deviceYear: deviceInfo.year,
        codename: deviceInfo.codename,
        androidVersion: androidVersion,
        searchTerms: this.generateSearchTerms(manufacturerInfo, deviceInfo, androidVersion),
        updateHistory: await this.getUpdateHistory(manufacturerInfo.key, deviceInfo.key),
        marketSegment: this.getMarketSegment(deviceInfo),
        expectedSupport: this.getExpectedSupport(deviceInfo)
      };

      return result;

    } catch (error) {
      console.error('Error analyzing device:', error?.message || error);
      return { isValid: false, error: 'Analysis failed' };
    }
  }

  // זיהוי היצרן
  identifyManufacturer(manufacturerText) {
    if (!manufacturerText) return null;
    
    const text = manufacturerText.toLowerCase().trim();
    
    for (const [key, data] of Object.entries(this.deviceDatabase)) {
      if (data.aliases.some(alias => text.includes(alias))) {
        return {
          key: key,
          name: this.capitalizeManufacturer(key),
          data: data
        };
      }
    }
    
    return null;
  }

  // זיהוי המכשיר
  identifyDevice(manufacturerInfo, deviceText) {
    const text = deviceText.toLowerCase().trim();
    
    // אם אין מסד נתונים (יצרן כללי), נחזיר null
    if (!manufacturerInfo.data || !manufacturerInfo.data.devices) {
      return null;
    }
    
    const devices = manufacturerInfo.data.devices;
    
    // חיפוש מדויק - עדיפות לטאבלטים אם מוזכר "tab"
    const isTabletQuery = text.includes('tab') || text.includes('tablet') || text.includes('טאבלט');
    
    for (const [key, deviceData] of Object.entries(devices)) {
      if (text.includes(key.toLowerCase())) {
        // אם זה שאילתת טאבלט, נעדיף התאמה לטאבלט
        if (isTabletQuery && deviceData.isTablet) {
          return {
            key: key,
            ...deviceData
          };
        }
        // אם זה לא שאילתת טאבלט ולא מכשיר טאבלט, נחזיר
        if (!isTabletQuery && !deviceData.isTablet) {
          return {
            key: key,
            ...deviceData
          };
        }
        // אם זה ההתאמה הראשונה ואין התנגשות, נחזיר
        if (!deviceData.isTablet || isTabletQuery) {
          return {
            key: key,
            ...deviceData
          };
        }
      }
    }
    
    // חיפוש מטושטש
    for (const [key, deviceData] of Object.entries(devices)) {
      const deviceParts = key.toLowerCase().split(' ');
      const textParts = text.split(/[\s\-_]/);
      
      if (deviceParts.every(part => textParts.some(textPart => textPart.includes(part)))) {
        // אותה לוגיקה כמו בחיפוש המדויק
        if (isTabletQuery && deviceData.isTablet) {
          return {
            key: key,
            ...deviceData
          };
        }
        if (!isTabletQuery && !deviceData.isTablet) {
          return {
            key: key,
            ...deviceData
          };
        }
        if (!deviceData.isTablet || isTabletQuery) {
          return {
            key: key,
            ...deviceData
          };
        }
      }
    }
    
    return null;
  }

  // יצירת יצרן כללי למכשירים לא מוכרים
  createGenericManufacturer(manufacturerText) {
    if (!manufacturerText) {
      return {
        key: 'unknown',
        name: 'Unknown',
        data: {
          aliases: ['unknown'],
          devices: {}
        }
      };
    }
    
    const cleanName = this.capitalizeManufacturer(manufacturerText.trim());
    return {
      key: manufacturerText.toLowerCase().trim(),
      name: cleanName,
      data: {
        aliases: [manufacturerText.toLowerCase().trim()],
        devices: {}
      }
    };
  }

  // יצירת מכשיר כללי למכשירים לא מוכרים
  createGenericDevice(deviceText) {
    if (!deviceText) {
      return {
        key: 'unknown',
        fullName: 'Unknown Device',
        series: 'Unknown',
        year: new Date().getFullYear(),
        codename: 'generic'
      };
    }
    
    const cleanName = deviceText.trim();
    const currentYear = new Date().getFullYear();
    
    return {
      key: deviceText.toLowerCase().trim(),
      fullName: cleanName,
      series: 'Unknown',
      year: currentYear,
      codename: 'generic'
    };
  }

  // ניתוח גרסת אנדרואיד
  parseAndroidVersion(versionText) {
    if (!versionText) return null;
    
    const text = versionText.toLowerCase();
    
    // זיהוי גרסאות אנדרואיד
    const androidMatch = text.match(/android\s*(\d+(?:\.\d+)?)/);
    if (androidMatch) {
      return {
        version: androidMatch[1],
        fullText: versionText,
        major: parseInt(androidMatch[1])
      };
    }
    
    // זיהוי גרסאות מותאמות (One UI, MIUI, וכו')
    const customUIMatches = {
      'one ui': text.match(/one\s*ui\s*(\d+(?:\.\d+)?)/),
      'miui': text.match(/miui\s*(\d+(?:\.\d+)?)/),
      'color os': text.match(/color\s*os\s*(\d+(?:\.\d+)?)/),
      'oxygen os': text.match(/oxygen\s*os\s*(\d+(?:\.\d+)?)/),
    };
    
    for (const [ui, match] of Object.entries(customUIMatches)) {
      if (match) {
        return {
          version: match[1],
          customUI: ui,
          fullText: versionText,
          androidEquivalent: this.getAndroidEquivalent(ui, match[1])
        };
      }
    }
    
    // אם לא נמצא מידע ספציפי, נחזיר את הטקסט המקורי
    return {
      fullText: versionText,
      parsed: false
    };
  }

  // המרה של UI מותאם לגרסת אנדרואיד
  getAndroidEquivalent(customUI, version) {
    const equivalents = {
      'one ui': {
        '6.0': '14',
        '5.1': '13',
        '5.0': '13',
        '4.1': '12',
        '4.0': '12'
      },
      'miui': {
        '14': '13',
        '13': '12',
        '12': '11'
      }
    };
    
    return equivalents[customUI]?.[version] || null;
  }

  // יצירת מונחי חיפוש
  generateSearchTerms(manufacturerInfo, deviceInfo, androidVersion) {
    const terms = [];
    
    // מונחים בסיסיים
    terms.push(`${deviceInfo.fullName}`);
    terms.push(`${manufacturerInfo.name} ${deviceInfo.fullName}`);
    
    // אם זה טאבלט, נוסיף גם מונחי חיפוש ספציפיים לטאבלט
    if (deviceInfo.isTablet) {
      terms.push(`${deviceInfo.fullName} tablet`);
      terms.push(`${deviceInfo.fullName} טאבלט`);
      // אם זה S10 Ultra, נוסיף גם ללא המילה "tablet"
      if (deviceInfo.fullName.includes('S10 Ultra')) {
        terms.push('Samsung Galaxy S10 Ultra');
        terms.push('Galaxy S10 Ultra');
      }
    }
    
    // עם גרסת אנדרואיד
    if (androidVersion) {
      terms.push(`${deviceInfo.fullName} ${androidVersion.fullText}`);
      terms.push(`${deviceInfo.fullName} Android ${androidVersion.version || androidVersion.androidEquivalent}`);
      
      // מונחים ספציפיים לטאבלט עם אנדרואיד
      if (deviceInfo.isTablet) {
        terms.push(`${deviceInfo.fullName} tablet Android ${androidVersion.version || androidVersion.androidEquivalent}`);
      }
    }
    
    // מונחי בעיות נפוצות
    const problemTerms = ['issues', 'problems', 'bugs', 'battery drain', 'heating', 'lag'];
    if (deviceInfo.isTablet) {
      // בעיות ספציפיות לטאבלטים
      problemTerms.push('touch issues', 'screen rotation', 'keyboard problems', 'stylus issues');
    }
    
    problemTerms.forEach(term => {
      terms.push(`${deviceInfo.fullName} ${androidVersion?.fullText || ''} ${term}`);
    });
    
    // מונחים בעברית
    terms.push(`${deviceInfo.fullName} בעיות`);
    terms.push(`${deviceInfo.fullName} תקלות`);
    
    if (deviceInfo.isTablet) {
      terms.push(`${deviceInfo.fullName} טאבלט בעיות`);
      terms.push(`${deviceInfo.fullName} בעיות מגע`);
    }
    
    return terms;
  }

  // קבלת היסטוריית עדכונים
  async getUpdateHistory(manufacturer, device) {
    // כאן נוכל להוסיף אינטגרציה עם מסד נתונים או API חיצוני
    // לבינתיים נחזיר מידע בסיסי
    return {
      lastUpdate: null,
      updateFrequency: this.getUpdateFrequency(manufacturer),
      supportStatus: 'active'
    };
  }

  // תדירות עדכונים לפי יצרן
  getUpdateFrequency(manufacturer) {
    const frequencies = {
      samsung: 'monthly',
      google: 'monthly',
      xiaomi: 'bi-monthly',
      oneplus: 'bi-monthly'
    };
    
    return frequencies[manufacturer] || 'quarterly';
  }

  // זיהוי מגזר שוק
  getMarketSegment(deviceInfo) {
    if (deviceInfo.series === 'S' && deviceInfo.year >= 2022) return 'flagship';
    if (deviceInfo.series === 'Pixel' && deviceInfo.year >= 2021) return 'flagship';
    if (deviceInfo.series === 'Mi' && deviceInfo.year >= 2022) return 'flagship';
    if (deviceInfo.series === 'OnePlus' && deviceInfo.year >= 2021) return 'flagship';
    if (deviceInfo.series === 'Note') return 'flagship';
    
    if (deviceInfo.series === 'A' || deviceInfo.series === 'Redmi') return 'mid-range';
    if (deviceInfo.series === 'POCO') return 'mid-range';
    if (deviceInfo.series === 'Nord') return 'mid-range';
    
    return 'entry-level';
  }

  // צפי לתמיכה
  getExpectedSupport(deviceInfo) {
    const currentYear = new Date().getFullYear();
    const deviceAge = currentYear - deviceInfo.year;
    
    let expectedYears = 2; // ברירת מחדל
    
    // תמיכה מורחבת למכשירים מסוימים
    if (deviceInfo.series === 'S' && deviceInfo.year >= 2022) expectedYears = 4;
    if (deviceInfo.series === 'Pixel' && deviceInfo.year >= 2021) expectedYears = 5;
    if (deviceInfo.series === 'Mi' && deviceInfo.year >= 2023) expectedYears = 3;
    
    return {
      expectedYears,
      remainingYears: Math.max(0, expectedYears - deviceAge),
      status: deviceAge < expectedYears ? 'supported' : 'end-of-life'
    };
  }

  // עיצוב שמות יצרנים
  capitalizeManufacturer(manufacturer) {
    const names = {
      samsung: 'Samsung',
      google: 'Google',
      xiaomi: 'Xiaomi',
      oneplus: 'OnePlus',
      oppo: 'Oppo',
      vivo: 'Vivo',
      realme: 'Realme',
      honor: 'Honor',
      nothing: 'Nothing',
      sony: 'Sony'
    };
    
    return names[manufacturer] || manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);
  }
}

module.exports = DeviceAnalyzer;
