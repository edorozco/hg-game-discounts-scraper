import express from 'express';
import { scrapeAllCountries } from '../scraper/xboxScraper.js';
import { scrapeAllPlaystationCountries } from '../scraper/playstationScraper.js';
import { 
  aggregateGamesByProductId, 
  formatGamesForDisplay,
  aggregatePlaystationGamesByProductId,
  formatPlaystationGamesForDisplay
} from '../services/dataAggregator.js';
import { addCurrencyConversions, addPlaystationCurrencyConversions } from '../services/currencyService.js';
import { generateExcel, generatePlaystationExcel } from '../services/excelGenerator.js';
import { saveXboxCSV, savePlaystationCSV } from '../services/csvGenerator.js';
import { addLog, getLogs, clearLogs, LOG_TYPES, EVENT_CATEGORIES } from '../services/logger.js';
import {
  getGamesData,
  setGamesData,
  getLastScrapeTime,
  setLastScrapeTime,
  getIsScraping,
  setIsScraping,
  getPlaystationGamesData,
  setPlaystationGamesData,
  getPlaystationLastScrapeTime,
  setPlaystationLastScrapeTime,
  getIsPlaystationScraping,
  setIsPlaystationScraping,
  getScrapingProgress,
  setScrapingProgress,
  getPlaystationScrapingProgress,
  setPlaystationScrapingProgress
} from '../scheduler/scraperJob.js';

const router = express.Router();

/**
 * GET /api/games
 * Returns aggregated games data
 */
router.get('/games', async (req, res) => {
  try {
    const gamesData = getGamesData();
    const lastScrapeTime = getLastScrapeTime();
    
    if (gamesData.length === 0) {
      return res.json({
        games: [],
        message: 'No data available. Please run scraping first.',
        lastScrapeTime: null
      });
    }

    res.json({
      games: gamesData,
      lastScrapeTime: lastScrapeTime,
      count: gamesData.length
    });
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ error: 'Failed to get games data' });
  }
});

/**
 * POST /api/scrape
 * Triggers scraping for all countries
 */
router.post('/scrape', async (req, res) => {
  if (getIsScraping()) {
    return res.status(429).json({ 
      error: 'Scraping already in progress. Please wait.',
      isScraping: true 
    });
  }

  setIsScraping(true);
  const startTime = Date.now();

  try {
    addLog('Starting manual Xbox scraping...', LOG_TYPES.INFO, EVENT_CATEGORIES.SCRAPING, { platform: 'xbox', trigger: 'manual' });
    
    // Scrape all countries with progress tracking
    const countryData = await scrapeAllCountries((progress) => {
      setScrapingProgress(progress);
    });
    
    // Aggregate by productId
    const aggregatedGames = aggregateGamesByProductId(countryData);
    
    // Add currency conversions
    const gamesWithConversions = await addCurrencyConversions(aggregatedGames);
    
    // Format for display
    const formattedGames = formatGamesForDisplay(gamesWithConversions);
    setGamesData(formattedGames);
    setLastScrapeTime(new Date().toISOString());
    setScrapingProgress(null); // Clear progress when done

    // Save to CSV file
    try {
      const csvPath = await saveXboxCSV(formattedGames);
      addLog(`Xbox CSV saved successfully`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { platform: 'xbox', path: csvPath });
    } catch (error) {
      addLog(`Error saving Xbox CSV: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { platform: 'xbox', error: error.message });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    addLog(`Xbox scraping completed successfully. Found ${formattedGames.length} games in ${duration}s`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { 
      platform: 'xbox', 
      gamesCount: formattedGames.length, 
      duration: `${duration}s`,
      trigger: 'manual'
    });

    res.json({
      success: true,
      message: 'Scraping completed successfully',
      count: formattedGames.length,
      lastScrapeTime: getLastScrapeTime(),
      duration: `${duration}s`
    });
  } catch (error) {
    addLog(`Error during manual Xbox scraping: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'xbox', 
      error: error.message,
      trigger: 'manual'
    });
    res.status(500).json({ 
      error: 'Failed to scrape data',
      message: error.message 
    });
  } finally {
    setIsScraping(false);
  }
});

/**
 * GET /api/download/excel
 * Downloads games data as Excel file
 */
router.get('/download/excel', async (req, res) => {
  try {
    const gamesData = getGamesData();
    
    if (gamesData.length === 0) {
      addLog('Excel download failed: No Xbox data available', LOG_TYPES.WARNING, EVENT_CATEGORIES.SYSTEM, { platform: 'xbox' });
      return res.status(404).json({ 
        error: 'No data available. Please run scraping first.' 
      });
    }

    const excelBuffer = generateExcel(gamesData);
    const filename = `xbox-games-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
    
    addLog(`Xbox Excel file downloaded successfully: ${filename}`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SYSTEM, { 
      platform: 'xbox', 
      filename,
      gamesCount: gamesData.length 
    });
  } catch (error) {
    addLog(`Error generating Xbox Excel file: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'xbox', 
      error: error.message 
    });
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

/**
 * GET /api/status
 * Returns scraping status
 */
router.get('/status', (req, res) => {
  const gamesData = getGamesData();
  res.json({
    isScraping: getIsScraping(),
    lastScrapeTime: getLastScrapeTime(),
    gamesCount: gamesData.length,
    hasData: gamesData.length > 0,
    progress: getScrapingProgress()
  });
});

/**
 * GET /api/status/playstation
 * Returns PlayStation scraping status
 */
router.get('/status/playstation', (req, res) => {
  const gamesData = getPlaystationGamesData();
  res.json({
    isScraping: getIsPlaystationScraping(),
    lastScrapeTime: getPlaystationLastScrapeTime(),
    gamesCount: gamesData.length,
    hasData: gamesData.length > 0,
    progress: getPlaystationScrapingProgress()
  });
});

/**
 * GET /api/games/playstation
 * Returns aggregated PlayStation games data
 */
router.get('/games/playstation', async (req, res) => {
  try {
    const gamesData = getPlaystationGamesData();
    const lastScrapeTime = getPlaystationLastScrapeTime();
    
    if (gamesData.length === 0) {
      return res.json({
        games: [],
        message: 'No PlayStation data available. Please run scraping first.',
        lastScrapeTime: null
      });
    }

    res.json({
      games: gamesData,
      lastScrapeTime: lastScrapeTime,
      count: gamesData.length
    });
  } catch (error) {
    console.error('Error getting PlayStation games:', error);
    res.status(500).json({ error: 'Failed to get PlayStation games data' });
  }
});

/**
 * POST /api/scrape/playstation
 * Triggers PlayStation scraping for all countries
 */
router.post('/scrape/playstation', async (req, res) => {
  if (getIsPlaystationScraping()) {
    return res.status(429).json({ 
      error: 'PlayStation scraping already in progress. Please wait.',
      isScraping: true 
    });
  }

  setIsPlaystationScraping(true);
  const startTime = Date.now();

  try {
    addLog('Starting manual PlayStation scraping...', LOG_TYPES.INFO, EVENT_CATEGORIES.SCRAPING, { platform: 'playstation', trigger: 'manual' });
    
    // Scrape all countries with progress tracking
    const countryData = await scrapeAllPlaystationCountries((progress) => {
      setPlaystationScrapingProgress(progress);
    });
    
    // Aggregate by productId
    const aggregatedGames = aggregatePlaystationGamesByProductId(countryData);
    
    // Add currency conversions (to COP)
    const gamesWithConversions = await addPlaystationCurrencyConversions(aggregatedGames);
    
    // Format for display
    const formattedGames = formatPlaystationGamesForDisplay(gamesWithConversions);
    setPlaystationGamesData(formattedGames);
    setPlaystationLastScrapeTime(new Date().toISOString());
    setPlaystationScrapingProgress(null); // Clear progress when done

    // Save to CSV file
    try {
      const csvPath = await savePlaystationCSV(formattedGames);
      addLog(`PlayStation CSV saved successfully`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { platform: 'playstation', path: csvPath });
    } catch (error) {
      addLog(`Error saving PlayStation CSV: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { platform: 'playstation', error: error.message });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    addLog(`PlayStation scraping completed successfully. Found ${formattedGames.length} games in ${duration}s`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SCRAPING, { 
      platform: 'playstation', 
      gamesCount: formattedGames.length, 
      duration: `${duration}s`,
      trigger: 'manual'
    });

    res.json({
      success: true,
      message: 'PlayStation scraping completed successfully',
      count: formattedGames.length,
      lastScrapeTime: getPlaystationLastScrapeTime(),
      duration: `${duration}s`
    });
  } catch (error) {
    addLog(`Error during manual PlayStation scraping: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'playstation', 
      error: error.message,
      trigger: 'manual'
    });
    res.status(500).json({ 
      error: 'Failed to scrape PlayStation data',
      message: error.message 
    });
  } finally {
    setIsPlaystationScraping(false);
  }
});

/**
 * GET /api/download/excel/playstation
 * Downloads PlayStation games data as Excel file
 */
router.get('/download/excel/playstation', async (req, res) => {
  try {
    const gamesData = getPlaystationGamesData();
    
    if (gamesData.length === 0) {
      addLog('Excel download failed: No PlayStation data available', LOG_TYPES.WARNING, EVENT_CATEGORIES.SYSTEM, { platform: 'playstation' });
      return res.status(404).json({ 
        error: 'No PlayStation data available. Please run scraping first.' 
      });
    }

    const excelBuffer = generatePlaystationExcel(gamesData);
    const filename = `playstation-games-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
    
    addLog(`PlayStation Excel file downloaded successfully: ${filename}`, LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SYSTEM, { 
      platform: 'playstation', 
      filename,
      gamesCount: gamesData.length 
    });
  } catch (error) {
    addLog(`Error generating PlayStation Excel file: ${error.message}`, LOG_TYPES.ERROR, EVENT_CATEGORIES.ERROR, { 
      platform: 'playstation', 
      error: error.message 
    });
    res.status(500).json({ error: 'Failed to generate PlayStation Excel file' });
  }
});

/**
 * GET /api/logs
 * Returns application logs/notifications
 */
router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;
    const category = req.query.category;

    let logs = getLogs(limit);

    if (type) {
      logs = logs.filter(log => log.type === type);
    }

    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    res.json({
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

/**
 * DELETE /api/logs
 * Clears all logs
 */
router.delete('/logs', (req, res) => {
  try {
    clearLogs();
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

export default router;

