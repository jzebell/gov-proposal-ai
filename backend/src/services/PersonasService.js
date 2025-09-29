/**
 * Personas Service
 * Manages AI writing personas with personality profiles
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class PersonasService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'govai',
      user: process.env.DB_USER || 'govaiuser',
      password: process.env.DB_PASSWORD || 'devpass123'
    });
  }

  /**
   * Get all active personas
   */
  async getAllPersonas(activeOnly = true) {
    try {
      const query = activeOnly
        ? 'SELECT * FROM personas WHERE is_active = true ORDER BY is_default DESC, display_name ASC'
        : 'SELECT * FROM personas ORDER BY is_default DESC, display_name ASC';

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching personas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get persona by ID
   */
  async getPersonaById(id) {
    try {
      const result = await this.pool.query('SELECT * FROM personas WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching persona ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get persona by name
   */
  async getPersonaByName(name) {
    try {
      const result = await this.pool.query('SELECT * FROM personas WHERE name = $1', [name]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching persona ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get default persona
   */
  async getDefaultPersona() {
    try {
      const result = await this.pool.query('SELECT * FROM personas WHERE is_default = true AND is_active = true');
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching default persona: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new persona
   */
  async createPersona(personaData) {
    const {
      name,
      displayName,
      description,
      systemPrompt,
      expertiseAreas = [],
      yearsExperience = 20,
      personalityTraits = [],
      specialty,
      background,
      writingStyle = 'Professional',
      isActive = true,
      isDefault = false
    } = personaData;

    try {
      // If this persona is set as default, unset other defaults
      if (isDefault) {
        await this.pool.query('UPDATE personas SET is_default = false WHERE is_default = true');
      }

      const result = await this.pool.query(
        `INSERT INTO personas
         (name, display_name, description, system_prompt, expertise_areas, years_experience,
          personality_traits, specialty, background, writing_style, is_active, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [name, displayName, description, systemPrompt, JSON.stringify(expertiseAreas),
         yearsExperience, JSON.stringify(personalityTraits), specialty, background,
         writingStyle, isActive, isDefault]
      );

      logger.info(`Created persona: ${displayName}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating persona: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update persona
   */
  async updatePersona(id, personaData) {
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
    } = personaData;

    try {
      // If this persona is set as default, unset other defaults
      if (isDefault) {
        await this.pool.query('UPDATE personas SET is_default = false WHERE is_default = true AND id != $1', [id]);
      }

      const result = await this.pool.query(
        `UPDATE personas SET
         name = COALESCE($2, name),
         display_name = COALESCE($3, display_name),
         description = COALESCE($4, description),
         system_prompt = COALESCE($5, system_prompt),
         expertise_areas = COALESCE($6, expertise_areas),
         years_experience = COALESCE($7, years_experience),
         personality_traits = COALESCE($8, personality_traits),
         specialty = COALESCE($9, specialty),
         background = COALESCE($10, background),
         writing_style = COALESCE($11, writing_style),
         is_active = COALESCE($12, is_active),
         is_default = COALESCE($13, is_default),
         updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, name, displayName, description, systemPrompt,
         expertiseAreas ? JSON.stringify(expertiseAreas) : null,
         yearsExperience,
         personalityTraits ? JSON.stringify(personalityTraits) : null,
         specialty, background, writingStyle, isActive, isDefault]
      );

      if (result.rows.length === 0) {
        throw new Error('Persona not found');
      }

      logger.info(`Updated persona: ${result.rows[0].display_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating persona ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete persona
   */
  async deletePersona(id) {
    try {
      // Don't allow deletion of default persona
      const persona = await this.getPersonaById(id);
      if (!persona) {
        throw new Error('Persona not found');
      }

      if (persona.is_default) {
        throw new Error('Cannot delete default persona. Set another persona as default first.');
      }

      const result = await this.pool.query('DELETE FROM personas WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        throw new Error('Persona not found');
      }

      logger.info(`Deleted persona: ${result.rows[0].display_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting persona ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set default persona
   */
  async setDefaultPersona(id) {
    try {
      // Unset all defaults first
      await this.pool.query('UPDATE personas SET is_default = false WHERE is_default = true');

      // Set new default
      const result = await this.pool.query(
        'UPDATE personas SET is_default = true, updated_at = NOW() WHERE id = $1 AND is_active = true RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Persona not found or inactive');
      }

      logger.info(`Set default persona: ${result.rows[0].display_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error setting default persona ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get personas for dropdown (simplified data)
   */
  async getPersonasForDropdown() {
    try {
      const result = await this.pool.query(
        `SELECT id, name, display_name, description, specialty, writing_style, is_default
         FROM personas
         WHERE is_active = true
         ORDER BY is_default DESC, display_name ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching personas for dropdown: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PersonasService;