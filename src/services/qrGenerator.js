const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

class QRGeneratorService {
  
  /**
   * Genera QR en formato SVG
   */
  async generateSVG(text, options = {}) {
  try {
    const qrOptions = {
      type: 'svg',
      width: options.size || 300,
      margin: 2,
      errorCorrectionLevel: 'H', // Alto nivel de corrección (30%)
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const svgString = await QRCode.toString(text, qrOptions);
    return svgString;
  } catch (error) {
    throw new Error(`Error generando QR SVG: ${error.message}`);
  }
}
  /**
   * Genera QR en formato buffer (PNG, JPG, WEBP)
   */
  async generateBuffer(text, format, options = {}) {
  try {
    const qrOptions = {
      type: 'png',
      width: options.size || 300,
      margin: 2,
      errorCorrectionLevel: 'H', // Alto nivel de corrección (30%)
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const buffer = await QRCode.toBuffer(text, qrOptions);
    return buffer;
  } catch (error) {
    throw new Error(`Error generando QR buffer: ${error.message}`);
  }
}
  
  /**
   * Guarda el archivo generado en el servidor
   */
  async saveToServer(data, filename, isBuffer = true) {
    try {
      // Crear directorio por fecha
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const saveDir = path.join(process.env.GENERATED_PATH || './generated', today);
      
      // Crear directorio si no existe
      await fs.mkdir(saveDir, { recursive: true });
      
      const fullPath = path.join(saveDir, filename);
      
      if (isBuffer) {
        await fs.writeFile(fullPath, data);
      } else {
        await fs.writeFile(fullPath, data, 'utf8');
      }
      
      return fullPath;
    } catch (error) {
      throw new Error(`Error guardando archivo: ${error.message}`);
    }
  }
}

module.exports = new QRGeneratorService();
