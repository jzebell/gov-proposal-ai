# Global Prompt Configuration - Design Document

**Document**: Global Prompt Configuration for Creative Writing Standards
**Date**: 2025-09-29
**Version**: 1.0
**Status**: Design Phase
**Author**: Senior Software Engineer

## Overview

Implement a global prompt configuration system in the Global Settings tab that establishes base creative writing standards for all AI-generated content across the application. This single base prompt will be prepended to all creative AI writing tasks (excluding strict RAG responses) to ensure consistency, compliance, and quality.

## Requirements Summary

- **Location**: Global Settings tab in Admin Settings
- **Scope**: One base prompt applied to all creative AI writing
- **Components**: Base paragraph + individual rules + variable system
- **Exclusions**: RAG strict answers (factual lookups) don't use this prompt
- **Integration**: Works alongside existing persona prompts

## System Architecture

### 1. Data Model

```javascript
// Database Schema
global_prompt_config {
  id: SERIAL PRIMARY KEY,
  base_prompt: TEXT,              // Main paragraph with writing philosophy
  rules: JSONB,                    // Array of individual rules
  variables: JSONB,                // Dynamic variable definitions
  is_active: BOOLEAN DEFAULT true,
  updated_by: INTEGER (user_id),
  updated_at: TIMESTAMP,
  version: INTEGER                 // Version tracking for changes
}

// Example JSONB structures
rules: [
  {
    id: "rule-1",
    type: "style",
    rule: "Use active voice only",
    enabled: true
  },
  {
    id: "rule-2",
    type: "acronym",
    rule: "Spell out acronyms on first use",
    enabled: true
  },
  {
    id: "rule-3",
    type: "forbidden",
    rule: "Never use: leveraging, synergy, ideation",
    words: ["leveraging", "synergy", "ideation"],
    enabled: true
  }
]

variables: [
  {
    key: "{{AGENCY_NAME}}",
    description: "The contracting agency",
    source: "project",
    default: "the agency"
  },
  {
    key: "{{WIN_THEMES}}",
    description: "Key win themes for this proposal",
    source: "project_metadata",
    default: ""
  }
]
```

### 2. Frontend Design

#### Global Settings Tab Enhancement

```
Global Settings Tab
├── [Existing Sections...]
└── AI Writing Standards Section (New)
    ├── Base Prompt Configuration
    │   ├── Title: "Global AI Writing Standards"
    │   ├── Description helper text
    │   └── Large textarea for base prompt
    ├── Individual Rules Management
    │   ├── Add Rule button
    │   ├── Rules List (draggable for ordering)
    │   │   ├── Rule cards with:
    │   │   │   ├── Rule text
    │   │   │   ├── Type badge
    │   │   │   ├── Enable/disable toggle
    │   │   │   ├── Edit button
    │   │   │   └── Delete button
    │   └── Rule Categories:
    │       ├── Style Rules
    │       ├── Formatting Rules
    │       ├── Forbidden Words/Phrases
    │       └── Custom Rules
    ├── Variable System
    │   ├── System Variables (read-only list)
    │   ├── Custom Variables (add/edit/delete)
    │   └── Variable Test Panel
    └── Actions
        ├── Preview Compiled Prompt
        ├── Test with Sample
        ├── Save Changes
        └── Reset to Defaults
```

#### UI Components

1. **Base Prompt Editor**
```jsx
<div className="base-prompt-section">
  <h3>Base Writing Standards</h3>
  <p className="helper-text">
    This prompt is prepended to all creative AI writing tasks.
    Define your organization's voice, tone, and standards.
  </p>
  <textarea
    value={basePrompt}
    onChange={handleBasePromptChange}
    placeholder="Example: Write in a professional, clear, and concise manner
    suitable for government proposals. Focus on benefits to the agency,
    use concrete examples, and maintain an authoritative yet accessible tone..."
    rows={8}
  />
  <div className="char-count">{basePrompt.length} / 2000 characters</div>
</div>
```

2. **Rules Builder**
```jsx
<div className="rules-section">
  <div className="section-header">
    <h3>Writing Rules</h3>
    <button onClick={openAddRuleModal}>+ Add Rule</button>
  </div>

  <div className="rules-categories">
    <TabGroup>
      <Tab>All Rules ({rules.length})</Tab>
      <Tab>Style ({styleRules.length})</Tab>
      <Tab>Formatting ({formatRules.length})</Tab>
      <Tab>Forbidden ({forbiddenRules.length})</Tab>
    </TabGroup>
  </div>

  <DraggableList
    items={filteredRules}
    onReorder={handleRulesReorder}
    renderItem={(rule) => (
      <RuleCard
        rule={rule}
        onToggle={handleToggleRule}
        onEdit={handleEditRule}
        onDelete={handleDeleteRule}
      />
    )}
  />
</div>
```

3. **Variable Manager**
```jsx
<div className="variables-section">
  <h3>Dynamic Variables</h3>
  <div className="variable-groups">
    {/* System Variables - Read Only */}
    <div className="system-variables">
      <h4>System Variables</h4>
      {systemVariables.map(v => (
        <VariableChip key={v.key} variable={v} readOnly />
      ))}
    </div>

    {/* Custom Variables - Editable */}
    <div className="custom-variables">
      <h4>Custom Variables</h4>
      <button onClick={openAddVariableModal}>+ Add Variable</button>
      {customVariables.map(v => (
        <VariableCard
          key={v.key}
          variable={v}
          onEdit={handleEditVariable}
          onDelete={handleDeleteVariable}
        />
      ))}
    </div>
  </div>
</div>
```

### 3. Backend Implementation

#### API Endpoints

```javascript
// Get current global prompt configuration
GET /api/admin/global-prompt
Response: {
  basePrompt: string,
  rules: Rule[],
  variables: Variable[],
  isActive: boolean,
  lastUpdated: timestamp,
  updatedBy: User
}

// Update global prompt configuration
PUT /api/admin/global-prompt
Body: {
  basePrompt: string,
  rules: Rule[],
  variables: Variable[]
}

// Get compiled prompt (for preview)
POST /api/admin/global-prompt/preview
Body: {
  context: {
    projectId?: string,
    documentType?: string
  }
}
Response: {
  compiledPrompt: string,
  resolvedVariables: object
}

// Get default configuration
GET /api/admin/global-prompt/defaults
Response: {
  basePrompt: string,
  rules: Rule[]
}
```

#### Prompt Compilation Service

```javascript
class PromptCompilerService {
  compileGlobalPrompt(config, context) {
    let prompt = config.basePrompt;

    // Add enabled rules
    const enabledRules = config.rules.filter(r => r.enabled);
    if (enabledRules.length > 0) {
      prompt += "\n\nAdditional Requirements:\n";
      enabledRules.forEach((rule, index) => {
        prompt += `${index + 1}. ${rule.rule}\n`;
      });
    }

    // Replace variables
    prompt = this.replaceVariables(prompt, config.variables, context);

    return prompt;
  }

  replaceVariables(prompt, variables, context) {
    variables.forEach(variable => {
      const value = this.resolveVariable(variable, context);
      prompt = prompt.replace(
        new RegExp(variable.key, 'g'),
        value || variable.default
      );
    });
    return prompt;
  }
}
```

### 4. Integration Points

#### AI Service Integration

```javascript
// Before making AI call for creative writing
async function prepareAIPrompt(userPrompt, context) {
  const globalConfig = await getGlobalPromptConfig();

  if (globalConfig.isActive && context.type === 'creative') {
    const compiledGlobalPrompt = compileGlobalPrompt(globalConfig, context);

    // Combine: Global Prompt + Persona Prompt + User Prompt
    return {
      system: compiledGlobalPrompt,
      persona: context.personaPrompt,
      user: userPrompt
    };
  }

  return { user: userPrompt };
}
```

## Example Configurations

### Sample Base Prompt
```
You are a professional government proposal writer. Write in clear, concise, and compelling prose that demonstrates understanding of government requirements and evaluation criteria. Focus on tangible benefits, proven methodologies, and measurable outcomes. Maintain a confident, authoritative tone while being accessible to both technical and non-technical evaluators.
```

### Sample Rules
1. **Style**: "Use active voice exclusively"
2. **Style**: "Write in present or future tense, avoid past tense except for past performance"
3. **Formatting**: "Spell out all acronyms on first use followed by the acronym in parentheses"
4. **Formatting**: "Limit sentences to 20 words maximum"
5. **Forbidden**: "Never use: leverage, utilize, synergize, ideate, or any business jargon"
6. **Compliance**: "Always reference specific RFP sections when discussing requirements"

### Sample Variables
- `{{AGENCY_NAME}}` - The contracting agency
- `{{CONTRACT_NUMBER}}` - RFP/RFQ number
- `{{SUBMISSION_DATE}}` - Proposal due date
- `{{PROJECT_NAME}}` - Current project name
- `{{WIN_THEMES}}` - Key discriminators
- `{{INCUMBENT}}` - Current contract holder

## User Workflow

1. **Admin Setup**
   - Navigate to Admin Settings → Global Settings
   - Scroll to "AI Writing Standards" section
   - Enter base prompt paragraph
   - Add individual rules using the rule builder
   - Configure variables if needed
   - Preview the compiled prompt
   - Save configuration

2. **Testing**
   - Use "Test with Sample" to see how prompt affects output
   - Adjust rules and base prompt as needed
   - Enable/disable specific rules for testing

3. **Production Use**
   - All creative AI writing automatically uses the global prompt
   - Users don't see the global prompt (it's transparent)
   - Persona prompts add to (not replace) the global prompt

## Technical Considerations

### Performance
- Cache compiled prompts (5-minute TTL)
- Only recompile when configuration changes
- Lazy load variables only when needed

### Security
- Admin-only access to configuration
- Audit trail for all changes
- Version history maintained

### Validation
- Prompt length limits (2000 chars for base)
- Rule text validation (max 200 chars)
- Variable key format validation ({{KEY}})
- Forbidden words sanitization

### Storage
- Single row in database for active config
- History table for version tracking
- JSONB for flexible rule/variable storage

## Implementation Plan

### Phase 1: Backend (Day 1)
- [ ] Create database table and migration
- [ ] Implement PromptCompilerService
- [ ] Create API endpoints
- [ ] Add authentication/authorization

### Phase 2: Frontend UI (Day 2)
- [ ] Add section to Global Settings tab
- [ ] Build base prompt editor
- [ ] Create rule builder interface
- [ ] Implement variable manager

### Phase 3: Integration (Day 3)
- [ ] Integrate with AI service layer
- [ ] Add prompt preview functionality
- [ ] Implement test panel
- [ ] Connect to existing persona system

### Phase 4: Testing & Polish (Day 4)
- [ ] Test with various rule combinations
- [ ] Add default configurations
- [ ] Implement version history
- [ ] Create help documentation

## Success Metrics

- All creative AI outputs follow configured standards
- 90% reduction in manual prompt engineering
- Consistent voice across all AI-generated content
- No performance impact on AI response times
- Easy to modify without code changes

## Future Enhancements

1. **Rule Templates**: Pre-built rule sets for different industries
2. **A/B Testing**: Compare different prompt configurations
3. **Analytics**: Track which rules improve output quality
4. **Import/Export**: Share configurations across instances
5. **Rule Conditions**: Apply rules only to specific document types
6. **Validation Engine**: Test outputs against rules automatically

---

**Next Steps**: Proceed with Phase 1 implementation of backend infrastructure and database schema.