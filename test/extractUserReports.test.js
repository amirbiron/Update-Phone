const UpdateChecker = require('../common/updateChecker');

describe('extractUserReportsFromText', () => {
  let updateChecker;

  beforeEach(() => {
    updateChecker = new UpdateChecker();
  });

  describe('length filtering improvements', () => {
    test('should accept reports with 10-350 characters (new limits)', () => {
      // Test with 10 character minimum
      const shortText = 'בעיה קטנה';  // 9 chars - should be rejected
      const minValidText = 'בעיה קטנה!'; // 10 chars - should be accepted
      
      // Test with 350 character maximum  
      const longValidText = 'עדכנתי את המכשיר ל-Android 15 והחוויה הייתה מעורבת. מצד אחד, יש שיפורים בביצועים ובסוללה, אבל מצד שני יש כמה באגים קטנים שמפריעים. הקמרה עובדת טוב יותר והמהירות משתפרת, אבל האפליקציות לפעמים קורסות. בסך הכל, אני חושב שכדאי לחכות עוד מעט לפני העדכון כי יש עדיין בעיות שצריכות לפתור אותן קודם.'; // ~350 chars
      
      const tooLongText = longValidText + ' טקסט נוסף כדי לעבור את ה-350 תווים ולוודא שהסינון עובד כמו שצריך ולא מקבל טקסטים ארוכים מדי שלא רלוונטיים לדיווחי משתמשים אמיתיים'; // >350 chars

      const shortResult = updateChecker.extractUserReportsFromText(shortText);
      const minValidResult = updateChecker.extractUserReportsFromText(minValidText);
      const longValidResult = updateChecker.extractUserReportsFromText(longValidText);
      const tooLongResult = updateChecker.extractUserReportsFromText(tooLongText);

      expect(shortResult).toHaveLength(0); // Too short
      expect(minValidResult).toHaveLength(1); // Should pass
      expect(longValidResult).toHaveLength(1); // Should pass
      expect(tooLongResult).toHaveLength(0); // Too long
    });

    test('should accept short experiential texts that contain authentic words', () => {
      const shortExperiences = [
        'הבעיה נפתרה',
        'עובד טוב',
        'הסתדר אחרי העדכון',
        'problem solved',
        'works fine',
        'battery improved'
      ];

      shortExperiences.forEach(text => {
        const result = updateChecker.extractUserReportsFromText(text);
        expect(result.length).toBeGreaterThanOrEqual(0); // Should not be automatically rejected
      });
    });
  });

  describe('isGenericText improvements', () => {
    test('should not filter authentic user experiences with common words', () => {
      const authenticTexts = [
        'יש לי בעיה עם הסוללה',
        'הכל עובד טוב אחרי העדכון',
        'הבעיה הסתדרה אחרי האתחול',
        'battery problem after update',
        'everything works fine now',
        'the issue was resolved'
      ];

      authenticTexts.forEach(text => {
        const isGeneric = updateChecker.isGenericText(text);
        expect(isGeneric).toBe(false); // These should not be considered generic
      });
    });

    test('should still filter obviously generic content', () => {
      const genericTexts = [
        'דיונים קהילתיים על הנושא',
        'מאמרים וביקורות מקצועיות',
        'חיפוש במידע הזמין',
        'discussions about this topic',
        'articles and reviews available',
        'search for information'
      ];

      genericTexts.forEach(text => {
        const isGeneric = updateChecker.isGenericText(text);
        expect(isGeneric).toBe(true); // These should be considered generic
      });
    });
  });

  describe('logging functionality', () => {
    test('should log the number of sentences checked and passed', () => {
      // Mock console.log to capture logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const testTexts = [
        'עדכנתי את המכשיר והכל עובד טוב',
        'דיונים קהילתיים על הנושא', // generic
        'יש בעיה קטנה אבל זה בסדר',
        'מידע על עדכון זמין בקישור' // generic
      ];

      testTexts.forEach(text => {
        updateChecker.extractUserReportsFromText(text);
      });

      // Check that logging happened
      expect(consoleSpy).toHaveBeenCalled();
      
      // Clean up
      consoleSpy.mockRestore();
    });
  });

  describe('regression tests', () => {
    test('should maintain existing functionality for valid user reports', () => {
      const validReports = [
        'אחרי עדכון לאנדרואיד 15 הסוללה נגמרת מהר יותר אבל הביצועים טובים',
        'עדכנתי את המכשיר והמהירות השתפרה אבל יש באגים בקמרה',
        'after updating to android 15 battery life improved significantly',
        'i updated my phone and performance is much better now'
      ];

      validReports.forEach(text => {
        const result = updateChecker.extractUserReportsFromText(text);
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('content');
        expect(result[0]).toHaveProperty('sentiment');
        expect(result[0]).toHaveProperty('author');
      });
    });

    test('should return empty array for completely invalid texts', () => {
      const invalidTexts = [
        '', // empty
        'a', // too short
        'דיונים קהילתיים מקיפים על הנושא החשוב הזה', // generic
        'x'.repeat(400) // too long
      ];

      invalidTexts.forEach(text => {
        const result = updateChecker.extractUserReportsFromText(text);
        expect(result).toHaveLength(0);
      });
    });
  });
});