const express = require('express');
const {
  getVideoInfo,
  createDownloadJob,
  getJobStatus,
  pauseDownloadJob,
  resumeDownloadJob,
  cancelDownloadJob
} = require('../controllers/download.controller');

const router = express.Router();

router.post('/info', getVideoInfo);
router.post('/request', createDownloadJob);
router.get('/status/:jobId', getJobStatus);
router.post('/pause/:jobId', pauseDownloadJob);
router.post('/resume/:jobId', resumeDownloadJob);
router.post('/cancel/:jobId', cancelDownloadJob);

module.exports = router;
