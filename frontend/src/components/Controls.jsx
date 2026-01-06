import React, { useState } from 'react';
import logoImage from '../assets/images/hardcoregames-logo.webp';
import './Controls.css';

function Controls({ onScrape, onDownload, isScraping, lastScrapeTime, gamesCount, onFiltersChange, platform, scrapingProgress, selectedCount = 0 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  // Define available currencies based on platform
  const availableCurrencies = platform === 'playstation' 
    ? [
        { value: 'USD', label: 'USD (Estados Unidos)' },
        { value: 'TRY', label: 'TRY (Turquía)' },
        { value: 'INR', label: 'INR (India)' }
      ]
    : [
        { value: 'COP', label: 'COP (Colombia)' },
        { value: 'ARS', label: 'ARS (Argentina)' },
        { value: 'TRY', label: 'TRY (Turquía)' },
        { value: 'INR', label: 'INR (India)' }
      ];

  const handleSearch = () => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm: searchTerm,
        selectedCountry: '',
        minPrice: minPrice,
        maxPrice: maxPrice,
        selectedCurrency: selectedCurrency
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCurrency('');
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm: '',
        selectedCountry: '',
        minPrice: '',
        maxPrice: '',
        selectedCurrency: ''
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="controls-container">
      <div className="controls-header">
        <div className="logo-container">
          <img src={logoImage} alt="Hardcore Games Logo" className="logo-image" />
          <h1>HG Reporter - {platform === 'playstation' ? 'PlayStation' : 'Xbox'} Games Discounts</h1>
        </div>
        <div className="status-info">
          {lastScrapeTime && (
            <span className="last-update">
              Última actualización: {new Date(lastScrapeTime).toLocaleString('es-ES')}
            </span>
          )}
          {gamesCount > 0 && (
            <span className="games-count">{gamesCount} juegos disponibles</span>
          )}
        </div>
      </div>

      {isScraping && scrapingProgress && (
        <div className="scraping-progress">
          <div className="progress-spinner"></div>
          <div className="progress-info">
            <span className="progress-text">
              {scrapingProgress.country ? `Scrapeando ${scrapingProgress.country}: ` : 'Scrapeando: '}
              {scrapingProgress.productsCount || 0} productos encontrados
            </span>
          </div>
        </div>
      )}

      <div className="controls-actions">
        <button
          className="btn btn-primary"
          onClick={onScrape}
          disabled={isScraping}
        >
          {isScraping ? 'Scrapeando...' : 'Scrapear Ahora'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onDownload(false)}
          disabled={gamesCount === 0 || isScraping}
          title="Descargar todos los juegos"
        >
          Descargar Excel (Todos)
        </button>
        {selectedCount > 0 && (
          <button
            className="btn btn-success"
            onClick={() => onDownload(true)}
            disabled={isScraping}
            title={`Descargar ${selectedCount} juego(s) seleccionado(s)`}
          >
            Descargar Excel ({selectedCount} seleccionados)
          </button>
        )}
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="search">Buscar juego:</label>
          <input
            id="search"
            type="text"
            placeholder="Nombre del juego..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="currency">Moneda:</label>
          <select
            id="currency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="filter-input"
          >
            <option value="">Todas las monedas</option>
            {availableCurrencies.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="minPrice">Precio mínimo:</label>
          <input
            id="minPrice"
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            className="filter-input price-input"
            min="0"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="maxPrice">Precio máximo:</label>
          <input
            id="maxPrice"
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            className="filter-input price-input"
            min="0"
          />
        </div>

        <div className="filter-actions">
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={isScraping}
          >
            Buscar
          </button>
          <button
            className="btn btn-clear"
            onClick={clearFilters}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="filters-summary">
        {searchTerm && <span className="filter-tag">Búsqueda: "{searchTerm}"</span>}
        {selectedCurrency && <span className="filter-tag">Moneda: {selectedCurrency}</span>}
        {minPrice && <span className="filter-tag">Min: {minPrice}</span>}
        {maxPrice && <span className="filter-tag">Max: {maxPrice}</span>}
      </div>

    </div>
  );
}

export default Controls;

