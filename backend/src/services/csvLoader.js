import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where CSV files are stored
const CSV_DIR = path.join(__dirname, '../../data');

/**
 * Parses a CSV line, handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return values;
}

/**
 * Parses CSV content into array of objects
 * @param {string} csvContent - CSV file content
 * @returns {Array} Array of objects with headers as keys
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Converts Xbox CSV data to games format
 * @param {Array} csvData - Parsed CSV data
 * @returns {Array} Formatted games array
 */
function convertXboxCSVToGames(csvData) {
  return csvData.map(row => {
    const game = {
      productId: row['Product ID'] || '',
      title: row['Juego'] || '',
      CO: null,
      AR: null,
      TR: null,
      IN: null,
      conversions: {}
    };

    // Parse Colombia data
    const colombiaMsrp = row['Colombia - Precio Normal'];
    const colombiaListPrice = row['Colombia - Precio Descuento'];
    if (colombiaMsrp && colombiaMsrp !== 'N/A' && !isNaN(parseFloat(colombiaMsrp))) {
      game.CO = {
        msrp: parseFloat(colombiaMsrp) || 0,
        listPrice: parseFloat(colombiaListPrice) || 0,
        currency: row['Colombia - Moneda'] || 'COP'
      };
    }

    // Parse Argentina data
    const argentinaMsrp = row['Argentina - Precio Normal'];
    const argentinaListPrice = row['Argentina - Precio Descuento'];
    if (argentinaMsrp && argentinaMsrp !== 'N/A' && !isNaN(parseFloat(argentinaMsrp))) {
      game.AR = {
        msrp: parseFloat(argentinaMsrp) || 0,
        listPrice: parseFloat(argentinaListPrice) || 0,
        currency: row['Argentina - Moneda'] || 'ARS'
      };
      
      // Add conversion if available
      const arsCopDiscount = row['ARS-COP (Precio Descuento)'];
      const arsCopNormal = row['ARS-COP (Precio Normal)'];
      if (arsCopDiscount && arsCopDiscount !== 'N/A' && !isNaN(parseFloat(arsCopDiscount))) {
        game.conversions.AR = {
          CO: {
            msrp: parseFloat(arsCopNormal) || 0,
            listPrice: parseFloat(arsCopDiscount) || 0
          }
        };
      }
    }

    // Parse Turquía data
    if (row['Turquía - Precio Normal'] && row['Turquía - Precio Normal'] !== 'N/A') {
      game.TR = {
        msrp: parseFloat(row['Turquía - Precio Normal']) || 0,
        listPrice: parseFloat(row['Turquía - Precio Descuento']) || 0,
        currency: row['Turquía - Moneda'] || 'TRY'
      };
      
      // Add conversion if available
      if (row['TRY-COP (Precio Descuento)'] && row['TRY-COP (Precio Descuento)'] !== 'N/A') {
        game.conversions.TR = {
          CO: {
            msrp: parseFloat(row['TRY-COP (Precio Normal)']) || 0,
            listPrice: parseFloat(row['TRY-COP (Precio Descuento)']) || 0
          }
        };
      }
    }

    // Parse India data
    if (row['India - Precio Normal'] && row['India - Precio Normal'] !== 'N/A') {
      game.IN = {
        msrp: parseFloat(row['India - Precio Normal']) || 0,
        listPrice: parseFloat(row['India - Precio Descuento']) || 0,
        currency: row['India - Moneda'] || 'INR'
      };
      
      // Add conversion if available
      if (row['INR-COP (Precio Descuento)'] && row['INR-COP (Precio Descuento)'] !== 'N/A') {
        game.conversions.IN = {
          CO: {
            msrp: parseFloat(row['INR-COP (Precio Normal)']) || 0,
            listPrice: parseFloat(row['INR-COP (Precio Descuento)']) || 0
          }
        };
      }
    }

    return game;
  });
}

/**
 * Converts PlayStation CSV data to games format
 * @param {Array} csvData - Parsed CSV data
 * @returns {Array} Formatted games array
 */
function convertPlaystationCSVToGames(csvData) {
  return csvData.map(row => {
    const game = {
      productId: row['Product ID'] || '',
      title: row['Juego'] || '',
      platform: 'playstation',
      US: null,
      TR: null,
      IN: null,
      conversions: {}
    };

    // Parse Estados Unidos data
    const usMsrp = row['Estados Unidos - Precio Normal'];
    const usListPrice = row['Estados Unidos - Precio Descuento'];
    if (usMsrp && usMsrp !== 'N/A' && !isNaN(parseFloat(usMsrp))) {
      game.US = {
        msrp: parseFloat(usMsrp) || 0,
        listPrice: parseFloat(usListPrice) || 0,
        currency: row['Estados Unidos - Moneda'] || 'USD'
      };
      
      // Add conversion if available
      const usdCopDiscount = row['USD-COP (Precio Descuento)'];
      const usdCopNormal = row['USD-COP (Precio Normal)'];
      if (usdCopDiscount && usdCopDiscount !== 'N/A' && !isNaN(parseFloat(usdCopDiscount))) {
        game.conversions.US = {
          CO: {
            msrp: parseFloat(usdCopNormal) || 0,
            listPrice: parseFloat(usdCopDiscount) || 0
          }
        };
      }
    }

    // Parse Turquía data
    const turquiaMsrp = row['Turquía - Precio Normal'];
    const turquiaListPrice = row['Turquía - Precio Descuento'];
    if (turquiaMsrp && turquiaMsrp !== 'N/A' && !isNaN(parseFloat(turquiaMsrp))) {
      game.TR = {
        msrp: parseFloat(turquiaMsrp) || 0,
        listPrice: parseFloat(turquiaListPrice) || 0,
        currency: row['Turquía - Moneda'] || 'TRY'
      };
      
      // Add conversion if available
      const tryCopDiscount = row['TRY-COP (Precio Descuento)'];
      const tryCopNormal = row['TRY-COP (Precio Normal)'];
      if (tryCopDiscount && tryCopDiscount !== 'N/A' && !isNaN(parseFloat(tryCopDiscount))) {
        game.conversions.TR = {
          CO: {
            msrp: parseFloat(tryCopNormal) || 0,
            listPrice: parseFloat(tryCopDiscount) || 0
          }
        };
      }
    }

    // Parse India data
    const indiaMsrp = row['India - Precio Normal'];
    const indiaListPrice = row['India - Precio Descuento'];
    if (indiaMsrp && indiaMsrp !== 'N/A' && !isNaN(parseFloat(indiaMsrp))) {
      game.IN = {
        msrp: parseFloat(indiaMsrp) || 0,
        listPrice: parseFloat(indiaListPrice) || 0,
        currency: row['India - Moneda'] || 'INR'
      };
      
      // Add conversion if available
      const inrCopDiscount = row['INR-COP (Precio Descuento)'];
      const inrCopNormal = row['INR-COP (Precio Normal)'];
      if (inrCopDiscount && inrCopDiscount !== 'N/A' && !isNaN(parseFloat(inrCopDiscount))) {
        game.conversions.IN = {
          CO: {
            msrp: parseFloat(inrCopNormal) || 0,
            listPrice: parseFloat(inrCopDiscount) || 0
          }
        };
      }
    }

    return game;
  });
}

/**
 * Loads Xbox games from CSV file
 * @returns {Array|null} Array of games or null if file doesn't exist
 */
export function loadXboxGamesFromCSV() {
  const csvPath = path.join(CSV_DIR, 'xbox.csv');
  
  if (!fs.existsSync(csvPath)) {
    return null;
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    const games = convertXboxCSVToGames(csvData);
    
    // Get file modification time as last scrape time
    const stats = fs.statSync(csvPath);
    const lastScrapeTime = stats.mtime.toISOString();
    
    return { games, lastScrapeTime };
  } catch (error) {
    console.error('Error loading Xbox CSV:', error);
    return null;
  }
}

/**
 * Loads PlayStation games from CSV file
 * @returns {Array|null} Array of games or null if file doesn't exist
 */
export function loadPlaystationGamesFromCSV() {
  const csvPath = path.join(CSV_DIR, 'playstation.csv');
  
  if (!fs.existsSync(csvPath)) {
    return null;
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    const games = convertPlaystationCSVToGames(csvData);
    
    // Get file modification time as last scrape time
    const stats = fs.statSync(csvPath);
    const lastScrapeTime = stats.mtime.toISOString();
    
    return { games, lastScrapeTime };
  } catch (error) {
    console.error('Error loading PlayStation CSV:', error);
    return null;
  }
}

