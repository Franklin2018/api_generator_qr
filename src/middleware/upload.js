 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorio de uploads si no existe
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: logo_timestamp_random.ext
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    cb(null, `logo_${timestamp}_${random}${ext}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no permitido. Use: JPG, PNG, WEBP, SVG'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB por defecto
    files: 1 // Solo un archivo por request
  }
});

// Middleware para manejo de errores de multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Archivo muy grande',
        message: 'El logo no debe superar 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Demasiados archivos',
        message: 'Solo se permite un logo por request'
      });
    }
  }
  
  if (error.message.includes('Formato de archivo no permitido')) {
    return res.status(400).json({
      error: 'Formato no válido',
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  uploadSingle: upload.single('logo'),
  handleUploadError
};