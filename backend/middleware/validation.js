const Joi = require('joi');

// A due date before the start date makes no sense on a task.
const dueAfterStart = (value, helpers) =>
  value < helpers.state.ancestors[0].start_date ? helpers.message('The due date cannot be before the start date') : value;

const day = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .required()
  .messages({ 'string.pattern.base': 'Dates must look like 2026-11-20', 'any.required': 'Pick a start and a due date' });

const taskFields = {
  title: Joi.string().trim().min(1).max(200).required().messages({ 'string.empty': 'Give the task a title' }),
  description: Joi.string().max(2000).allow('', null),
  start_date: day,
  end_date: day.custom(dueAfterStart),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH').default('NORMAL')
};

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
    password: Joi.string().min(6).max(100).required(),
    interests: Joi.array().items(Joi.number().integer().positive()).max(8).unique().default([])
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
    post_type: Joi.string().valid('standard', 'room').default('standard'),
    image: Joi.string().allow(null, ''),
    tags: Joi.array().items(Joi.number().integer().positive()).max(3).unique().default([])
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

  createTask: Joi.object(taskFields),

  updateTask: Joi.object({
    ...taskFields,
    status: Joi.string().valid('PENDING', 'DONE').required()
  }),

  toggleTask: Joi.object({
    status: Joi.string().valid('PENDING', 'DONE').required()
  }),

  setInterests: Joi.object({
    tags: Joi.array().items(Joi.number().integer().positive()).max(8).unique().required()
  }),

  // Room schemas
  createRoom: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    postId: Joi.number().integer().positive().required()
  }),
};

// Validation middleware
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

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

module.exports = { validate, validateId };
