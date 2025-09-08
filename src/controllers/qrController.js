const qrGenerator = require('../services/qrGenerator');
const imageProcessor = require('../services/imageProcessor');
const cloudinaryService = require('../services/cloudinaryService')
const fileHelper = require('../utils/fileHelper');
const fs = require('fs').promises;
const path = require('path');

// ID fijo para el admin/único usuario
const ADMIN_SESSION = 'admin-user';

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
  let tempFilePath = null;
  
  try {
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
    tempFilePath = savedPath;

    console.log(`✅ QR generado y guardado temporalmente: ${savedPath}`);

   // Subir a Cloudinary (usando ID fijo de admin)
    const uploadResult = await cloudinaryService.uploadQR(tempFilePath, {
      text: text,
      format: format,
      hasLogo: hasLogo,
      userSession: ADMIN_SESSION, // ID fijo para el admin
      size: size,
      logoSize: logoSize
    });

    // Limpiar archivo temporal
    try {
      await fs.unlink(tempFilePath);
      console.log(`🧹 Archivo temporal eliminado: ${tempFilePath}`);
    } catch (cleanupError) {
      console.warn('⚠️  No se pudo limpiar archivo temporal:', cleanupError.message);
    }

    if (!uploadResult.success) {
      console.error('❌ Error subiendo a Cloudinary:', uploadResult.error);
      
      // Fallback: enviar el archivo generado directamente
      console.log('📤 Enviando archivo directamente como fallback');
      const contentType = fileHelper.getContentType(format);
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      });
      return res.send(finalData);
    }

    console.log(`✅ QR subido a Cloudinary: ${uploadResult.data.url}`);
 

    /* // Configurar headers de respuesta
    const contentType = fileHelper.getContentType(format);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`
    });

    // Enviar respuesta
    res.send(finalData); */

        // Responder con información del QR y URL de Cloudinary
    res.json({
      success: true,
      data: {
        qr: {
          id: uploadResult.data.id,
          url: uploadResult.data.url,
          format: uploadResult.data.format,
          size: uploadResult.data.size,
          width: uploadResult.data.width,
          height: uploadResult.data.height,
          createdAt: uploadResult.data.createdAt,
          metadata: uploadResult.data.metadata
        },
        message: 'QR generado y guardado exitosamente'
      }
    });

  } catch (error) {
    console.error('❌ Error generando QR:', error.message);
    
    // Limpiar archivo temporal en caso de error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`🧹 Archivo temporal eliminado tras error: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn('⚠️  No se pudo limpiar archivo temporal:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error generando QR'
    });
  } finally {
    // Limpiar archivo temporal del logo
    if (logoPath) {
      await imageProcessor.cleanup(logoPath);
    }
  }
}

/**
 * Generar QR y devolver directamente (mantiene compatibilidad con el comportamiento original)
 */
async function generateQRDirect(req, res) {
  let logoPath = null;
  
  try {
    // Obtener datos validados
    const { text, size, logoSize, logoPaddingWidth, logoPaddingHeight, format, quality } = req.validatedData;
    const hasLogo = req.file !== undefined;
    
    if (hasLogo) {
      logoPath = req.file.path;
    }

    console.log(`🔄 Generando QR directo: ${text.substring(0, 50)}...`);
    console.log(`📐 Configuración: ${size}px, formato: ${format}, logo: ${hasLogo ? 'Sí' : 'No'}`);

    let finalData;
    
    // Generar según el formato
    if (format === 'svg') {
      finalData = await generateSVGQR(text, logoPath, { size, logoSize, logoPaddingWidth, logoPaddingHeight });
    } else {
      finalData = await generateRasterQR(text, logoPath, { size, logoSize, logoPaddingWidth, logoPaddingHeight, format, quality });
    }

    console.log(`✅ QR generado directamente`);

    // Configurar headers de respuesta
    const contentType = fileHelper.getContentType(format);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="qr-code.${format}"`
    });

    // Enviar respuesta
    res.send(finalData);

  } catch (error) {
    console.error('❌ Error generando QR directo:', error.message);
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

/**
 * Obtiene el historial de QRs (todos para el admin)
 */
async function getHistory(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    
    console.log(`📖 Obteniendo historial completo de QRs`);
    
    const historyResult = await cloudinaryService.getQRHistory(process.env.ADMIN_SESSION, limit);
    
    if (!historyResult.success) {
      console.error('❌ Error obteniendo historial:', historyResult.error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial'
      });
    }

    // Paginación simple
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = historyResult.data.slice(startIndex, endIndex);

    console.log(`✅ Historial obtenido: ${paginatedData.length} QRs de ${historyResult.total} totales`);

    res.json({
      success: true,
      data: {
        qrs: paginatedData,
        pagination: {
          currentPage: page,
          totalItems: historyResult.total,
          itemsPerPage: limit,
          totalPages: Math.ceil(historyResult.total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en getHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Elimina un QR específico
 */
async function deleteQR(req, res) {
  try {
    const { qrId } = req.params;
    
    if (!qrId) {
      return res.status(400).json({
        success: false,
        error: 'ID de QR requerido'
      });
    }

    console.log(`🗑️  Eliminando QR: ${qrId}`);

    const deleteResult = await cloudinaryService.deleteQR(qrId);
    
    if (!deleteResult.success) {
      console.error('❌ Error eliminando QR:', deleteResult.error);
      return res.status(400).json({
        success: false,
        error: deleteResult.error || 'Error al eliminar QR'
      });
    }

    console.log(`✅ QR eliminado: ${qrId}`);

    res.json({
      success: true,
      message: 'QR eliminado correctamente'
    });

  } catch (error) {
    console.error('❌ Error en deleteQR:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene estadísticas generales
 */
async function getStats(req, res) {
  try {
    console.log(`📊 Obteniendo estadísticas generales`);
    
    const statsResult = await cloudinaryService.getStats(ADMIN_SESSION);
    
    if (!statsResult.success) {
      console.error('❌ Error obteniendo estadísticas:', statsResult.error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas'
      });
    }

    console.log(`✅ Estadísticas obtenidas: ${statsResult.data.totalQRs} QRs totales`);

    res.json({
      success: true,
      data: statsResult.data
    });

  } catch (error) {
    console.error('❌ Error en getStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Limpia todo el historial (para el admin)
 */
async function clearHistory(req, res) {
  try {
    console.log(`🧹 Iniciando limpieza completa del historial`);
    
    // Obtener todos los QRs primero
    const historyResult = await cloudinaryService.getQRHistory(ADMIN_SESSION, 1000); // Límite alto
    
    if (!historyResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial para limpiar'
      });
    }

    let deletedCount = 0;
    let errors = 0;

    // Eliminar cada QR
    for (const qr of historyResult.data) {
      try {
        const deleteResult = await cloudinaryService.deleteQR(qr.id);
        if (deleteResult.success) {
          deletedCount++;
        } else {
          errors++;
          console.warn(`⚠️  No se pudo eliminar QR ${qr.id}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error eliminando QR ${qr.id}:`, error.message);
      }
    }

    console.log(`✅ Limpieza completada: ${deletedCount} eliminados, ${errors} errores`);

    res.json({
      success: true,
      message: `Historial limpiado: ${deletedCount} QRs eliminados`,
      data: {
        deleted: deletedCount,
        errors: errors
      }
    });

  } catch (error) {
    console.error('❌ Error en clearHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Proxy para servir imágenes de Cloudinary
 */
async function getQRPreview(req, res) {
  try {
    // Obtener el path completo después de /preview/
    const qrId = req.params[0];
    
    if (!qrId) {
      return res.status(400).json({
        success: false,
        error: 'ID de QR requerido'
      });
    }

    console.log(`🖼️ Sirviendo preview del QR: ${qrId}`);
    
    // Construir URL de Cloudinary
    const cloudinaryUrl = `https://res.cloudinary.com/dawwlfvgl/image/upload/${qrId}`;
    
    console.log(`📡 Fetching desde: ${cloudinaryUrl}`);
    
    // Hacer fetch a Cloudinary
    const response = await fetch(cloudinaryUrl);
    
    if (!response.ok) {
      console.error(`❌ Error obteniendo imagen de Cloudinary: ${response.status}`);
      return res.status(404).json({ 
        success: false,
        error: 'Imagen no encontrada' 
      });
    }

    // Obtener el buffer de la imagen
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Configurar headers de respuesta
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      'Content-Length': imageBuffer.byteLength
    });

    console.log(`✅ Preview servido: ${qrId} (${contentType})`);
    
    // Enviar la imagen
    res.send(Buffer.from(imageBuffer));
    
  } catch (error) {
    console.error('❌ Error en proxy de imagen:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
}

module.exports = {
  generateQR,       // Nueva versión con Cloudinary
  generateQRDirect,   // Versión original sin Cloudinary
  getHistory,
  deleteQR,
  getStats,
  clearHistory,      // Nueva función para limpiar todo
  getQRPreview 
};
