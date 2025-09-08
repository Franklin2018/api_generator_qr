const cloudinary = require('../config/cloudinary');
const path = require('path');

class CloudinaryService {
  /**
   * Sube un archivo QR a Cloudinary
   * @param {string} filePath - Ruta local del archivo
   * @param {Object} metadata - Metadata del QR (texto, formato, etc.)
   * @returns {Object} - Información del archivo subido
   */
  async uploadQR(filePath, metadata = {}) {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));
      const folder = `qr-generator/${new Date().toISOString().split('T')[0]}`;
      
      const uploadOptions = {
        folder: folder,
        public_id: `${fileName}_${Date.now()}`,
        resource_type: 'image',
        context: {
          qr_text: metadata.text || '',
          format: metadata.format || '',
          has_logo: metadata.hasLogo || false,
          generated_at: new Date().toISOString(),
          user_session: metadata.userSession || 'anonymous'
        },
        tags: ['qr-code', 'generated', metadata.format || 'png']
      };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        success: true,
        data: {
          id: result.public_id,
          url: result.secure_url,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
          createdAt: result.created_at,
          metadata: result.context
        }
      };
    } catch (error) {
      console.error('Error subiendo a Cloudinary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene el historial de QRs de un usuario/sesión
   * @param {string} userSession - ID de sesión del usuario
   * @param {number} limit - Límite de resultados
   * @returns {Array} - Lista de QRs generados
   */
  async getQRHistory(userSession = 'anonymous', limit = 20) {
    try {
      const searchQuery = `context.user_session="${userSession}" AND tags:qr-code`;
      
      const result = await cloudinary.search
        .expression(searchQuery)
        .sort_by([['created_at', 'desc']])
        .max_results(limit)
        .with_field('context')
        .execute();

      return {
        success: true,
        data: result.resources.map(resource => ({
          id: resource.public_id,
          url: resource.secure_url,
          format: resource.format,
          size: resource.bytes,
          width: resource.width,
          height: resource.height,
          createdAt: resource.created_at,
          metadata: resource.context || {}
        })),
        total: result.total_count
      };
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Elimina un QR de Cloudinary
   * @param {string} publicId - ID público del archivo
   * @returns {Object} - Resultado de la eliminación
   */
  async deleteQR(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      return {
        success: result.result === 'ok',
        message: result.result === 'ok' ? 'QR eliminado correctamente' : 'Error al eliminar QR'
      };
    } catch (error) {
      console.error('Error eliminando QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene estadísticas de uso
   * @param {string} userSession - ID de sesión del usuario
   * @returns {Object} - Estadísticas
   */
  async getStats(userSession = 'anonymous') {
    try {
      const searchQuery = `context.user_session="${userSession}" AND tags:qr-code`;
      
      const result = await cloudinary.search
        .expression(searchQuery)
        .aggregate('format')
        .with_field('context')
        .execute();

      const totalQRs = result.total_count || 0;
      const formatStats = result.aggregations?.format || [];

      // Obtener QRs de los últimos 7 días
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const recentQuery = `${searchQuery} AND created_at>="${lastWeek.toISOString().split('T')[0]}"`;
      const recentResult = await cloudinary.search
        .expression(recentQuery)
        .max_results(1)
        .execute();

      return {
        success: true,
        data: {
          totalQRs,
          recentQRs: recentResult.total_count || 0,
          formatBreakdown: formatStats,
          lastGenerated: totalQRs > 0 ? result.resources?.[0]?.created_at : null
        }
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CloudinaryService();
