import axios from 'axios';

// Supported locales mapping
export const LOCALES = {
  CO: 'es-CO',
  AR: 'es-AR',
  TR: 'tr-TR',
  IN: 'en-IN'
};

// Country names for display
export const COUNTRY_NAMES = {
  CO: 'Colombia',
  AR: 'Argentina',
  TR: 'Turquía',
  IN: 'India'
};

/**
 * Scrapes Xbox game discounts for a specific locale
 * @param {string} locale - Locale code (e.g., 'es-CO', 'es-AR', 'tr-TR', 'en-IN')
 * @returns {Promise<Array>} Array of game products
 */
export async function scrapeXboxGames(locale) {
  const games = [];
  let encodedCT = '';
  let hasMorePages = true;
  let pageCount = 0;
  const maxPages = 1000; // Safety limit

  while (hasMorePages && pageCount < maxPages) {
    try {
      const data = JSON.stringify({
        "Filters": "e30=",
        "ReturnFilters": false,
        "ChannelKeyToBeUsedInResponse": "BROWSE_CHANNELID=COUNTDOWN-SALE-CONSOLE_FILTERS=",
        "EncodedCT": encodedCT,
        "ChannelId": "countdown-sale-console"
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://emerald.xboxservices.com/xboxcomfd/browse?locale=${locale}`,
        headers: {
          'ms-cv': `11FacFhwghUZLYQINCJ77T.${Date.now()}`,
          'x-ms-api-version': '1.1',
          'Content-Type': 'application/json'
        },
        data: data,
        timeout: 30000
      };

      const response = await axios.request(config);
      const responseData = response.data;

      // Extract product summaries
      if (responseData.productSummaries && Array.isArray(responseData.productSummaries)) {
        games.push(...responseData.productSummaries);
      }

      // Check for next page cursor
      const channelKey = "BROWSE_CHANNELID=COUNTDOWN-SALE-CONSOLE_FILTERS=";
      if (responseData.channels && responseData.channels[channelKey]) {
        const nextEncodedCT = responseData.channels[channelKey].encodedCT;
        
        if (nextEncodedCT && nextEncodedCT !== encodedCT) {
          encodedCT = nextEncodedCT;
          pageCount++;
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }

    } catch (error) {
      console.error(`Error scraping page ${pageCount + 1} for locale ${locale}:`, error.message);
      hasMorePages = false;
    }
  }

  console.log(`Scraped ${games.length} games for locale ${locale} across ${pageCount + 1} pages`);
  return games;
}

/**
 * Extracts relevant game data from product summary
 * @param {Object} productSummary - Product summary object from API
 * @param {string} locale - Locale code
 * @returns {Object|null} Extracted game data or null if invalid
 */
export function extractGameData(productSummary, locale) {
  try {
    const productId = productSummary.productId;
    const title = productSummary.title;

    if (!productId || !title) {
      return null;
    }

    const purchaseable = productSummary.specificPrices?.purchaseable?.[0];
    if (!purchaseable) {
      return null;
    }

    const msrp = purchaseable.msrp || 0;
    const listPrice = purchaseable.listPrice || 0;
    const currency = purchaseable.currency || '';

    return {
      productId,
      title,
      msrp,
      listPrice,
      currency,
      locale
    };
  } catch (error) {
    console.error('Error extracting game data:', error);
    return null;
  }
}

/**
 * Scrapes Xbox games for all supported countries in parallel
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} Object with country codes as keys and arrays of games as values
 */
export async function scrapeAllCountries(onProgress = null) {
  const countries = Object.keys(LOCALES);
  const localeValues = Object.values(LOCALES);

  console.log('Starting parallel scraping for all countries...');
  const startTime = Date.now();

  // Scrape all countries sequentially to show progress
  const countryData = {};
  let totalProducts = 0;

  for (let i = 0; i < localeValues.length; i++) {
    const locale = localeValues[i];
    const countryCode = countries[i];
    
    if (onProgress) {
      onProgress({ country: COUNTRY_NAMES[countryCode] || countryCode, productsCount: totalProducts });
    }

    try {
      const games = await scrapeXboxGames(locale);
      const extractedGames = games
        .map(game => extractGameData(game, locale))
        .filter(game => game !== null);
      
      countryData[countryCode] = extractedGames;
      totalProducts += extractedGames.length;
      
      if (onProgress) {
        onProgress({ country: COUNTRY_NAMES[countryCode] || countryCode, productsCount: totalProducts });
      }
      
      console.log(`✓ ${countryCode}: ${extractedGames.length} games scraped`);
    } catch (error) {
      console.error(`✗ ${countryCode}: Error - ${error.message}`);
      countryData[countryCode] = [];
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`Scraping completed in ${duration}s`);

  return countryData;
}

