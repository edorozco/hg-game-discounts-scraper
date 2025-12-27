import axios from 'axios';

// Supported locales mapping for PlayStation
export const PS_LOCALES = {
  US: 'en-US',
  TR: 'en-TR',
  IN: 'en-IN'
};

// Currency mapping for PlayStation countries
const PS_CURRENCIES = {
  US: 'USD',
  TR: 'TRY',
  IN: 'INR'
};

// Country names for display
const PS_COUNTRY_NAMES = {
  US: 'Estados Unidos',
  TR: 'Turquía',
  IN: 'India'
};

// GraphQL endpoint and configuration
// Note: The double slash //op is required by PlayStation API (as seen in Postman example)
const BASE_URL = 'https://web.np.playstation.com/api/graphql/v1//op';
const OPERATION_NAME = 'categoryGridRetrieve';
const CATEGORY_ID = '3f772501-f6f8-49b7-abac-874a88ca4897'; // Discounts category
const PAGE_SIZE = 24;
const SHA256_HASH = '257713466fc3264850aa473409a29088e3a4115e6e69e9fb3e061c8dd5b9f5c6';

/**
 * Removes currency symbols from price string
 * Handles different formats:
 * - Turkey: "3.149,00 TL" (dot for thousands, comma for decimals)
 * - India: "Rs 4,399" (comma for thousands)
 * @param {string} priceString - Price string that may contain currency symbols
 * @param {string} countryCode - Country code to handle specific formats
 * @returns {number} Numeric price value
 */
function cleanPrice(priceString, countryCode = null) {
  if (!priceString && priceString !== 0) return 0;
  
  // If it's already a number, return it
  if (typeof priceString === 'number') {
    return priceString;
  }
  
  // Convert to string
  const str = String(priceString).trim();
  
  // Remove currency symbols and text (TL, Rs, $, €, £, ¥, ₹, ₺)
  let cleaned = str.replace(/\s*(TL|Rs|USD|EUR|GBP|JPY|INR|TRY)\s*/gi, '');
  cleaned = cleaned.replace(/[$€£¥₹₺]/g, '');
  cleaned = cleaned.trim();
  
  // Handle Turkey format: "3.149,00 TL" (dot = thousands, comma = decimal)
  if (countryCode === 'TR' && cleaned.includes('.') && cleaned.includes(',')) {
    // Remove dots (thousands separator) and replace comma with dot (decimal separator)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (countryCode === 'IN') {
    // India format: "Rs 4,399" (comma = thousands separator)
    // Remove all commas (they're thousands separators)
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // For other countries (US, etc.)
    // If there's a dot, commas are thousands separators
    if (cleaned.includes('.')) {
      // Has decimal point, so commas are thousands separators
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // Only comma - could be decimal separator (European format) or thousands
      // If there are multiple commas or comma is near the end, it's likely thousands separator
      const commaCount = (cleaned.match(/,/g) || []).length;
      if (commaCount > 1 || cleaned.split(',')[1]?.length <= 2) {
        // Multiple commas or comma followed by 1-2 digits = likely decimal separator
        cleaned = cleaned.replace(/,/g, '.');
      } else {
        // Single comma with more digits after = likely thousands separator
        cleaned = cleaned.replace(/,/g, '');
      }
    }
  }
  
  // Parse to number
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

/**
 * Scrapes PlayStation game discounts for a specific locale
 * @param {string} locale - Locale code (e.g., 'en-US', 'en-TR', 'en-IN')
 * @returns {Promise<Array>} Array of game products
 */
export async function scrapePlaystationGames(locale) {
  const games = [];
  let page = 1;
  let hasMorePages = true;
  const maxPages = 1000; // Safety limit
  let requestDelay = 500; // Initial delay between requests (ms)
  const maxRetries = 5; // Maximum retries for 429 errors
  const baseRetryDelay = 2000; // Base delay for retries (2 seconds)

  while (hasMorePages && page <= maxPages) {
    let retryCount = 0;
    let requestSuccess = false;

    while (retryCount <= maxRetries && !requestSuccess) {
      try {
        const variables = {
          id: CATEGORY_ID,
          pageArgs: { 
            size: PAGE_SIZE, 
            offset: (page - 1) * PAGE_SIZE 
          },
          sortBy: null,
          filterBy: [],
          facetOptions: []
        };

        const extensions = {
          persistedQuery: {
            version: 1,
            sha256Hash: SHA256_HASH
          }
        };

        // Build URL with query parameters (matching Postman example format)
        const params = new URLSearchParams({
          operationName: OPERATION_NAME,
          variables: JSON.stringify(variables),
          extensions: JSON.stringify(extensions),
        });

      const url = `${BASE_URL}?${params.toString()}`;

        // Use axios.request to match Postman example exactly
        const response = await axios.request({
          method: 'get',
          url: url,
          maxBodyLength: Infinity,
          headers: {
            'accept': 'application/json',
            'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
            'apollographql-client-version': '0.0.0',
            'content-type': 'application/json',
            'origin': 'https://store.playstation.com',
            'referer': 'https://store.playstation.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'x-psn-store-locale-override': locale,
          },
          timeout: 30000
        });

        // Check for 429 Too Many Requests
        if (response.status === 429) {
          const retryAfter = response.headers['retry-after'] 
            ? parseInt(response.headers['retry-after']) * 1000 
            : baseRetryDelay * Math.pow(2, retryCount); // Exponential backoff
          
          console.warn(`Rate limited (429) for ${locale} page ${page}. Retrying after ${retryAfter}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            // Increase delay between future requests
            requestDelay = Math.min(requestDelay * 1.5, 5000); // Cap at 5 seconds
            continue; // Retry the request
          } else {
            console.error(`Max retries reached for ${locale} page ${page}. Skipping...`);
            hasMorePages = false;
            break;
          }
        }

        const responseData = response.data;

        // Check for errors in GraphQL response
        if (responseData.errors) {
          console.error(`GraphQL errors for ${locale} page ${page}:`, responseData.errors);
          hasMorePages = false;
          break;
        }

        // Extract products
        if (responseData.data?.categoryGridRetrieve?.products) {
          const products = responseData.data.categoryGridRetrieve.products;
          games.push(...products);
        }

        // Check pagination
        const pageInfo = responseData.data?.categoryGridRetrieve?.pageInfo;
        if (pageInfo) {
          hasMorePages = !pageInfo.isLast;
          page++;
        } else {
          hasMorePages = false;
        }

        // Request successful, exit retry loop
        requestSuccess = true;

      } catch (error) {
        // Handle 429 in catch block as well (axios throws error for non-2xx status)
        if (error.response && error.response.status === 429) {
          const retryAfter = error.response.headers['retry-after'] 
            ? parseInt(error.response.headers['retry-after']) * 1000 
            : baseRetryDelay * Math.pow(2, retryCount); // Exponential backoff
          
          console.warn(`Rate limited (429) for ${locale} page ${page}. Retrying after ${retryAfter}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            // Increase delay between future requests
            requestDelay = Math.min(requestDelay * 1.5, 5000); // Cap at 5 seconds
            continue; // Retry the request
          } else {
            console.error(`Max retries reached for ${locale} page ${page}. Skipping...`);
            hasMorePages = false;
            break;
          }
        } else {
          // Other errors
          console.error(`Error scraping page ${page} for locale ${locale}:`, error.message);
          if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Status Text: ${error.response.statusText}`);
            console.error(`URL: ${url}`);
            if (error.response.data) {
              console.error(`Response Data:`, JSON.stringify(error.response.data).substring(0, 200));
            }
          }
          hasMorePages = false;
          break;
        }
      }
    }

    // Add delay between requests (increased if we hit rate limits)
    if (hasMorePages && requestSuccess) {
      await new Promise(resolve => setTimeout(resolve, requestDelay));
      // Gradually reduce delay if no rate limits encountered
      requestDelay = Math.max(requestDelay * 0.9, 500); // Don't go below 500ms
    }
  }

  console.log(`Scraped ${games.length} games for locale ${locale} across ${page} pages`);
  return games;
}

/**
 * Extracts the last part of PlayStation product ID after the last dash
 * Example: "UP1004-PPSA03420_00-GTAVPS5CASHPACK6" -> "GTAVPS5CASHPACK6"
 * @param {string} fullId - Full product ID from API
 * @returns {string} Extracted product ID (last part after last dash)
 */
function extractProductIdFromPlaystationId(fullId) {
  if (!fullId) return null;
  
  // Split by dash and take the last part
  const parts = fullId.split('-');
  return parts.length > 0 ? parts[parts.length - 1] : fullId;
}

/**
 * Extracts relevant game data from PlayStation product
 * @param {Object} product - Product object from API
 * @param {string} locale - Locale code
 * @returns {Object|null} Extracted game data or null if invalid
 */
export function extractPlaystationGameData(product, locale) {
  try {
    // Get the full ID (id)
    const fullId = product.id;
    
    if (!fullId) {
      return null;
    }
    
    // Extract only the last part after the last dash
    // Example: "UP1004-PPSA03420_00-GTAVPS5CASHPACK6" -> "GTAVPS5CASHPACK6"
    const productId = extractProductIdFromPlaystationId(fullId);
    const title = product.name;

    if (!productId || !title) {
      return null;
    }

    // Get country code from locale
    const countryCode = Object.keys(PS_LOCALES).find(
      key => PS_LOCALES[key] === locale
    );
    
    if (!countryCode) {
      return null;
    }

    const currency = PS_CURRENCIES[countryCode] || 'USD';

    // Extract prices - check multiple possible structures
    let basePrice = product.price?.basePrice;
    let discountedPrice = product.price?.discountedPrice;
    
    // If price structure is different, try alternative paths
    if (basePrice === undefined || basePrice === null) {
      if (product.price) {
        // Try different price field names
        basePrice = product.price.originalPrice || 
                   product.price.regularPrice || 
                   product.price.msrp || 
                   product.price.standardPrice ||
                   product.price.originalPriceValue ||
                   null;
        
        // If price is an object, try to extract value
        if (basePrice && typeof basePrice === 'object') {
          basePrice = basePrice.value || basePrice.amount || basePrice.price || null;
        }
      }
    }
    
    if (discountedPrice === undefined || discountedPrice === null) {
      if (product.price) {
        discountedPrice = product.price.finalPrice || 
                         product.price.currentPrice || 
                         product.price.listPrice ||
                         product.price.discountedPrice ||
                         product.price.finalPriceValue ||
                         basePrice;
        
        // If price is an object, try to extract value
        if (discountedPrice && typeof discountedPrice === 'object') {
          discountedPrice = discountedPrice.value || discountedPrice.amount || discountedPrice.price || basePrice;
        }
      }
    }
    
    // If still no prices, check if price is a direct number or string
    if ((basePrice === null || basePrice === undefined) && product.price) {
      // Sometimes price might be directly in the price object as a number/string
      if (typeof product.price === 'number' || typeof product.price === 'string') {
        basePrice = product.price;
        discountedPrice = product.price;
      }
    }
    
    // Fallback to null if still no price (will be handled as N/A in frontend)
    basePrice = basePrice !== undefined && basePrice !== null ? basePrice : null;
    discountedPrice = discountedPrice !== undefined && discountedPrice !== null ? discountedPrice : basePrice;

    // Clean prices (remove currency symbols) - pass countryCode for proper formatting
    const msrp = basePrice !== null ? cleanPrice(basePrice, countryCode) : null;
    const listPrice = discountedPrice !== null ? cleanPrice(discountedPrice, countryCode) : null;

    return {
      productId,
      title,
      msrp,
      listPrice,
      currency,
      locale,
      countryCode
    };
  } catch (error) {
    console.error('Error extracting PlayStation game data:', error);
    return null;
  }
}

/**
 * Scrapes PlayStation games for all supported countries in parallel
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} Object with country codes as keys and arrays of games as values
 */
export async function scrapeAllPlaystationCountries(onProgress = null) {
  const countries = Object.keys(PS_LOCALES);
  const localeValues = Object.values(PS_LOCALES);

  console.log('Starting parallel scraping for all PlayStation countries...');
  const startTime = Date.now();

  // Scrape all countries sequentially to show progress
  const countryData = {};
  let totalProducts = 0;

  for (let i = 0; i < localeValues.length; i++) {
    const locale = localeValues[i];
    const countryCode = countries[i];
    
    if (onProgress) {
      onProgress({ country: PS_COUNTRY_NAMES[countryCode] || countryCode, productsCount: totalProducts });
    }

    try {
      const games = await scrapePlaystationGames(locale);
      const extractedGames = games
        .map(game => extractPlaystationGameData(game, locale))
        .filter(game => game !== null);
      
      countryData[countryCode] = extractedGames;
      totalProducts += extractedGames.length;
      
      if (onProgress) {
        onProgress({ country: PS_COUNTRY_NAMES[countryCode] || countryCode, productsCount: totalProducts });
      }
      
      console.log(`✓ PS ${countryCode}: ${extractedGames.length} games scraped`);
    } catch (error) {
      console.error(`✗ PS ${countryCode}: Error - ${error.message}`);
      countryData[countryCode] = [];
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`PlayStation scraping completed in ${duration}s`);

  return countryData;
}

