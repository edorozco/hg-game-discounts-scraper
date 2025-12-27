import cron from 'node-cron';
import { scrapeAllCountries } from '../scraper/xboxScraper.js';
import { scrapeAllPlaystationCountries } from '../scraper/playstationScraper.js';
import { 
  aggregateGamesByProductId, 
  formatGamesForDisplay,
  aggregatePlaystationGamesByProductId,
  formatPlaystationGamesForDisplay
} from '../services/dataAggregator.js';
import { addCurrencyConversions, addPlaystationCurrencyConversions } from '../services/currencyService.js';
import { saveXboxCSV, savePlaystationCSV } from '../services/csvGenerator.js';
import { loadXboxGamesFromCSV, loadPlaystationGamesFromCSV } from '../services/csvLoader.js';
import { addLog, LOG_TYPES, EVENT_CATEGORIES } from '../services/logger.js';

// In-memory storage (shared with API routes)
let gamesData = [];
let lastScrapeTime = null;
let isScraping = false;

// PlayStation data storage
let playstationGamesData = [];
let playstationLastScrapeTime = null;
let isPlaystationScraping = false;

// Scraping progress tracking
let scrapingProgress = null;
let playstationScrapingProgress = null;

/**
 * Performs the scraping job
 */
async function performScraping() {
  if (getIsScraping()) {
    addLog('Scheduled Xbox scraping skipped: already in progress', LOG_TYPES.WARNING, EVENT_CATEGORIES.SCRAPING);
    return;
  }

  setIsScraping(true);
  const startTime = Date.now();

  try {
    addLog('Starting scheduled Xbox scraping...', LOG_TYPES.INFO, EVENT_CATEGORIES.SCRAPING, { platform: 'xbox', trigger: 'scheduled' });
    
    // Scrape all countries
    const countryData = await scrapeAllCountries();
    
    // Aggregate by productId
    const aggregatedGames = aggregateGamesByProductId(countryData);
    
    // Add currency conversions
    const gamesWithConversions = await addCurrencyConversions(aggregatedGames);
    
    // Format for display
    const formattedGames = formatGamesForDisplay(gamesWithConversions);
    setGamesData(formattedGames);
    setLastScrapeTime(new Date().toISOString());
    setScrapingProgress(null);

    // Save to CSV file
    try {
      const csvPath = await saveXboxCSV(formattedGames);
      addLog(`Xbox CSV saved successfully`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { platform: 'xbox', path: csvPath });
    } catch (error) {
      addLog(`Error saving Xbox CSV: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { platform: 'xbox', error: error.message });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalGamesData = getGamesData();
    addLog(`Xbox scraping completed successfully. Found ${finalGamesData.length} games in ${duration}s`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { 
      platform: 'xbox', 
      gamesCount: finalGamesData.length, 
      duration: `${duration}s`,
      trigger: 'scheduled'
    });
  } catch (error) {
    addLog(`Error during scheduled Xbox scraping: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'xbox', 
      error: error.message,
      trigger: 'scheduled'
    });
  } finally {
    setIsScraping(false);
    setScrapingProgress(null);
  }
}

/**
 * Performs the PlayStation scraping job
 */
async function performPlaystationScraping() {
  if (getIsPlaystationScraping()) {
    addLog('Scheduled PlayStation scraping skipped: already in progress', LOG_TYPES.WARNING, EVENT_CATEGORIES.SCRAPING);
    return;
  }

  setIsPlaystationScraping(true);
  const startTime = Date.now();

  try {
    addLog('Starting scheduled PlayStation scraping...', LOG_TYPES.INFO, EVENT_CATEGORIES.SCRAPING, { platform: 'playstation', trigger: 'scheduled' });
    
    // Scrape all countries
    const countryData = await scrapeAllPlaystationCountries();
    
    // Aggregate by productId
    const aggregatedGames = aggregatePlaystationGamesByProductId(countryData);
    
    // Add currency conversions (to COP)
    const gamesWithConversions = await addPlaystationCurrencyConversions(aggregatedGames);
    
    // Format for display
    const formattedGames = formatPlaystationGamesForDisplay(gamesWithConversions);
    setPlaystationGamesData(formattedGames);
    setPlaystationLastScrapeTime(new Date().toISOString());
    setPlaystationScrapingProgress(null);

    // Save to CSV file
    try {
      const csvPath = await savePlaystationCSV(formattedGames);
      addLog(`PlayStation CSV saved successfully`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { platform: 'playstation', path: csvPath });
    } catch (error) {
      addLog(`Error saving PlayStation CSV: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { platform: 'playstation', error: error.message });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalGamesData = getPlaystationGamesData();
    addLog(`PlayStation scraping completed successfully. Found ${finalGamesData.length} games in ${duration}s`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { 
      platform: 'playstation', 
      gamesCount: finalGamesData.length, 
      duration: `${duration}s`,
      trigger: 'scheduled'
    });
  } catch (error) {
    addLog(`Error during scheduled PlayStation scraping: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'playstation', 
      error: error.message,
      trigger: 'scheduled'
    });
  } finally {
    setIsPlaystationScraping(false);
    setPlaystationScrapingProgress(null);
  }
}

/**
 * Loads data from CSV files if they exist
 */
export function loadDataFromCSV() {
  // Load Xbox data
  const xboxData = loadXboxGamesFromCSV();
  if (xboxData && xboxData.games.length > 0) {
    setGamesData(xboxData.games);
    setLastScrapeTime(xboxData.lastScrapeTime);
    addLog(`Xbox data loaded from CSV: ${xboxData.games.length} games`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SYSTEM, { 
      platform: 'xbox', 
      gamesCount: xboxData.games.length 
    });
  }

  // Load PlayStation data
  const playstationData = loadPlaystationGamesFromCSV();
  if (playstationData && playstationData.games.length > 0) {
    setPlaystationGamesData(playstationData.games);
    setPlaystationLastScrapeTime(playstationData.lastScrapeTime);
    addLog(`PlayStation data loaded from CSV: ${playstationData.games.length} games`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SYSTEM, { 
      platform: 'playstation', 
      gamesCount: playstationData.games.length 
    });
  }
}

/**
 * Starts the scheduled scraping job
 * Runs every 6 hours: at minute 0 of every 6th hour
 * Xbox and PlayStation alternate (Xbox at :00, PlayStation at :30)
 */
export function startScheduler() {
  // Load existing data from CSV files
  loadDataFromCSV();

  // Schedule Xbox: every 6 hours at minute 0
  cron.schedule('0 */6 * * *', () => {
    performScraping();
  });

  // Schedule PlayStation: every 6 hours at minute 30 (alternating with Xbox)
  cron.schedule('30 */6 * * *', () => {
    performPlaystationScraping();
  });

  addLog('Scheduler started: Xbox scraping scheduled every 6 hours at :00', LOG_TYPES.INFO, EVENT_CATEGORIES.SYSTEM);
  addLog('Scheduler started: PlayStation scraping scheduled every 6 hours at :30', LOG_TYPES.INFO, EVENT_CATEGORIES.SYSTEM);
  
  // Optional: run immediately on startup (uncomment if desired)
  // performScraping();
  // performPlaystationScraping();
}

/**
 * Gets the current games data (for sharing with API routes)
 */
export function getGamesData() {
  return gamesData;
}

/**
 * Sets the games data (for sharing with API routes)
 */
export function setGamesData(data) {
  gamesData = data;
}

/**
 * Gets the last scrape time
 */
export function getLastScrapeTime() {
  return lastScrapeTime;
}

/**
 * Sets the last scrape time
 */
export function setLastScrapeTime(time) {
  lastScrapeTime = time;
}

/**
 * Gets scraping status
 */
export function getIsScraping() {
  return isScraping;
}

/**
 * Sets scraping status
 */
export function setIsScraping(status) {
  isScraping = status;
}

/**
 * Gets the current PlayStation games data (for sharing with API routes)
 */
export function getPlaystationGamesData() {
  return playstationGamesData;
}

/**
 * Sets the PlayStation games data (for sharing with API routes)
 */
export function setPlaystationGamesData(data) {
  playstationGamesData = data;
}

/**
 * Gets the last PlayStation scrape time
 */
export function getPlaystationLastScrapeTime() {
  return playstationLastScrapeTime;
}

/**
 * Sets the last PlayStation scrape time
 */
export function setPlaystationLastScrapeTime(time) {
  playstationLastScrapeTime = time;
}

/**
 * Gets PlayStation scraping status
 */
export function getIsPlaystationScraping() {
  return isPlaystationScraping;
}

/**
 * Sets PlayStation scraping status
 */
export function setIsPlaystationScraping(status) {
  isPlaystationScraping = status;
  if (!status) {
    playstationScrapingProgress = null;
  }
}

/**
 * Gets scraping progress
 */
export function getScrapingProgress() {
  return scrapingProgress;
}

/**
 * Sets scraping progress
 */
export function setScrapingProgress(progress) {
  scrapingProgress = progress;
}

/**
 * Gets PlayStation scraping progress
 */
export function getPlaystationScrapingProgress() {
  return playstationScrapingProgress;
}

/**
 * Sets PlayStation scraping progress
 */
export function setPlaystationScrapingProgress(progress) {
  playstationScrapingProgress = progress;
}

