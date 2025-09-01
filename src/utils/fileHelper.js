 
const path = require('path');

class FileHelper {
  
  /**
   * Genera nombre de archivo único
   */
  generateFileName(format) {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\./g, '')
      .replace('T', '_')
      .slice(0, 15); // YYYYMMDD_HHMMSS
    
    return `qr_${timestamp}.${format}`;
  }

  /**
   * Obtiene Content-Type para la respuesta HTTP
   */
  getContentType(format) {
    const contentTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg', 
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return contentTypes[format.toLowerCase()] || 'image/png';
  }
}

module.exports = new FileHelper();