 
const Joi = require('joi');

const qrGenerateSchema = Joi.object({
  text: Joi.string()
    .required()
    .min(1)
    .max(2000)
    .messages({
      'string.empty': 'El texto no puede estar vacío',
      'string.max': 'El texto no debe superar 2000 caracteres',
      'any.required': 'El texto es requerido'
    }),
    
  size: Joi.number()
    .integer()
    .min(100)
    .max(1000)
    .default(300)
    .messages({
      'number.min': 'El tamaño mínimo es 100px',
      'number.max': 'El tamaño máximo es 1000px',
      'number.integer': 'El tamaño debe ser un número entero'
    }),
    

  logoSize: Joi.number()
    .min(0.1)
    .max(0.3)
    .default(0.2)
    .messages({
      'number.min': 'El tamaño del logo mínimo es 0.1 (10%)',
      'number.max': 'El tamaño del logo máximo es 0.3 (40%)'
    }),

     // NUEVOS CAMPOS
  logoPaddingWidth: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .default(15)
    .messages({
      'number.min': 'El padding horizontal mínimo es 0px',
      'number.max': 'El padding horizontal máximo es 50px',
      'number.integer': 'El padding horizontal debe ser un número entero'
    }),

  logoPaddingHeight: Joi.number()
    .integer() 
    .min(0)
    .max(50)
    .default(15)
    .messages({
      'number.min': 'El padding vertical mínimo es 0px',
      'number.max': 'El padding vertical máximo es 50px', 
      'number.integer': 'El padding vertical debe ser un número entero'
    }),

  format: Joi.string()
    .valid('png', 'jpg', 'jpeg', 'webp', 'svg')
    .default('png')
    .messages({
      'any.only': 'Formato debe ser: png, jpg, jpeg, webp, svg'
    }),

  quality: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(90)
    .messages({
      'number.min': 'La calidad mínima es 1',
      'number.max': 'La calidad máxima es 100'
    })
});

const validateQrGenerate = (req, res, next) => {
  const { error, value } = qrGenerateSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }

  req.validatedData = value;
  next();
};

module.exports = {
  validateQrGenerate
};