import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { startScheduler } from './scheduler/scraperJob.js';
import { addLog, LOG_TYPES, EVENT_CATEGORIES } from './services/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  
  addLog('Server started successfully', LOG_TYPES.SUCCESS, EVENT_CATEGORIES.SYSTEM, { port: PORT });
  
  // Start scheduled scraping
  startScheduler();
});

