 
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

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

    // ==================== NUEVAS FUNCIONES PARA CLOUDINARY ====================

  /**
   * Genera un nombre único para archivos (versión alternativa más corta)
   * @param {string} prefix - Prefijo del archivo
   * @param {string} extension - Extensión del archivo
   * @returns {string} - Nombre único
   */
  generateUniqueFileName(prefix = 'qr', extension = 'png') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Genera un ID simple para identificar archivos temporales
   * @returns {string} - ID único
   */
  generateSessionId() {
    return crypto.randomBytes(8).toString('hex'); // 16 caracteres hex
  }

  /**
   * Crea directorios si no existen
   * @param {string} dirPath - Ruta del directorio
   */
  static async ensureDir(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Directorio creado: ${dirPath}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Valida si un archivo existe
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - True si existe
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Object} - Información del archivo
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Error obteniendo información del archivo: ${error.message}`);
    }
  }

  /**
   * Convierte bytes a formato legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} - Tamaño formateado
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Limpia archivos temporales antiguos
   * @param {string} dirPath - Directorio a limpiar
   * @param {number} maxAgeMs - Edad máxima en milisegundos (24 horas por defecto)
   */
  static async cleanupOldFiles(dirPath, maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      // Verificar si el directorio existe
      if (!(await FileHelper.fileExists(dirPath))) {
        console.log(`📁 Directorio no existe: ${dirPath}`);
        return;
      }

      const files = await fs.readdir(dirPath);
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`🧹 Archivo temporal eliminado: ${file}`);
          }
        } catch (fileError) {
          console.warn(`⚠️  No se pudo procesar archivo ${file}:`, fileError.message);
        }
      }

      if (cleanedCount > 0) {
        console.log(`✅ Limpieza completada: ${cleanedCount} archivos eliminados de ${dirPath}`);
      }
    } catch (error) {
      console.error('❌ Error limpiando archivos temporales:', error.message);
    }
  }

  /**
   * Programa limpieza automática de archivos temporales
   * @param {string} dirPath - Directorio a limpiar
   * @param {number} intervalMs - Intervalo de limpieza en milisegundos (1 hora por defecto)
   * @param {number} maxAgeMs - Edad máxima de archivos (24 horas por defecto)
   */
  static scheduleCleanup(dirPath, intervalMs = 60 * 60 * 1000, maxAgeMs = 24 * 60 * 60 * 1000) {
    // Ejecutar limpieza inicial
    FileHelper.cleanupOldFiles(dirPath, maxAgeMs);
    
    // Programar limpiezas periódicas
    setInterval(async () => {
      await FileHelper.cleanupOldFiles(dirPath, maxAgeMs);
    }, intervalMs);
    
    const intervalMinutes = Math.round(intervalMs / 1000 / 60);
    const maxAgeHours = Math.round(maxAgeMs / 1000 / 60 / 60);
    
    console.log(`⏰ Limpieza automática programada:`);
    console.log(`   📂 Directorio: ${dirPath}`);
    console.log(`   🔄 Intervalo: cada ${intervalMinutes} minutos`);
    console.log(`   ⏱️  Edad máxima: ${maxAgeHours} horas`);
  }

  /**
   * Valida el formato de archivo
   * @param {string} format - Formato a validar
   * @param {Array} allowedFormats - Formatos permitidos
   * @returns {boolean} - True si es válido
   */
  static isValidFormat(format, allowedFormats = ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    return allowedFormats.includes(format.toLowerCase());
  }

  /**
   * Obtiene la extensión de un archivo
   * @param {string} filename - Nombre del archivo
   * @returns {string} - Extensión sin el punto
   */
  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase().substring(1);
  }

  /**
   * Genera una ruta de archivo temporal
   * @param {string} filename - Nombre del archivo
   * @param {string} tempDir - Directorio temporal (uploads por defecto)
   * @returns {string} - Ruta completa
   */
  static getTempFilePath(filename, tempDir = 'uploads') {
    return path.join(process.cwd(), tempDir, filename);
  }

  // ==================== FUNCIONES DE CONVENIENCIA ====================

  /**
   * Wrapper para ensureDir como método de instancia
   */
  async ensureDir(dirPath) {
    return FileHelper.ensureDir(dirPath);
  }

  /**
   * Wrapper para fileExists como método de instancia
   */
  async fileExists(filePath) {
    return FileHelper.fileExists(filePath);
  }

  /**
   * Wrapper para formatFileSize como método de instancia
   */
  formatFileSize(bytes) {
    return FileHelper.formatFileSize(bytes);
  }
}

// Crear instancia única
const fileHelper = new FileHelper();

// Exportar tanto la clase como funciones de conveniencia
module.exports = fileHelper;

// También exportar funciones estáticas directamente para compatibilidad
module.exports.FileHelper = FileHelper;
module.exports.ensureDir = FileHelper.ensureDir;
module.exports.cleanupOldFiles = FileHelper.cleanupOldFiles;
module.exports.scheduleCleanup = FileHelper.scheduleCleanup;
module.exports.fileExists = FileHelper.fileExists;
module.exports.getFileInfo = FileHelper.getFileInfo;
module.exports.formatFileSize = FileHelper.formatFileSize;
module.exports.generateSessionId = () => fileHelper.generateSessionId();
