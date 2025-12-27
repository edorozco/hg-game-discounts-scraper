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
    console.log('Scheduled scraping skipped: already in progress');
    return;
  }

  setIsScraping(true);
  const startTime = Date.now();

  try {
    console.log('Starting scheduled scrape...');
    
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
      console.log(`Xbox CSV saved to: ${csvPath}`);
    } catch (error) {
      console.error('Error saving Xbox CSV:', error);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalGamesData = getGamesData();
    console.log(`Scheduled scraping completed in ${duration}s. Found ${finalGamesData.length} games.`);
  } catch (error) {
    console.error('Error during scheduled scraping:', error);
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
    console.log('Scheduled PlayStation scraping skipped: already in progress');
    return;
  }

  setIsPlaystationScraping(true);
  const startTime = Date.now();

  try {
    console.log('Starting scheduled PlayStation scrape...');
    
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
      console.log(`PlayStation CSV saved to: ${csvPath}`);
    } catch (error) {
      console.error('Error saving PlayStation CSV:', error);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalGamesData = getPlaystationGamesData();
    console.log(`Scheduled PlayStation scraping completed in ${duration}s. Found ${finalGamesData.length} games.`);
  } catch (error) {
    console.error('Error during scheduled PlayStation scraping:', error);
  } finally {
    setIsPlaystationScraping(false);
    setPlaystationScrapingProgress(null);
  }
}

/**
 * Starts the scheduled scraping job
 * Runs every 6 hours: at minute 0 of every 6th hour
 * Xbox and PlayStation alternate (Xbox at :00, PlayStation at :30)
 */
export function startScheduler() {
  // Schedule Xbox: every 6 hours at minute 0
  cron.schedule('0 */6 * * *', () => {
    performScraping();
  });

  // Schedule PlayStation: every 6 hours at minute 30 (alternating with Xbox)
  cron.schedule('30 */6 * * *', () => {
    performPlaystationScraping();
  });

  console.log('Scheduler started: Xbox scraping will run every 6 hours at :00');
  console.log('Scheduler started: PlayStation scraping will run every 6 hours at :30');
  
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

