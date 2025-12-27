import axios from 'axios';

// Currency codes mapping
const CURRENCY_CODES = {
  CO: 'COP',
  AR: 'ARS',
  TR: 'TRY',
  IN: 'INR',
  US: 'USD' // Added for PlayStation
};

// Cache for exchange rates (valid for 1 hour)
let exchangeRatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetches exchange rates from a free API
 * @returns {Promise<Object>} Exchange rates object
 */
async function fetchExchangeRates() {
  try {
    // Using exchangerate-api.com (free tier, no API key required)
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 10000
    });

    return response.data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    // Fallback: return approximate rates if API fails
    return {
      USD: 1,
      COP: 4000,
      ARS: 800,
      TRY: 30,
      INR: 83
    };
  }
}

/**
 * Gets exchange rates (with caching)
 * @returns {Promise<Object>} Exchange rates object
 */
async function getExchangeRates() {
  const now = Date.now();
  
  if (exchangeRatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return exchangeRatesCache;
  }

  exchangeRatesCache = await fetchExchangeRates();
  cacheTimestamp = now;
  return exchangeRatesCache;
}

/**
 * Converts price from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} rates - Exchange rates object
 * @returns {number} Converted amount
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Convert to USD first, then to target currency
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  if (fromRate === 0 || toRate === 0) {
    return 0;
  }

  const amountInUSD = amount / fromRate;
  const amountInTarget = amountInUSD * toRate;

  return Math.round(amountInTarget * 100) / 100; // Round to 2 decimals
}

/**
 * Adds currency conversions to aggregated games
 * @param {Array} aggregatedGames - Array of aggregated game objects
 * @returns {Promise<Array>} Games with currency conversions
 */
export async function addCurrencyConversions(aggregatedGames) {
  const rates = await getExchangeRates();

  return aggregatedGames.map(game => {
    const converted = { ...game };

    // Add conversions for each country pair
    const countries = ['CO', 'AR', 'TR', 'IN'];
    
    countries.forEach(fromCountry => {
      if (!converted.countries[fromCountry]) return;

      const fromData = converted.countries[fromCountry];
      const fromCurrency = CURRENCY_CODES[fromCountry];

      countries.forEach(toCountry => {
        if (fromCountry === toCountry) return;

        if (!converted.conversions) {
          converted.conversions = {};
        }

        if (!converted.conversions[fromCountry]) {
          converted.conversions[fromCountry] = {};
        }

        const toCurrency = CURRENCY_CODES[toCountry];
        const toData = converted.countries[toCountry];

        if (fromData && fromData.listPrice) {
          converted.conversions[fromCountry][toCountry] = {
            msrp: convertCurrency(fromData.msrp, fromCurrency, toCurrency, rates),
            listPrice: convertCurrency(fromData.listPrice, fromCurrency, toCurrency, rates),
            baseCurrency: fromCurrency,
            targetCurrency: toCurrency,
            exchangeRate: rates[toCurrency] / rates[fromCurrency]
          };
        }
      });
    });

    return converted;
  });
}

/**
 * Gets currency code for a country
 * @param {string} countryCode - Country code (CO, AR, TR, IN, US)
 * @returns {string} Currency code
 */
export function getCurrencyCode(countryCode) {
  return CURRENCY_CODES[countryCode] || '';
}

/**
 * Adds currency conversions to PlayStation games (converting to COP)
 * @param {Array} aggregatedGames - Array of aggregated game objects
 * @returns {Promise<Array>} Games with currency conversions to COP
 */
export async function addPlaystationCurrencyConversions(aggregatedGames) {
  const rates = await getExchangeRates();

  return aggregatedGames.map(game => {
    const converted = { ...game };

    // PlayStation countries: US, TR, IN - all convert to COP
    const playstationCountries = ['US', 'TR', 'IN'];
    const targetCountry = 'CO'; // Always convert to COP
    const targetCurrency = 'COP';
    
    if (!converted.conversions) {
      converted.conversions = {};
    }

    playstationCountries.forEach(fromCountry => {
      if (!converted.countries[fromCountry]) return;

      const fromData = converted.countries[fromCountry];
      const fromCurrency = CURRENCY_CODES[fromCountry];

      if (!converted.conversions[fromCountry]) {
        converted.conversions[fromCountry] = {};
      }

      if (fromData && fromData.listPrice) {
        converted.conversions[fromCountry][targetCountry] = {
          msrp: convertCurrency(fromData.msrp, fromCurrency, targetCurrency, rates),
          listPrice: convertCurrency(fromData.listPrice, fromCurrency, targetCurrency, rates),
          baseCurrency: fromCurrency,
          targetCurrency: targetCurrency,
          exchangeRate: rates[targetCurrency] / rates[fromCurrency]
        };
      }
    });

    return converted;
  });
}

