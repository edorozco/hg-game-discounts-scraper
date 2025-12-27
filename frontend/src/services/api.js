import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get all games data
 */
export async function getGames() {
  const response = await api.get('/games');
  return response.data;
}

/**
 * Trigger scraping
 */
export async function scrapeGames() {
  const response = await api.post('/scrape');
  return response.data;
}

/**
 * Download Excel file
 */
export async function downloadExcel() {
  const response = await api.get('/download/excel', {
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
    : `xbox-games-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Get scraping status
 */
export async function getStatus() {
  const response = await api.get('/status');
  return response.data;
}

/**
 * Get PlayStation scraping status
 */
export async function getPlaystationStatus() {
  const response = await api.get('/status/playstation');
  return response.data;
}

/**
 * Get all PlayStation games data
 */
export async function getPlaystationGames() {
  const response = await api.get('/games/playstation');
  return response.data;
}

/**
 * Trigger PlayStation scraping
 */
export async function scrapePlaystationGames() {
  const response = await api.post('/scrape/playstation');
  return response.data;
}

/**
 * Download PlayStation Excel file
 */
export async function downloadPlaystationExcel() {
  const response = await api.get('/download/excel/playstation', {
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
    : `playstation-games-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Get application logs/notifications
 */
export async function getLogs(limit = 50, type = null, category = null) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (type) params.append('type', type);
  if (category) params.append('category', category);
  
  const response = await api.get(`/logs?${params.toString()}`);
  return response.data;
}

/**
 * Clear all logs
 */
export async function clearLogs() {
  const response = await api.delete('/logs');
  return response.data;
}

