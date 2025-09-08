const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const upload = require('../middleware/upload');
const validation = require('../middleware/validation');

// Generar nuevo QR con Cloudinary (nueva funcionalidad)
router.post('/generate', 
  upload.single('logo'), 
  validation.validateQRRequest, 
  qrController.generateQR
);

// Generar QR directo sin Cloudinary (mantiene comportamiento original)
router.post('/generate-direct', 
  upload.single('logo'), 
  validation.validateQRRequest, 
  qrController.generateQRDirect
);

// Obtener historial de QRs
router.get('/history', qrController.getHistory);

// Obtener estadísticas
router.get('/stats', qrController.getStats);

// Generar nueva sesión
router.post('/session', qrController.generateSession);

// Eliminar QR específico
router.delete('/:qrId', qrController.deleteQR);

// Limpiar todo el historial (para admin)
router.delete('/clear-history', qrController.clearHistory);

// Proxy para preview de imágenes
// router.get('/preview/:qrId', qrController.getQRPreview);
router.get('/preview/*', qrController.getQRPreview);

module.exports = router;