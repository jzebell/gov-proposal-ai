/**
 * Global Settings Service
 * Manages application-wide configuration settings
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class GlobalSettingsService {
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
   * Get all settings by category
   */
  async getSettingsByCategory(category = null, publicOnly = false) {
    try {
      let query = 'SELECT * FROM global_settings';
      const params = [];
      const conditions = [];

      if (category) {
        conditions.push('category = $' + (params.length + 1));
        params.push(category);
      }

      if (publicOnly) {
        conditions.push('is_public = true');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY category, setting_key';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific setting by key
   */
  async getSetting(settingKey) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM global_settings WHERE setting_key = $1',
        [settingKey]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching setting ${settingKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get setting value (parsed according to type)
   */
  async getSettingValue(settingKey, defaultValue = null) {
    try {
      const setting = await this.getSetting(settingKey);
      if (!setting) {
        return defaultValue;
      }

      return this.parseSettingValue(setting.setting_value, setting.setting_type);
    } catch (error) {
      logger.error(`Error getting setting value ${settingKey}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(settingKey, value, settingType = 'string', description = null, category = 'general', isPublic = false) {
    try {
      const stringValue = this.stringifySettingValue(value, settingType);

      const result = await this.pool.query(
        `INSERT INTO global_settings (setting_key, setting_value, setting_type, description, category, is_public)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (setting_key)
         DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           setting_type = EXCLUDED.setting_type,
           description = COALESCE(EXCLUDED.description, global_settings.description),
           category = COALESCE(EXCLUDED.category, global_settings.category),
           is_public = EXCLUDED.is_public,
           updated_at = NOW()
         RETURNING *`,
        [settingKey, stringValue, settingType, description, category, isPublic]
      );

      logger.info(`Updated setting: ${settingKey} = ${stringValue}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error setting ${settingKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(settingKey) {
    try {
      const result = await this.pool.query(
        'DELETE FROM global_settings WHERE setting_key = $1 RETURNING *',
        [settingKey]
      );

      if (result.rows.length === 0) {
        throw new Error('Setting not found');
      }

      logger.info(`Deleted setting: ${settingKey}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting setting ${settingKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse setting value based on type
   */
  parseSettingValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'boolean':
        return value === 'true' || value === true;
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Convert value to string for storage
   */
  stringifySettingValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'boolean':
        return String(Boolean(value));
      case 'number':
        return String(Number(value));
      case 'json':
        return JSON.stringify(value);
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Get default persona ID
   */
  async getDefaultPersonaId() {
    return await this.getSettingValue('default_persona_id', null);
  }

  /**
   * Set default persona ID
   */
  async setDefaultPersonaId(personaId) {
    return await this.setSetting(
      'default_persona_id',
      personaId,
      'string',
      'Default persona for AI writing when none is selected',
      'ai',
      false
    );
  }
}

module.exports = GlobalSettingsService;