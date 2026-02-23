const Joi = require('joi');

// Validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    username: Joi.string()
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, dots and hyphens'
      }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Post schemas
  createPost: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'CLOSED').default('OPEN'),
    image: Joi.string().allow(null, '')
  }),

  updatePost: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().min(10).max(5000),
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'CLOSED')
  }).min(1),

  // Comment schema
  addComment: Joi.object({
    content: Joi.string().min(1).max(1000).required()
  }),

  // Room schemas
  createRoom: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    postId: Joi.number().integer().positive().required()
  }),

  // Message schemas
  sendMessage: Joi.object({
    content: Joi.string().min(1).max(2000).when('file', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    file: Joi.any().optional()
  }),

  // Friend request schema
  sendFriendRequest: Joi.object({
    receiverId: Joi.number().integer().positive().required()
  }),

  // Rating schema
  rateUser: Joi.object({
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).allow('', null)
  }),

  // Task schemas
  createTask: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).allow('', null),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
    deadline: Joi.date().iso().allow(null)
  }),

  updateTask: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
    deadline: Joi.date().iso().allow(null)
  }).min(1),

  // Tag schema
  createTag: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null)
  }),

  // Profile update schema
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    currentPassword: Joi.string().min(6),
    newPassword: Joi.string().min(6),
    profile_picture: Joi.string().allow(null, '')
  }).min(1)
};

// Validation middleware
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    console.log(`[Validation] Schema: ${schemaName}, Body:`, req.body);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      console.log(`[Validation] Failed for ${schemaName}:`, errors);
      
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

// Query parameter validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Query validation failed',
        details: errors
      });
    }

    req.query = value;
    next();
  };
};

// ID parameter validation
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = parseInt(req.params[paramName]);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'Invalid ID',
        details: `${paramName} must be a positive integer`
      });
    }

    req.params[paramName] = id;
    next();
  };
};

module.exports = { validate, validateQuery, validateId, schemas };
