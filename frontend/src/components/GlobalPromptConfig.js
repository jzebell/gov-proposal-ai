import React, { useState, useEffect } from 'react';
import DraggableList from './DraggableList';
import { API_ENDPOINTS } from '../config/api';

const GlobalPromptConfig = ({ theme }) => {
  const [config, setConfig] = useState({
    basePrompt: '',
    rules: [],
    variables: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showAddVariableModal, setShowAddVariableModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [compiledPrompt, setCompiledPrompt] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingVariable, setEditingVariable] = useState(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.GLOBAL_PROMPTS, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setConfig({
          basePrompt: result.data.basePrompt || '',
          rules: result.data.rules || [],
          variables: result.data.variables || []
        });
      } else {
        setError('Failed to load global prompt configuration');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError('Network error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.GLOBAL_PROMPTS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setSuccess('Configuration saved successfully!');
        setHasChanges(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorResult = await response.json();
        setError(errorResult.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Network error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const previewPrompt = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.GLOBAL_PROMPTS}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        const result = await response.json();
        setCompiledPrompt(result.data.compiledPrompt);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error previewing prompt:', error);
      setError('Failed to preview prompt');
    }
  };

  const loadDefaults = async () => {
    if (!window.confirm('This will replace your current configuration with defaults. Continue?')) {
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.GLOBAL_PROMPTS}/defaults`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(result.data);
        setHasChanges(true);
        setSuccess('Defaults loaded - remember to save!');
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
      setError('Failed to load defaults');
    }
  };

  const updateBasePrompt = (value) => {
    setConfig(prev => ({ ...prev, basePrompt: value }));
    setHasChanges(true);
  };

  const toggleRule = (ruleId) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    }));
    setHasChanges(true);
  };

  const deleteRule = (ruleId) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
    setHasChanges(true);
  };

  const reorderRules = (newRules) => {
    setConfig(prev => ({
      ...prev,
      rules: newRules.map((rule, index) => ({ ...rule, order: index + 1 }))
    }));
    setHasChanges(true);
  };

  const addRule = (newRule) => {
    const rule = {
      ...newRule,
      id: `rule-${Date.now()}`,
      enabled: true,
      order: config.rules.length + 1
    };
    setConfig(prev => ({
      ...prev,
      rules: [...prev.rules, rule]
    }));
    setHasChanges(true);
    setShowAddRuleModal(false);
  };

  const updateRule = (updatedRule) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(rule =>
        rule.id === updatedRule.id ? updatedRule : rule
      )
    }));
    setHasChanges(true);
    setEditingRule(null);
  };

  const addVariable = (newVariable) => {
    const variable = {
      ...newVariable,
      system: false
    };
    setConfig(prev => ({
      ...prev,
      variables: [...prev.variables, variable]
    }));
    setHasChanges(true);
    setShowAddVariableModal(false);
  };

  const deleteVariable = (variableKey) => {
    setConfig(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.key !== variableKey)
    }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        color: theme.textSecondary
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: `3px solid ${theme.border}`,
          borderTop: `3px solid ${theme.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ marginLeft: '12px' }}>Loading configuration...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ margin: 0, color: theme.text, fontSize: '24px' }}>
            AI Writing Standards
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            color: theme.textSecondary,
            fontSize: '14px'
          }}>
            Configure global prompt standards for all creative AI writing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadDefaults}
            style={{
              padding: '10px 20px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Load Defaults
          </button>
          <button
            onClick={previewPrompt}
            style={{
              padding: '10px 20px',
              border: `1px solid ${theme.primary}`,
              backgroundColor: 'transparent',
              color: theme.primary,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Preview Compiled
          </button>
          <button
            onClick={saveConfiguration}
            disabled={!hasChanges || saving}
            style={{
              padding: '10px 20px',
              backgroundColor: hasChanges ? theme.primary : theme.border,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff9999',
          color: '#d63384',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e6ffe6',
          border: '1px solid #99ff99',
          color: '#2d6e2d',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {/* Base Prompt Section */}
      <div style={{
        backgroundColor: theme.surface,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          color: theme.text,
          fontSize: '18px'
        }}>
          Base Writing Standards
        </h3>
        <p style={{
          margin: '0 0 16px 0',
          color: theme.textSecondary,
          fontSize: '14px'
        }}>
          This prompt is prepended to all creative AI writing tasks. Define your organization's voice, tone, and standards.
        </p>
        <textarea
          value={config.basePrompt}
          onChange={(e) => updateBasePrompt(e.target.value)}
          placeholder="Example: Write in a professional, clear, and concise manner suitable for government proposals..."
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            backgroundColor: theme.background,
            color: theme.text,
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: theme.textSecondary,
          textAlign: 'right'
        }}>
          {config.basePrompt.length} / 2000 characters
        </div>
      </div>

      {/* Writing Rules Section */}
      <div style={{
        backgroundColor: theme.surface,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: theme.text, fontSize: '18px' }}>
            Writing Rules ({config.rules.filter(r => r.enabled).length}/{config.rules.length} active)
          </h3>
          <button
            onClick={() => setShowAddRuleModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Add Rule
          </button>
        </div>

        {config.rules.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: theme.textSecondary
          }}>
            <p>No rules configured yet.</p>
            <p style={{ fontSize: '14px' }}>Add rules to enforce specific writing standards.</p>
          </div>
        ) : (
          <DraggableList
            items={config.rules}
            onReorder={reorderRules}
            theme={theme}
            showArrows={false}
            renderItem={(rule) => (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%'
              }}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      backgroundColor: getRuleTypeColor(rule.type, theme),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {rule.type}
                    </span>
                    <span style={{
                      color: rule.enabled ? theme.text : theme.textSecondary,
                      fontSize: '14px',
                      textDecoration: rule.enabled ? 'none' : 'line-through'
                    }}>
                      {rule.rule}
                    </span>
                  </div>
                  {rule.type === 'forbidden' && rule.words && rule.words.length > 0 && (
                    <div style={{
                      fontSize: '12px',
                      color: theme.textSecondary,
                      marginLeft: '26px'
                    }}>
                      Words: {rule.words.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingRule(rule)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #dc3545',
                      color: '#dc3545',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Variables Section */}
      <div style={{
        backgroundColor: theme.surface,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: theme.text, fontSize: '18px' }}>
            Dynamic Variables
          </h3>
          <button
            onClick={() => setShowAddVariableModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Add Variable
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            margin: '0 0 12px 0',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            System Variables (Built-in)
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {config.variables.filter(v => v.system).map((variable) => (
              <div
                key={variable.key}
                style={{
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <code style={{ color: theme.primary }}>{variable.key}</code>
                <span style={{
                  color: theme.textSecondary,
                  marginLeft: '8px'
                }}>
                  {variable.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Custom Variables
          </h4>
          {config.variables.filter(v => !v.system).length === 0 ? (
            <p style={{
              color: theme.textSecondary,
              fontSize: '14px'
            }}>
              No custom variables defined yet.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {config.variables.filter(v => !v.system).map((variable) => (
                <div
                  key={variable.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: theme.background,
                    border: `1px solid ${theme.border}`,
                    padding: '12px',
                    borderRadius: '6px',
                    gap: '12px'
                  }}
                >
                  <code style={{
                    color: theme.primary,
                    fontSize: '14px'
                  }}>
                    {variable.key}
                  </code>
                  <span style={{
                    flex: 1,
                    color: theme.textSecondary,
                    fontSize: '13px'
                  }}>
                    {variable.description}
                  </span>
                  {variable.default && (
                    <span style={{
                      color: theme.textSecondary,
                      fontSize: '12px'
                    }}>
                      Default: "{variable.default}"
                    </span>
                  )}
                  <button
                    onClick={() => deleteVariable(variable.key)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #dc3545',
                      color: '#dc3545',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {(showAddRuleModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          theme={theme}
          onSave={editingRule ? updateRule : addRule}
          onClose={() => {
            setShowAddRuleModal(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* Add Variable Modal */}
      {showAddVariableModal && (
        <VariableModal
          theme={theme}
          onSave={addVariable}
          onClose={() => setShowAddVariableModal(false)}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <PreviewModal
          compiledPrompt={compiledPrompt}
          theme={theme}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
};

// Rule Modal Component
const RuleModal = ({ rule, theme, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    type: rule?.type || 'style',
    rule: rule?.rule || '',
    words: rule?.words?.join(', ') || ''
  });

  const handleSave = () => {
    const data = {
      ...formData,
      words: formData.type === 'forbidden' && formData.words
        ? formData.words.split(',').map(w => w.trim()).filter(w => w)
        : []
    };
    if (rule) {
      onSave({ ...rule, ...data });
    } else {
      onSave(data);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.background,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        padding: '24px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: theme.text
        }}>
          {rule ? 'Edit Rule' : 'Add New Rule'}
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Rule Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text
            }}
          >
            <option value="style">Style</option>
            <option value="formatting">Formatting</option>
            <option value="forbidden">Forbidden Words</option>
            <option value="compliance">Compliance</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Rule Text
          </label>
          <textarea
            value={formData.rule}
            onChange={(e) => setFormData(prev => ({ ...prev, rule: e.target.value }))}
            placeholder="e.g., Use active voice exclusively"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text,
              resize: 'vertical'
            }}
          />
        </div>

        {formData.type === 'forbidden' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: theme.text,
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Forbidden Words (comma-separated)
            </label>
            <input
              type="text"
              value={formData.words}
              onChange={(e) => setFormData(prev => ({ ...prev, words: e.target.value }))}
              placeholder="e.g., leverage, utilize, synergize"
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.rule.trim()}
            style={{
              padding: '8px 20px',
              backgroundColor: formData.rule.trim() ? theme.primary : theme.border,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: formData.rule.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            {rule ? 'Update' : 'Add'} Rule
          </button>
        </div>
      </div>
    </div>
  );
};

// Variable Modal Component
const VariableModal = ({ theme, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    key: '',
    description: '',
    default: '',
    source: 'custom'
  });

  const handleSave = () => {
    // Ensure key is in correct format
    let key = formData.key.toUpperCase().replace(/[^A-Z_]/g, '_');
    if (!key.startsWith('{{')) key = '{{' + key;
    if (!key.endsWith('}}')) key = key + '}}';

    onSave({
      ...formData,
      key
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.background,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        padding: '24px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: theme.text
        }}>
          Add Custom Variable
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Variable Name
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
            placeholder="e.g., WIN_THEMES or {{WIN_THEMES}}"
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text,
              fontFamily: 'monospace'
            }}
          />
          <small style={{
            color: theme.textSecondary,
            fontSize: '12px'
          }}>
            Will be formatted as {{VARIABLE_NAME}}
          </small>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Key win themes for this proposal"
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Default Value (Optional)
          </label>
          <input
            type="text"
            value={formData.default}
            onChange={(e) => setFormData(prev => ({ ...prev, default: e.target.value }))}
            placeholder="e.g., innovative solutions"
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.background,
              color: theme.text
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.key.trim() || !formData.description.trim()}
            style={{
              padding: '8px 20px',
              backgroundColor: formData.key.trim() && formData.description.trim() ? theme.primary : theme.border,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: formData.key.trim() && formData.description.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Add Variable
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Modal Component
const PreviewModal = ({ compiledPrompt, theme, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.background,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: theme.text }}>
            Compiled Prompt Preview
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: theme.textSecondary
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              color: theme.text,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {compiledPrompt}
            </pre>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: theme.primary + '10',
            borderRadius: '8px',
            fontSize: '13px',
            color: theme.textSecondary
          }}>
            <strong>Note:</strong> This is the complete prompt that will be prepended to all creative AI writing tasks.
            Variables shown with sample values will be replaced with actual project data when used.
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for rule type colors
const getRuleTypeColor = (type, theme) => {
  const colors = {
    style: '#007bff',
    formatting: '#28a745',
    forbidden: '#dc3545',
    compliance: '#6f42c1',
    custom: theme.primary
  };
  return colors[type] || theme.primary;
};

export default GlobalPromptConfig;