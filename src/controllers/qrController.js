const qrGenerator = require('../services/qrGenerator');
const imageProcessor = require('../services/imageProcessor');
const fileHelper = require('../utils/fileHelper');

/**
 * Genera QR en formato SVG
 */
async function generateSVGQR(text, logoPath, options) {
  let svgString = await qrGenerator.generateSVG(text, options);
  
  if (logoPath) {
    svgString = await imageProcessor.insertLogoInSVG(svgString, logoPath, options);
  }
  
  return svgString;
}

/**
 * Genera QR en formato raster (PNG, JPG, WEBP)
 */
async function generateRasterQR(text, logoPath, options) {
  let qrBuffer = await qrGenerator.generateBuffer(text, options.format, options);
  
  if (logoPath) {
    qrBuffer = await imageProcessor.combineQrWithLogo(qrBuffer, logoPath, options);
  }
  
  // Convertir al formato final si es necesario
  if (options.format !== 'png') {
    qrBuffer = await imageProcessor.convertToFormat(qrBuffer, options.format, options.quality);
  }
  
  return qrBuffer;
}

/**
 * Generar código QR
 */
async function generateQR(req, res) {
  let logoPath = null;
  
  try {
    // Obtener datos validados
  // Obtener datos validados
const { text, size, logoSize, logoPaddingWidth, logoPaddingHeight, format, quality } = req.validatedData;
const hasLogo = req.file !== undefined;
    
    if (hasLogo) {
      logoPath = req.file.path;
    }

    console.log(`🔄 Generando QR: ${text.substring(0, 50)}...`);
    console.log(`📐 Configuración: ${size}px, formato: ${format}, logo: ${hasLogo ? 'Sí' : 'No'}`);

    let finalData;
    let isBuffer = true;
    
    // Generar según el formato
    if (format === 'svg') {
  finalData = await generateSVGQR(text, logoPath, { size, logoSize, logoPaddingWidth, logoPaddingHeight });
  isBuffer = false;
} else {
  finalData = await generateRasterQR(text, logoPath, { size, logoSize, logoPaddingWidth, logoPaddingHeight, format, quality });
  isBuffer = true;
}

    // Generar nombre de archivo y guardar
    const fileName = fileHelper.generateFileName(format);
    const savedPath = await qrGenerator.saveToServer(finalData, fileName, isBuffer);
    
    console.log(`✅ QR generado y guardado: ${savedPath}`);

    // Configurar headers de respuesta
    const contentType = fileHelper.getContentType(format);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`
    });

    // Enviar respuesta
    res.send(finalData);

  } catch (error) {
    console.error('❌ Error generando QR:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  } finally {
    // Limpiar archivo temporal del logo
    if (logoPath) {
      await imageProcessor.cleanup(logoPath);
    }
  }
}

module.exports = {
  generateQR
};