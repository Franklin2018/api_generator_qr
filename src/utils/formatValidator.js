 
class FormatValidator {
  
  /**
   * Valida si el formato es soportado
   */
  isValidFormat(format) {
    const validFormats = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
    return validFormats.includes(format.toLowerCase());
  }
}

module.exports = new FormatValidator();