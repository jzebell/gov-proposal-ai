/**
 * Personas API Routes
 * CRUD operations for AI writing personas
 */

const express = require('express');
const PersonasService = require('../services/PersonasService');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const personasService = new PersonasService();

/**
 * @route GET /api/personas
 * @desc Get all personas (active only by default)
 * @access Admin
 */
router.get('/', asyncHandler(async (req, res) => {
  const { includeInactive } = req.query;
  const activeOnly = includeInactive !== 'true';

  const personas = await personasService.getAllPersonas(activeOnly);

  res.json({
    success: true,
    data: personas
  });
}));

/**
 * @route GET /api/personas/dropdown
 * @desc Get simplified persona list for UI dropdown
 * @access Public (for AI writing interface)
 */
router.get('/dropdown', asyncHandler(async (req, res) => {
  const personas = await personasService.getPersonasForDropdown();

  res.json({
    success: true,
    data: personas
  });
}));

/**
 * @route GET /api/personas/default
 * @desc Get the default persona
 * @access Public
 */
router.get('/default', asyncHandler(async (req, res) => {
  const persona = await personasService.getDefaultPersona();

  if (!persona) {
    return res.status(404).json({
      success: false,
      message: 'No default persona found'
    });
  }

  res.json({
    success: true,
    data: persona
  });
}));

/**
 * @route GET /api/personas/:id
 * @desc Get persona by ID
 * @access Admin
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const persona = await personasService.getPersonaById(id);

  if (!persona) {
    return res.status(404).json({
      success: false,
      message: 'Persona not found'
    });
  }

  res.json({
    success: true,
    data: persona
  });
}));

/**
 * @route POST /api/personas
 * @desc Create new persona
 * @access Admin
 */
router.post('/', sanitizeInput, asyncHandler(async (req, res) => {
  const {
    name,
    displayName,
    description,
    systemPrompt,
    expertiseAreas,
    yearsExperience,
    personalityTraits,
    specialty,
    background,
    writingStyle,
    isActive,
    isDefault
  } = req.body;

  // Validation
  if (!name || !displayName || !description || !systemPrompt) {
    return res.status(400).json({
      success: false,
      message: 'Name, display name, description, and system prompt are required'
    });
  }

  const persona = await personasService.createPersona({
    name,
    displayName,
    description,
    systemPrompt,
    expertiseAreas,
    yearsExperience,
    personalityTraits,
    specialty,
    background,
    writingStyle,
    isActive,
    isDefault
  });

  res.status(201).json({
    success: true,
    data: persona,
    message: 'Persona created successfully'
  });
}));

/**
 * @route PUT /api/personas/:id
 * @desc Update persona
 * @access Admin
 */
router.put('/:id', sanitizeInput, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const persona = await personasService.updatePersona(id, updateData);

  res.json({
    success: true,
    data: persona,
    message: 'Persona updated successfully'
  });
}));

/**
 * @route DELETE /api/personas/:id
 * @desc Delete persona
 * @access Admin
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const persona = await personasService.deletePersona(id);

  res.json({
    success: true,
    data: persona,
    message: 'Persona deleted successfully'
  });
}));

/**
 * @route PUT /api/personas/:id/default
 * @desc Set persona as default
 * @access Admin
 */
router.put('/:id/default', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const persona = await personasService.setDefaultPersona(id);

  res.json({
    success: true,
    data: persona,
    message: 'Default persona updated successfully'
  });
}));

/**
 * @route POST /api/personas/validate-name
 * @desc Check if persona name is available
 * @access Admin
 */
router.post('/validate-name', sanitizeInput, asyncHandler(async (req, res) => {
  const { name, excludeId } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Name is required'
    });
  }

  try {
    const existingPersona = await personasService.getPersonaByName(name);
    const isAvailable = !existingPersona || (excludeId && existingPersona.id === excludeId);

    res.json({
      success: true,
      data: {
        name,
        available: isAvailable,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      }
    });
  } catch (error) {
    // If persona not found, name is available
    res.json({
      success: true,
      data: {
        name,
        available: true,
        message: 'Name is available'
      }
    });
  }
}));

module.exports = router;