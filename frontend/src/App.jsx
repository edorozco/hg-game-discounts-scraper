import React, { useState, useEffect } from 'react';
import Controls from './components/Controls';
import GamesTable from './components/GamesTable';
import PlatformTabs from './components/PlatformTabs';
import NotificationCenter from './components/NotificationCenter';
import { 
  getGames, 
  scrapeGames, 
  downloadExcel, 
  getStatus,
  getPlaystationGames,
  scrapePlaystationGames,
  downloadPlaystationExcel,
  getPlaystationStatus
} from './services/api';
import './App.css';

function App() {
  const [platform, setPlatform] = useState('xbox');
  const [games, setGames] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    selectedCountry: '',
    minPrice: '',
    maxPrice: '',
    selectedCurrency: ''
  });
  const [selectedGames, setSelectedGames] = useState([]);

  // Load games on mount and when platform changes
  useEffect(() => {
    loadGames();
    checkStatus();
  }, [platform]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = platform === 'playstation' 
        ? await getPlaystationGames()
        : await getGames();
      setGames(data.games || []);
      setLastScrapeTime(data.lastScrapeTime);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const status = platform === 'playstation' 
        ? await getPlaystationStatus()
        : await getStatus();
      setIsScraping(status.isScraping);
      setLastScrapeTime(status.lastScrapeTime);
      setScrapingProgress(status.progress);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleScrape = async () => {
    try {
      setIsScraping(true);
      const result = platform === 'playstation'
        ? await scrapePlaystationGames()
        : await scrapeGames();
      console.log('Scraping result:', result);
      
      // Reload games after scraping
      await loadGames();
      
      // Show success message
      if (result.success) {
        console.log(`Scraping completado: ${result.count} juegos encontrados en ${result.duration}`);
      }
    } catch (error) {
      console.error('Error scraping:', error);
      const errorMessage = error.response?.data?.error || error.message;
      if (error.response?.status === 429) {
        // Already scraping
        return;
      }
      alert('Error al ejecutar el scraping: ' + errorMessage);
    } finally {
      setIsScraping(false);
      setScrapingProgress(null);
    }
  };

  const handleDownload = async (selectedOnly = false) => {
    try {
      const idsToDownload = selectedOnly && selectedGames.length > 0 ? selectedGames : null;
      
      if (platform === 'playstation') {
        await downloadPlaystationExcel(idsToDownload);
      } else {
        await downloadExcel(idsToDownload);
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo Excel');
    }
  };

  const handlePlatformChange = (newPlatform) => {
    setPlatform(newPlatform);
    setGames([]);
    setLastScrapeTime(null);
    setSelectedGames([]); // Clear selection when changing platform
    setFilters({ // Clear filters when changing platform
      searchTerm: '',
      selectedCountry: '',
      minPrice: '',
      maxPrice: '',
      selectedCurrency: ''
    });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Poll status while scraping
  useEffect(() => {
    let interval;
    if (isScraping) {
      checkStatus(); // Check immediately
      interval = setInterval(() => {
        checkStatus();
      }, 1000); // Check every 1 second for progress updates
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScraping, platform]);

  return (
    <div className="app">
      <div className="app-header">
        <NotificationCenter />
      </div>
      <div className="app-container">
        <PlatformTabs 
          activePlatform={platform}
          onPlatformChange={handlePlatformChange}
        />
        <Controls
          onScrape={handleScrape}
          onDownload={handleDownload}
          isScraping={isScraping}
          lastScrapeTime={lastScrapeTime}
          gamesCount={games.length}
          onFiltersChange={handleFiltersChange}
          platform={platform}
          scrapingProgress={scrapingProgress}
          selectedCount={selectedGames.length}
        />
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando datos...</p>
          </div>
        ) : (
          <GamesTable
            games={games}
            searchTerm={filters.searchTerm}
            selectedCountry={filters.selectedCountry}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            selectedCurrency={filters.selectedCurrency}
            platform={platform}
            selectedGames={selectedGames}
            onSelectionChange={setSelectedGames}
          />
        )}
      </div>
    </div>
  );
}

export default App;

