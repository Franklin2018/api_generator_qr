 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad y logging
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));

// Parsear JSON y URL encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
// Servir archivos estáticos (para ver QRs generados)
app.use('/generated', express.static(path.join(__dirname, '../generated')));

// Importar y montar las rutas de la API (ESTO ES LO NUEVO)
const qrRoutes = require('./routes/qrRoutes');
app.use('/api/qr', qrRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'QR Generator API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'POST /api/qr/generate - Generate QR code',
      'GET /api/qr/history - Get QR history',
      'GET /api/qr/stats - Get statistics',
      'DELETE /api/qr/:qrId - Delete specific QR',
      'DELETE /api/qr/clear-history - Clear all history'
    ]
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 QR Generator API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
