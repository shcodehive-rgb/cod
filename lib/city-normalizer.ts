import { OZONE_CITIES } from '@/data/cities';

interface CityMatch {
  originalCity: string;
  normalizedCity: string;
  shippingFee: number;
  returnFee: number;
  confidence: number;
}

/**
 * City Normalizer for Ozone Express Integration
 * Matches extracted city names against official Ozone city list
 */
export class CityNormalizer {
  private static ozoneCityMap = new Map<string, typeof OZONE_CITIES[0]>();
  
  // Initialize the city map for faster lookups
  static {
    OZONE_CITIES.forEach(city => {
      // Store original name (highest priority)
      this.ozoneCityMap.set(city.name.toLowerCase(), city);
      
      // Store common variations (lower priority)
      const variations = this.getCityVariations(city.name);
      variations.forEach(variation => {
        // Only add variation if it's not already the exact city name
        if (variation.toLowerCase() !== city.name.toLowerCase()) {
          this.ozoneCityMap.set(variation.toLowerCase(), city);
        }
      });
    });
  }

  /**
   * Get common variations of city names for better matching
   */
  private static getCityVariations(cityName: string): string[] {
    const variations: string[] = [];
    const name = cityName.toLowerCase();
    
    // Remove common prefixes/suffixes
    const cleaned = name
      .replace(/\b(ville|city|medina|kasbah|ksar)\b/gi, '')
      .replace(/\b(dar|beni|ait|ain|el|al|ass|had|bni)\b/gi, '')
      .trim();
    
    // Add cleaned version
    if (cleaned !== name) {
      variations.push(cleaned);
    }
    
    // Common misspellings and variations
    const commonVariations: Record<string, string[]> = {
      'kenitra ville': ['knitra', 'kenitra', 'kenitra ville', 'kenitra city', 'kenitra', 'qunitra'],
      'casablanca': ['casa', 'casablanca', 'dar el beida', 'casa ville', 'casa', 'dar beida'],
      'rabat': ['rabat', 'rabat ville', 'ribat', 'al rabat', 'er-rabat'],
      'marrakech': ['marrakech', 'marrakesh', 'red city', 'marakech', 'merakech'],
      'fes': ['fes', 'fez', 'fès', 'fas', 'alfas'],
      'tanger': ['tanger', 'tangier', 'tangiers', 'tanger ville', 'tanjah'],
      'agadir': ['agadir', 'agadir ville', 'agadir city', 'agadir'],
      'meknes': ['meknes', 'meknès', 'mekness', 'miknas'],
      'oujda': ['oujda', 'oujda ville', 'wajda'],
      'tetouan': ['tetouan', 'tetuan', 'tittawin', 'tittawan'],
      'safi': ['safi', 'asfi', 'safi ville', 'asfi'],
      'errachidia': ['errachidia', 'rachidia', 'er-rachidia', 'rachidia'],
      'beni mellal': ['beni mellal', 'beni mellal ville', 'bni mellal', 'beni mellal'],
      'khouribga': ['khouribga', 'khouribga ville', 'khouribga'],
      'settat': ['settat', 'settat ville', 'settat'],
      'el jadida': ['el jadida', 'jadida', 'mazagan', 'al jadida', 'jadida'],
      'taza': ['taza', 'taza ville', 'taza'],
      'berkane': ['berkane', 'berkane ville', 'berkan'],
      'nador': ['nador', 'nador ville', 'nador'],
      'hoceima': ['al hoceima', 'hoceima', 'ajdir', 'al hoceima'],
      'chefchaouen': ['chefchaouen', 'chaouen', 'chefchaouen ville', 'chaouen'],
      'khenifra': ['khenifra', 'khenifra ville', 'khenifra'],
      'taounate': ['taounate', 'taounate ville', 'taounat'],
      'guercif': ['guercif', 'guercif ville', 'guercif'],
      'ouarzazate': ['ouarzazate', 'ouarzazate ville', 'warzazat'],
      'tinghir': ['tinghir', 'tinghir ville', 'tinghir'],
      'zagora': ['zagora', 'zagora ville', 'zagora'],
      'laayoune': ['laayoune', 'aioun', 'laayoune ville', 'el ayoun'],
      'dakhla': ['dakhla', 'dakhla ville', 'villa cisneros', 'dajla'],
      'guelmim': ['guelmim', 'guelmim ville', 'guelmim'],
      'essaouira': ['essaouira', 'essaouira ville', 'mogador', 'sawira'],
      'azemmour': ['azemmour', 'azammur', 'azemour'],
      'berrechid': ['berrechid', 'berrechid ville', 'bir rechid'],
      'benslimane': ['benslimane', 'benslimane ville', 'benslimane'],
      'youssoufia': ['youssoufia', 'youssoufia ville', 'jorf lasfar', 'yousoufia'],
      'sidi slimane': ['sidi slimane', 'sidi slimane ville', 'sidi slimane'],
      'sidi kacem': ['sidi kacem', 'sidi kacem ville', 'sidi qacem'],
      'ain harrouda': ['ain harrouda', 'ain harouda', 'ain harouda'],
      'bouznika': ['bouznika', 'bouznika ville', 'bouznika'],
      'skhirat': ['skhirat', 'skhirat plage', 'sakhrat'],
      'temara': ['temara', 'temara ville', 'tamara'],
      'sale': ['salé', 'sale', 'sala', 'as-sala'],
      'moulay bousselham': ['moulay bousselham', 'bousselham', 'bousselham'],
      'khemisset': ['khemisset', 'khemisset ville', 'khemisset'],
      'taourirt': ['taourirt', 'taourirt ville', 'taourirt'],
      'jerada': ['jerada', 'jerada ville', 'jerada'],
      'figuig': ['figuig', 'figuig ville', 'figuig'],
      'ouled teima': ['ouled teima', 'ouled teima ville', 'ouled teima'],
      'taroudant': ['taroudant', 'taroudant ville', 'taroudant'],
      'tiznit': ['tiznit', 'tiznit ville', 'tiznit'],
      'chichaoua': ['chichaoua', 'chichaoua ville', 'chichaoua'],
      'imintanoute': ['imintanoute', 'imintanoute ville', 'imintanoute'],
      'sidi bennour': ['sidi bennour', 'sidi bennour ville', 'sidi bennour'],
      'dar bouazza': ['dar bouazza', 'dar bouazza', 'bouazza'],
      'had soualem': ['had soualem', 'had soualem', 'soualem'],
      'mohammedia': ['mohammedia', 'mohammedia ville', 'mohammadia'],
      'ain attik': ['ain attik', 'ain attik', 'ain attiq'],
      'ain taoujdat': ['ain taoujdat', 'ain taoujdate'],
      'ain sbaa': ['ain sbaa', 'ain sba'],
      'ain sebaa': ['ain sebaa'],
      'ain chock': ['ain chock', 'ain chok'],
      'ain diab': ['ain diab', 'ain dyab'],
      'ain borja': ['ain borja'],
    };
    
    // Add variations if they exist
    Object.entries(commonVariations).forEach(([official, vars]) => {
      if (cityName.toLowerCase().includes(official) || official.includes(cityName.toLowerCase())) {
        variations.push(...vars);
      }
    });
    
    return variations;
  }

  /**
   * Normalize an extracted city name to match Ozone city list
   */
  static normalizeCity(extractedCity: string): CityMatch | null {
    if (!extractedCity || typeof extractedCity !== 'string') {
      return null;
    }

    const originalCity = extractedCity.trim();
    const searchCity = originalCity.toLowerCase();

    // First, try to find an exact match in the original OZONE_CITIES array
    // This ensures we prioritize exact city names over compound names
    const exactCityMatch = OZONE_CITIES.find(city => 
      city.name.toLowerCase() === searchCity
    );
    
    if (exactCityMatch) {
      return {
        originalCity,
        normalizedCity: exactCityMatch.name,
        shippingFee: exactCityMatch.shipping_fee,
        returnFee: exactCityMatch.return_fee,
        confidence: 1.0
      };
    }

    // Then check variations map for common misspellings
    if (this.ozoneCityMap.has(searchCity)) {
      const city = this.ozoneCityMap.get(searchCity)!;
      // Make sure we're not returning a compound name when we have an exact match
      if (city.name.toLowerCase() === searchCity || 
          this.getCityVariations(city.name).includes(searchCity)) {
        return {
          originalCity,
          normalizedCity: city.name,
          shippingFee: city.shipping_fee,
          returnFee: city.return_fee,
          confidence: 0.9
        };
      }
    }

    // Check for exact word matches in multi-word city names
    const exactMatches: Array<{city: typeof OZONE_CITIES[0]; score: number}> = [];
    for (const city of OZONE_CITIES) {
      const key = city.name.toLowerCase();
      // Split both strings into words and check for exact word matches
      const searchWords = searchCity.split(/\s+/);
      const keyWords = key.split(/\s+/);
      
      // Check if all search words are contained in the key words
      const allWordsMatch = searchWords.every(word => 
        keyWords.some(keyWord => keyWord.includes(word) || word.includes(keyWord))
      );
      
      if (allWordsMatch) {
        const score = this.calculateSimilarity(searchCity, key);
        if (score > 0.8) { // Higher threshold for word matching
          exactMatches.push({ city, score });
        }
      }
    }

    // Sort by score and take the best match
    if (exactMatches.length > 0) {
      exactMatches.sort((a, b) => b.score - a.score);
      const bestMatch = exactMatches[0].city;
      return {
        originalCity,
        normalizedCity: bestMatch.name,
        shippingFee: bestMatch.shipping_fee,
        returnFee: bestMatch.return_fee,
        confidence: exactMatches[0].score
      };
    }

    // Fuzzy matching as last resort
    let bestMatch: typeof OZONE_CITIES[0] | null = null;
    let bestScore = 0;

    for (const city of OZONE_CITIES) {
      const key = city.name.toLowerCase();
      // Check for partial matches
      if (key.includes(searchCity) || searchCity.includes(key)) {
        const score = this.calculateSimilarity(searchCity, key);
        if (score > bestScore && score > 0.7) { // Higher threshold for fuzzy matching
          bestScore = score;
          bestMatch = city;
        }
      }
    }

    if (bestMatch) {
      return {
        originalCity,
        normalizedCity: bestMatch.name,
        shippingFee: bestMatch.shipping_fee,
        returnFee: bestMatch.return_fee,
        confidence: bestScore
      };
    }

    // No match found
    return null;
  }

  /**
   * Calculate similarity between two strings (simple Levenshtein-like algorithm)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get all available Ozone cities (for debugging/validation)
   */
  static getAllOzoneCities(): string[] {
    return OZONE_CITIES.map(city => city.name);
  }

  /**
   * Check if a city exists in Ozone list
   */
  static isValidOzoneCity(cityName: string): boolean {
    return this.ozoneCityMap.has(cityName.toLowerCase());
  }
}
