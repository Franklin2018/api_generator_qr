 
const sharp = require('sharp');
const fs = require('fs').promises;

class ImageProcessor {

  /**
   * Procesa y redimensiona el logo
   */
  async processLogo(logoPath, targetSize) {
    try {
      const logoBuffer = await sharp(logoPath)
        .resize(targetSize, targetSize, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .png()
        .toBuffer();

      return logoBuffer;
    } catch (error) {
      throw new Error(`Error procesando logo: ${error.message}`);
    }
  }

  
  /**
 * Combina QR con logo para formatos raster (PNG, JPG, WEBP)
 */
async combineQrWithLogo(qrBuffer, logoPath, options = {}) {
  try {
    const qrSize = options.size || 300;
    const logoSizePercent = options.logoSize || 0.2;
    const logoSize = Math.round(qrSize * logoSizePercent);
    
    // Padding configurable
    const paddingWidth = options.logoPaddingWidth || 15;
    const paddingHeight = options.logoPaddingHeight || 15;
    const clearAreaWidth = logoSize + (paddingWidth * 2);
    const clearAreaHeight = logoSize + (paddingHeight * 2);

    // Procesar logo
    const logoBuffer = await this.processLogo(logoPath, logoSize);

    // Crear área limpia rectangular blanca
    const clearArea = await sharp({
      create: {
        width: clearAreaWidth,
        height: clearAreaHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();

    // Combinar: QR + área limpia + logo
    const combinedBuffer = await sharp(qrBuffer)
      .composite([
        {
          input: clearArea,
          gravity: 'center'
        },
        {
          input: logoBuffer,
          gravity: 'center'
        }
      ])
      .toBuffer();

    return combinedBuffer;
  } catch (error) {
    throw new Error(`Error combinando QR con logo: ${error.message}`);
  }
}

  /**
 * Inserta logo en SVG como imagen embebida
 */
async insertLogoInSVG(svgString, logoPath, options = {}) {
  try {
    const qrSize = options.size || 300;
    const logoSizePercent = options.logoSize || 0.2;
    const logoSize = Math.round(qrSize * logoSizePercent);
    
    // Padding configurable
    const paddingWidth = options.logoPaddingWidth || 15;
    const paddingHeight = options.logoPaddingHeight || 15;
    const clearAreaWidth = logoSize + (paddingWidth * 2);
    const clearAreaHeight = logoSize + (paddingHeight * 2);

    // Convertir logo a base64
    const logoBuffer = await fs.readFile(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoMime = this.getMimeType(logoPath);

    // Calcular posiciones centradas
    const clearAreaX = (qrSize - clearAreaWidth) / 2;
    const clearAreaY = (qrSize - clearAreaHeight) / 2;
    const logoX = (qrSize - logoSize) / 2;
    const logoY = (qrSize - logoSize) / 2;

    // Crear elementos
    const clearAreaElement = `<rect x="${clearAreaX}" y="${clearAreaY}" width="${clearAreaWidth}" height="${clearAreaHeight}" fill="white"/>`;
    const logoElement = `<image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="data:${logoMime};base64,${logoBase64}"/>`;

    // Insertar en SVG
    const modifiedSVG = svgString.replace('</svg>', `  ${clearAreaElement}\n  ${logoElement}\n</svg>`);

    return modifiedSVG;
  } catch (error) {
    throw new Error(`Error insertando logo en SVG: ${error.message}`);
  }
}
  /**
   * Obtiene el tipo MIME basado en la extensión del archivo
   */
  getMimeType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Convierte buffer a formato específico
   */
  async convertToFormat(buffer, format, quality = 90) {
    try {
      let sharpInstance = sharp(buffer);

      switch (format.toLowerCase()) {
        case 'png':
          return await sharpInstance.png().toBuffer();
        case 'jpg':
        case 'jpeg':
          return await sharpInstance.jpeg({ quality }).toBuffer();
        case 'webp':
          return await sharpInstance.webp({ quality }).toBuffer();
        default:
          return buffer;
      }
    } catch (error) {
      throw new Error(`Error convirtiendo a formato ${format}: ${error.message}`);
    }
  }

  /**
   * Limpia archivos temporales
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // No hacer nada si el archivo no existe
      console.warn(`No se pudo eliminar archivo temporal: ${filePath}`);
    }
  }
}

module.exports = new ImageProcessor();
