import * as XLSX from 'xlsx';

/**
 * Generates Excel file from games data
 * @param {Array} gamesData - Array of formatted game objects
 * @returns {Buffer} Excel file buffer
 */
export function generateExcel(gamesData) {
  // Prepare data for Excel
  const excelData = gamesData.map(game => {
    const row = {
      'Juego': game.title,
      'Product ID': game.productId,
    };

    // Add data for each country
    const countries = ['CO', 'AR', 'TR', 'IN'];
    const countryNames = {
      CO: 'Colombia',
      AR: 'Argentina',
      TR: 'Turquía',
      IN: 'India'
    };

    countries.forEach(country => {
      const countryData = game[country];
      const countryName = countryNames[country];

      if (countryData) {
        row[`${countryName} - Precio Normal`] = countryData.msrp;
        row[`${countryName} - Precio Descuento`] = countryData.listPrice;
        row[`${countryName} - Moneda`] = countryData.currency;
        
        // Add conversion to COP for all countries except Colombia
        if (country !== 'CO' && game.conversions?.[country]?.CO) {
          const conversion = game.conversions[country].CO;
          const currencyCode = countryData.currency;
          row[`${currencyCode}-COP (Precio Descuento)`] = conversion.listPrice;
          row[`${currencyCode}-COP (Precio Normal)`] = conversion.msrp;
        }
      } else {
        row[`${countryName} - Precio Normal`] = 'N/A';
        row[`${countryName} - Precio Descuento`] = 'N/A';
        row[`${countryName} - Moneda`] = 'N/A';
        // Add empty conversion columns for countries without data
        if (country !== 'CO') {
          const currencyCodes = { AR: 'ARS', TR: 'TRY', IN: 'INR' };
          const currencyCode = currencyCodes[country];
          row[`${currencyCode}-COP (Precio Descuento)`] = 'N/A';
          row[`${currencyCode}-COP (Precio Normal)`] = 'N/A';
        }
      }
    });

    return row;
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths (dynamic based on actual columns)
  // The widths will be set automatically, but we can specify key ones
  const columnWidths = [
    { wch: 50 }, // Juego
    { wch: 20 }, // Product ID
    { wch: 20 }, // Colombia - Precio Normal
    { wch: 20 }, // Colombia - Precio Descuento
    { wch: 15 }, // Colombia - Moneda
    { wch: 20 }, // Argentina - Precio Normal
    { wch: 20 }, // Argentina - Precio Descuento
    { wch: 15 }, // Argentina - Moneda
    { wch: 20 }, // ARS-COP (Precio Descuento)
    { wch: 20 }, // ARS-COP (Precio Normal)
    { wch: 20 }, // Turquía - Precio Normal
    { wch: 20 }, // Turquía - Precio Descuento
    { wch: 15 }, // Turquía - Moneda
    { wch: 20 }, // TRY-COP (Precio Descuento)
    { wch: 20 }, // TRY-COP (Precio Normal)
    { wch: 20 }, // India - Precio Normal
    { wch: 20 }, // India - Precio Descuento
    { wch: 15 }, // India - Moneda
    { wch: 20 }, // INR-COP (Precio Descuento)
    { wch: 20 }, // INR-COP (Precio Normal)
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Juegos Xbox');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}

/**
 * Generates Excel file from PlayStation games data
 * @param {Array} gamesData - Array of formatted PlayStation game objects
 * @returns {Buffer} Excel file buffer
 */
export function generatePlaystationExcel(gamesData) {
  // Prepare data for Excel
  const excelData = gamesData.map(game => {
    const row = {
      'Juego': game.title,
      'Product ID': game.productId,
    };

    // Add data for each country (US, TR, IN)
    const countries = ['US', 'TR', 'IN'];
    const countryNames = {
      US: 'Estados Unidos',
      TR: 'Turquía',
      IN: 'India'
    };

    countries.forEach(country => {
      const countryData = game[country];
      const countryName = countryNames[country];

      if (countryData) {
        row[`${countryName} - Precio Normal`] = countryData.msrp;
        row[`${countryName} - Precio Descuento`] = countryData.listPrice;
        row[`${countryName} - Moneda`] = countryData.currency;
        
        // Add conversion to COP for all countries
        if (game.conversions?.[country]?.CO) {
          const conversion = game.conversions[country].CO;
          const currencyCode = countryData.currency;
          row[`${currencyCode}-COP (Precio Descuento)`] = conversion.listPrice;
          row[`${currencyCode}-COP (Precio Normal)`] = conversion.msrp;
        }
      } else {
        row[`${countryName} - Precio Normal`] = 'N/A';
        row[`${countryName} - Precio Descuento`] = 'N/A';
        row[`${countryName} - Moneda`] = 'N/A';
        // Add empty conversion columns for countries without data
        const currencyCodes = { US: 'USD', TR: 'TRY', IN: 'INR' };
        const currencyCode = currencyCodes[country];
        row[`${currencyCode}-COP (Precio Descuento)`] = 'N/A';
        row[`${currencyCode}-COP (Precio Normal)`] = 'N/A';
      }
    });

    return row;
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 50 }, // Juego
    { wch: 20 }, // Product ID
    { wch: 20 }, // Estados Unidos - Precio Normal
    { wch: 20 }, // Estados Unidos - Precio Descuento
    { wch: 15 }, // Estados Unidos - Moneda
    { wch: 20 }, // USD-COP (Precio Descuento)
    { wch: 20 }, // USD-COP (Precio Normal)
    { wch: 20 }, // Turquía - Precio Normal
    { wch: 20 }, // Turquía - Precio Descuento
    { wch: 15 }, // Turquía - Moneda
    { wch: 20 }, // TRY-COP (Precio Descuento)
    { wch: 20 }, // TRY-COP (Precio Normal)
    { wch: 20 }, // India - Precio Normal
    { wch: 20 }, // India - Precio Descuento
    { wch: 15 }, // India - Moneda
    { wch: 20 }, // INR-COP (Precio Descuento)
    { wch: 20 }, // INR-COP (Precio Normal)
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Juegos PlayStation');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}

