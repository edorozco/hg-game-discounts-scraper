import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory to store CSV files
const CSV_DIR = path.join(__dirname, '../../data');

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory() {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }
}

/**
 * Formats a value for CSV (handles null, undefined, and escapes commas/quotes)
 * @param {*} value - Value to format
 * @returns {string} Formatted value
 */
function formatCSVValue(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Generates CSV content from Xbox games data
 * @param {Array} gamesData - Array of formatted game objects
 * @returns {string} CSV content
 */
function generateXboxCSV(gamesData) {
  const headers = [
    'Juego',
    'Product ID',
    'Colombia - Precio Normal',
    'Colombia - Precio Descuento',
    'Colombia - Moneda',
    'Argentina - Precio Normal',
    'Argentina - Precio Descuento',
    'Argentina - Moneda',
    'ARS-COP (Precio Descuento)',
    'ARS-COP (Precio Normal)',
    'Turquía - Precio Normal',
    'Turquía - Precio Descuento',
    'Turquía - Moneda',
    'TRY-COP (Precio Descuento)',
    'TRY-COP (Precio Normal)',
    'India - Precio Normal',
    'India - Precio Descuento',
    'India - Moneda',
    'INR-COP (Precio Descuento)',
    'INR-COP (Precio Normal)'
  ];

  const rows = [headers.join(',')];

  gamesData.forEach(game => {
    const row = [
      formatCSVValue(game.title),
      formatCSVValue(game.productId),
      // Colombia
      formatCSVValue(game.CO?.msrp ?? 'N/A'),
      formatCSVValue(game.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.CO?.currency ?? 'N/A'),
      // Argentina
      formatCSVValue(game.AR?.msrp ?? 'N/A'),
      formatCSVValue(game.AR?.listPrice ?? 'N/A'),
      formatCSVValue(game.AR?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.AR?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.AR?.CO?.msrp ?? 'N/A'),
      // Turquía
      formatCSVValue(game.TR?.msrp ?? 'N/A'),
      formatCSVValue(game.TR?.listPrice ?? 'N/A'),
      formatCSVValue(game.TR?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.TR?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.TR?.CO?.msrp ?? 'N/A'),
      // India
      formatCSVValue(game.IN?.msrp ?? 'N/A'),
      formatCSVValue(game.IN?.listPrice ?? 'N/A'),
      formatCSVValue(game.IN?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.IN?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.IN?.CO?.msrp ?? 'N/A')
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Generates CSV content from PlayStation games data
 * @param {Array} gamesData - Array of formatted game objects
 * @returns {string} CSV content
 */
function generatePlaystationCSV(gamesData) {
  const headers = [
    'Juego',
    'Product ID',
    'Estados Unidos - Precio Normal',
    'Estados Unidos - Precio Descuento',
    'Estados Unidos - Moneda',
    'USD-COP (Precio Descuento)',
    'USD-COP (Precio Normal)',
    'Turquía - Precio Normal',
    'Turquía - Precio Descuento',
    'Turquía - Moneda',
    'TRY-COP (Precio Descuento)',
    'TRY-COP (Precio Normal)',
    'India - Precio Normal',
    'India - Precio Descuento',
    'India - Moneda',
    'INR-COP (Precio Descuento)',
    'INR-COP (Precio Normal)'
  ];

  const rows = [headers.join(',')];

  gamesData.forEach(game => {
    const row = [
      formatCSVValue(game.title),
      formatCSVValue(game.productId),
      // Estados Unidos
      formatCSVValue(game.US?.msrp ?? 'N/A'),
      formatCSVValue(game.US?.listPrice ?? 'N/A'),
      formatCSVValue(game.US?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.US?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.US?.CO?.msrp ?? 'N/A'),
      // Turquía
      formatCSVValue(game.TR?.msrp ?? 'N/A'),
      formatCSVValue(game.TR?.listPrice ?? 'N/A'),
      formatCSVValue(game.TR?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.TR?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.TR?.CO?.msrp ?? 'N/A'),
      // India
      formatCSVValue(game.IN?.msrp ?? 'N/A'),
      formatCSVValue(game.IN?.listPrice ?? 'N/A'),
      formatCSVValue(game.IN?.currency ?? 'N/A'),
      formatCSVValue(game.conversions?.IN?.CO?.listPrice ?? 'N/A'),
      formatCSVValue(game.conversions?.IN?.CO?.msrp ?? 'N/A')
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Saves CSV file for Xbox games
 * Uses temporary file approach: creates tmp file, then replaces old file
 * @param {Array} gamesData - Array of formatted game objects
 * @returns {Promise<string>} Path to the saved CSV file
 */
export async function saveXboxCSV(gamesData) {
  ensureDataDirectory();
  
  const csvContent = generateXboxCSV(gamesData);
  const tmpFilePath = path.join(CSV_DIR, 'xbox.tmp.csv');
  const finalFilePath = path.join(CSV_DIR, 'xbox.csv');
  
  // Write to temporary file
  fs.writeFileSync(tmpFilePath, csvContent, 'utf8');
  
  // Remove old file if it exists
  if (fs.existsSync(finalFilePath)) {
    fs.unlinkSync(finalFilePath);
  }
  
  // Rename temporary file to final file
  fs.renameSync(tmpFilePath, finalFilePath);
  
  return finalFilePath;
}

/**
 * Saves CSV file for PlayStation games
 * Uses temporary file approach: creates tmp file, then replaces old file
 * @param {Array} gamesData - Array of formatted game objects
 * @returns {Promise<string>} Path to the saved CSV file
 */
export async function savePlaystationCSV(gamesData) {
  ensureDataDirectory();
  
  const csvContent = generatePlaystationCSV(gamesData);
  const tmpFilePath = path.join(CSV_DIR, 'playstation.tmp.csv');
  const finalFilePath = path.join(CSV_DIR, 'playstation.csv');
  
  // Write to temporary file
  fs.writeFileSync(tmpFilePath, csvContent, 'utf8');
  
  // Remove old file if it exists
  if (fs.existsSync(finalFilePath)) {
    fs.unlinkSync(finalFilePath);
  }
  
  // Rename temporary file to final file
  fs.renameSync(tmpFilePath, finalFilePath);
  
  return finalFilePath;
}

