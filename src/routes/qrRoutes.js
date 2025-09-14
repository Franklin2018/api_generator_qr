const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { uploadSingle, handleUploadError } = require('../middleware/upload'); 
const { validateQrGenerate } = require('../middleware/validation'); 

router.post('/generate', 
  uploadSingle,  
  handleUploadError, 
  validateQrGenerate, 
  qrController.generateQR
);

router.post('/generate-direct', 
  uploadSingle,  
  handleUploadError,  
  validateQrGenerate, 
  qrController.generateQRDirect
);

// Obtener historial de QRs
router.get('/history', qrController.getHistory);

// Obtener estadísticas
router.get('/stats', qrController.getStats);

// Eliminar QR específico
router.delete('/:qrId', qrController.deleteQR);

// Limpiar todo el historial (para admin)
router.delete('/clear-history', qrController.clearHistory);

// Proxy para preview de imágenes
 router.get('/preview/:qrId', qrController.getQRPreview);

module.exports = router;
