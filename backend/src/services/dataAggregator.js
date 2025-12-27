/**
 * Aggregates game data from multiple countries by productId
 * @param {Object} countryData - Object with country codes as keys and arrays of games as values
 * @returns {Array} Array of aggregated game objects
 */
export function aggregateGamesByProductId(countryData) {
  const gamesMap = new Map();

  // Iterate through all countries
  Object.keys(countryData).forEach(countryCode => {
    const games = countryData[countryCode];
    
    games.forEach(game => {
      const productId = game.productId;
      
      if (!gamesMap.has(productId)) {
        // Initialize game entry
        gamesMap.set(productId, {
          productId,
          title: game.title,
          countries: {}
        });
      }

      const aggregatedGame = gamesMap.get(productId);
      
      // Store country-specific data
      aggregatedGame.countries[countryCode] = {
        msrp: game.msrp,
        listPrice: game.listPrice,
        currency: game.currency,
        locale: game.locale
      };
    });
  });

  // Convert map to array
  const aggregatedGames = Array.from(gamesMap.values());

  console.log(`Aggregated ${aggregatedGames.length} unique games`);
  return aggregatedGames;
}

/**
 * Formats aggregated games for frontend display
 * @param {Array} aggregatedGames - Array of aggregated game objects (may include conversions)
 * @returns {Array} Formatted games array
 */
export function formatGamesForDisplay(aggregatedGames) {
  return aggregatedGames.map(game => {
    const formatted = {
      productId: game.productId,
      title: game.title,
      CO: game.countries.CO || null,
      AR: game.countries.AR || null,
      TR: game.countries.TR || null,
      IN: game.countries.IN || null
    };
    
    // Preserve conversions if they exist
    if (game.conversions) {
      formatted.conversions = game.conversions;
    }
    
    return formatted;
  });
}

/**
 * Aggregates PlayStation game data from multiple countries by productId
 * @param {Object} countryData - Object with country codes as keys and arrays of games as values
 * @returns {Array} Array of aggregated game objects
 */
export function aggregatePlaystationGamesByProductId(countryData) {
  const gamesMap = new Map();

  Object.keys(countryData).forEach(countryCode => {
    const games = countryData[countryCode];
    
    games.forEach((game) => {
      const productId = game.productId;
      
      if (!productId) {
        return;
      }
      
      if (!gamesMap.has(productId)) {
        // Initialize game entry
        gamesMap.set(productId, {
          productId,
          title: game.title,
          platform: 'playstation',
          countries: {}
        });
      }

      const aggregatedGame = gamesMap.get(productId);
      
      // Store country-specific data
      aggregatedGame.countries[countryCode] = {
        msrp: game.msrp,
        listPrice: game.listPrice,
        currency: game.currency,
        locale: game.locale
      };
    });
  });

  // Convert map to array
  const aggregatedGames = Array.from(gamesMap.values());

  console.log(`Aggregated ${aggregatedGames.length} unique PlayStation games`);
  return aggregatedGames;
}

/**
 * Formats aggregated PlayStation games for frontend display
 * @param {Array} aggregatedGames - Array of aggregated game objects (may include conversions)
 * @returns {Array} Formatted games array
 */
export function formatPlaystationGamesForDisplay(aggregatedGames) {
  return aggregatedGames.map(game => {
    const formatted = {
      productId: game.productId,
      title: game.title,
      platform: 'playstation',
      US: game.countries.US || null,
      TR: game.countries.TR || null,
      IN: game.countries.IN || null
    };
    
    // Preserve conversions if they exist
    if (game.conversions) {
      formatted.conversions = game.conversions;
    }
    
    return formatted;
  });
}

