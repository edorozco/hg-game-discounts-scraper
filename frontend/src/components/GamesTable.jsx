import React, { useEffect, useRef } from 'react';
import './GamesTable.css';

const countryNames = {
  CO: 'Colombia',
  AR: 'Argentina',
  TR: 'Turquía',
  IN: 'India',
  US: 'Estados Unidos'
};

const countryFlags = {
  CO: '🇨🇴',
  AR: '🇦🇷',
  TR: '🇹🇷',
  IN: '🇮🇳',
  US: '🇺🇸'
};

const currencySymbols = {
  COP: '$',
  ARS: '$',
  TRY: '₺',
  INR: '₹',
  USD: '$'
};

function formatPrice(price, currency) {
  if (!price || price === 0) return 'N/A';
  const symbol = currencySymbols[currency] || '';
  return `${symbol}${price.toLocaleString()}`;
}

function GamesTable({ games, searchTerm, selectedCountry, minPrice, maxPrice, selectedCurrency, platform = 'xbox', selectedGames = [], onSelectionChange }) {
  // Detect platform from first game if not provided
  const detectedPlatform = platform || (games.length > 0 && games[0].platform === 'playstation' ? 'playstation' : 'xbox');
  const isPlaystation = detectedPlatform === 'playstation';
  
  // Define countries based on platform
  const countries = isPlaystation ? ['US', 'TR', 'IN'] : ['CO', 'AR', 'TR', 'IN'];

  // Map currency to country code
  const currencyToCountry = {
    'COP': 'CO',
    'ARS': 'AR',
    'TRY': 'TR',
    'INR': 'IN',
    'USD': 'US'
  };

  // Filter games based on search and filters
  const filteredGames = games.filter(game => {
    // Search filter
    if (searchTerm && !game.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Country filter
    if (selectedCountry && !game[selectedCountry]) {
      return false;
    }

    // Price range filter with currency
    if (minPrice !== '' || maxPrice !== '' || selectedCurrency) {
      let hasPriceInRange = false;

      // If currency is selected, only check that currency
      const countriesToCheck = selectedCurrency && currencyToCountry[selectedCurrency]
        ? [currencyToCountry[selectedCurrency]]
        : countries;

      for (const country of countriesToCheck) {
        const countryData = game[country];
        if (countryData && countryData.listPrice) {
          // Check if currency matches (if currency filter is active)
          if (selectedCurrency && countryData.currency !== selectedCurrency) {
            continue;
          }

          const price = countryData.listPrice;
          const min = minPrice === '' ? -Infinity : parseFloat(minPrice);
          const max = maxPrice === '' ? Infinity : parseFloat(maxPrice);
          
          if (price >= min && price <= max) {
            hasPriceInRange = true;
            break;
          }
        }
      }

      if (!hasPriceInRange) {
        return false;
      }
    }

    return true;
  });

  // Calculate total columns for colspan (add 1 for checkbox column)
  const totalCols = isPlaystation ? 15 : 18; // US/TR/IN (4 each) + 1 game + 1 ID + 1 checkbox = 15, or CO/AR/TR/IN (4 each) + 1 game + 1 ID + 1 checkbox = 18

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredGames.map(game => game.productId);
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectGame = (productId, checked) => {
    if (checked) {
      onSelectionChange?.([...selectedGames, productId]);
    } else {
      onSelectionChange?.(selectedGames.filter(id => id !== productId));
    }
  };

  const allSelected = filteredGames.length > 0 && filteredGames.every(game => selectedGames.includes(game.productId));
  const someSelected = filteredGames.some(game => selectedGames.includes(game.productId));
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <div className="games-table-container">
      <div className="table-wrapper">
        <table className="games-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  title="Seleccionar todos"
                />
              </th>
              <th>Juego</th>
              <th>ID</th>
              {countries.map((country) => {
                const colSpan = isPlaystation ? 4 : (country === 'CO' ? 3 : 4);
                return (
                  <th key={country} colSpan={colSpan} className={`country-header country-${country}`}>
                    <span className="country-header-content">
                      {countryFlags[country]} {countryNames[country]}
                    </span>
                  </th>
                );
              })}
            </tr>
            <tr className="sub-header">
              <th></th>
              <th></th>
              <th></th>
              {countries.map((country) => {
                const showConversion = isPlaystation ? true : (country !== 'CO');
                return (
                  <React.Fragment key={country}>
                    <th className={`country-${country}`}>Precio Normal</th>
                    <th className={`country-${country}`}>Precio Descuento</th>
                    <th className={`country-${country}`}>Moneda</th>
                    {showConversion && (
                      <th className={`country-${country}`}>
                        {country === 'US' ? 'USD-COP' : country === 'TR' ? 'TRY-COP' : country === 'IN' ? 'INR-COP' : country === 'AR' ? 'ARS-COP' : ''}
                      </th>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredGames.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="no-data">
                  {games.length === 0 
                    ? 'No hay datos disponibles. Ejecuta el scraping primero.' 
                    : 'No se encontraron juegos con los filtros aplicados.'}
                </td>
              </tr>
            ) : (
              filteredGames.map((game) => {
                const isSelected = selectedGames.includes(game.productId);
                return (
                <tr key={game.productId} className={isSelected ? 'selected' : ''}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectGame(game.productId, e.target.checked)}
                    />
                  </td>
                  <td className="game-title">{game.title}</td>
                  <td className="game-id">{game.productId}</td>
                  {countries.map((country) => {
                    const countryData = game[country];
                    const showConversion = isPlaystation ? true : (country !== 'CO');
                    const conversionToCOP = showConversion && game.conversions?.[country]?.CO;
                    
                    return (
                      <React.Fragment key={country}>
                        <td className={`price country-${country}`}>
                          {countryData 
                            ? formatPrice(countryData.msrp, countryData.currency)
                            : 'N/A'}
                        </td>
                        <td className={`price discount country-${country}`}>
                          {countryData 
                            ? formatPrice(countryData.listPrice, countryData.currency)
                            : 'N/A'}
                        </td>
                        <td className={`currency country-${country}`}>{countryData?.currency || 'N/A'}</td>
                        {showConversion && (
                          <td className={`price conversion country-${country}`}>
                            {conversionToCOP?.listPrice
                              ? formatPrice(conversionToCOP.listPrice, 'COP')
                              : 'N/A'}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Mostrando {filteredGames.length} de {games.length} juegos</span>
        {selectedGames.length > 0 && (
          <span className="selection-info">{selectedGames.length} juego(s) seleccionado(s)</span>
        )}
      </div>
    </div>
  );
}

export default GamesTable;

