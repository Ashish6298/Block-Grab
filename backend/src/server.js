const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorHandler');
const { initDirs, startCleanupTask, getDownloadsDir } = require('./services/fileManager.service');
const downloadRoutes = require('./routes/download.routes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize directories and file cleanups
initDirs();
startCleanupTask();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve downloads statically
app.use('/downloads', express.static(getDownloadsDir()));

// API Routes
app.use('/api/download', downloadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Centralized error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Media Downloader Backend running on port ${PORT}`);
});
