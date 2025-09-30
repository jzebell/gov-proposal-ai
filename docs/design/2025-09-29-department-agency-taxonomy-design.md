# Department/Agency Taxonomy System - Technical Design

**Document**: Department/Agency Taxonomy with Icon Mapping
**Date**: 2025-09-29
**Version**: 1.0
**Status**: Design Phase
**Author**: Senior Software Engineer

## Executive Summary

The Department/Agency Taxonomy System provides a comprehensive hierarchical classification of U.S. federal government organizations with visual identification through icons and official seals. This system enables accurate project categorization, improves search/filtering capabilities, and provides professional visual presentation in proposals.

## Business Requirements

### Core Objectives
- **Hierarchical Organization**: Department → Agency → Sub-Agency → Program structure
- **Visual Identity**: Icon/seal mapping for each organizational level
- **Searchability**: Quick location of correct agency classification
- **Extensibility**: Admin ability to add custom programs and offices
- **Professional Presentation**: Official seals and logos in proposals

### Use Cases
1. **Project Creation**: Select appropriate agency hierarchy during project setup
2. **Proposal Generation**: Auto-include agency logos/seals in documents
3. **Search & Filter**: Find projects by department/agency/program
4. **Analytics**: Group metrics by organizational hierarchy
5. **Compliance**: Ensure correct agency identification in submissions

## System Architecture

### Data Model

```sql
-- Primary taxonomy table with self-referential hierarchy
CREATE TABLE government_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES government_organizations(id),
    level VARCHAR(20) NOT NULL CHECK (level IN ('department', 'agency', 'sub_agency', 'program', 'office')),
    name VARCHAR(255) NOT NULL,
    full_name TEXT,
    acronym VARCHAR(50),
    alternate_names TEXT[], -- Array of alternative names/spellings

    -- Visual assets
    icon_path VARCHAR(500), -- SVG icon for UI display
    seal_path VARCHAR(500), -- Official seal (high-res)
    logo_path VARCHAR(500), -- Department/agency logo
    color_primary VARCHAR(7), -- Hex color for theming
    color_secondary VARCHAR(7),

    -- Metadata
    website_url VARCHAR(500),
    established_date DATE,
    description TEXT,
    mission_statement TEXT,

    -- Hierarchy helpers
    hierarchy_path TEXT, -- Materialized path like "DOD/Army/CECOM"
    hierarchy_depth INTEGER,
    sort_order INTEGER,

    -- Status
    active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false, -- Admin-verified entry
    user_created BOOLEAN DEFAULT false, -- User vs system entry

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_gov_org_parent ON government_organizations(parent_id);
CREATE INDEX idx_gov_org_level ON government_organizations(level);
CREATE INDEX idx_gov_org_acronym ON government_organizations(UPPER(acronym));
CREATE INDEX idx_gov_org_hierarchy ON government_organizations(hierarchy_path);
CREATE INDEX idx_gov_org_active ON government_organizations(active);
CREATE GIN INDEX idx_gov_org_names ON government_organizations USING gin(alternate_names);

-- Full-text search support
ALTER TABLE government_organizations ADD COLUMN search_vector tsvector;
CREATE INDEX idx_gov_org_search ON government_organizations USING gin(search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION update_gov_org_search() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.acronym, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.alternate_names, ' '), '')), 'D');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER gov_org_search_update
BEFORE INSERT OR UPDATE ON government_organizations
FOR EACH ROW EXECUTE FUNCTION update_gov_org_search();

-- Junction table for project associations
CREATE TABLE project_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES government_organizations(id),
    relationship_type VARCHAR(50) DEFAULT 'customer', -- customer, partner, stakeholder
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_project_primary_org ON project_organizations(project_id) WHERE is_primary = true;
```

### Icon/Asset Management

```javascript
// Icon mapping configuration
const ICON_MAPPINGS = {
  department: {
    'DOD': '/assets/icons/departments/dod.svg',
    'USDA': '/assets/icons/departments/usda.svg',
    'HHS': '/assets/icons/departments/hhs.svg',
    'DOE': '/assets/icons/departments/doe.svg',
    'DOT': '/assets/icons/departments/dot.svg',
    'DHS': '/assets/icons/departments/dhs.svg',
    'VA': '/assets/icons/departments/va.svg',
    'State': '/assets/icons/departments/state.svg',
    'Treasury': '/assets/icons/departments/treasury.svg',
    'DOJ': '/assets/icons/departments/doj.svg',
    'Interior': '/assets/icons/departments/interior.svg',
    'Commerce': '/assets/icons/departments/commerce.svg',
    'Labor': '/assets/icons/departments/labor.svg',
    'HUD': '/assets/icons/departments/hud.svg',
    'Education': '/assets/icons/departments/education.svg'
  },
  agency: {
    'FDA': '/assets/icons/agencies/fda.svg',
    'CDC': '/assets/icons/agencies/cdc.svg',
    'NIH': '/assets/icons/agencies/nih.svg',
    'NASA': '/assets/icons/agencies/nasa.svg',
    'EPA': '/assets/icons/agencies/epa.svg',
    'GSA': '/assets/icons/agencies/gsa.svg',
    'NSF': '/assets/icons/agencies/nsf.svg',
    'SBA': '/assets/icons/agencies/sba.svg'
  },
  fallback: '/assets/icons/generic-gov.svg'
};
```

## Initial Data Population

### Federal Department Structure
```javascript
const INITIAL_DEPARTMENTS = [
  {
    level: 'department',
    acronym: 'DOD',
    name: 'Department of Defense',
    full_name: 'United States Department of Defense',
    established_date: '1949-08-10',
    color_primary: '#223A5E',
    children: [
      { level: 'agency', acronym: 'Army', name: 'Department of the Army' },
      { level: 'agency', acronym: 'Navy', name: 'Department of the Navy' },
      { level: 'agency', acronym: 'AF', name: 'Department of the Air Force' },
      { level: 'agency', acronym: 'SF', name: 'Space Force' },
      { level: 'agency', acronym: 'DLA', name: 'Defense Logistics Agency' },
      { level: 'agency', acronym: 'DISA', name: 'Defense Information Systems Agency' }
    ]
  },
  {
    level: 'department',
    acronym: 'HHS',
    name: 'Health and Human Services',
    full_name: 'United States Department of Health and Human Services',
    established_date: '1979-10-17',
    color_primary: '#1E4C7C',
    children: [
      { level: 'agency', acronym: 'FDA', name: 'Food and Drug Administration' },
      { level: 'agency', acronym: 'CDC', name: 'Centers for Disease Control and Prevention' },
      { level: 'agency', acronym: 'NIH', name: 'National Institutes of Health' },
      { level: 'agency', acronym: 'CMS', name: 'Centers for Medicare & Medicaid Services' }
    ]
  },
  {
    level: 'department',
    acronym: 'USDA',
    name: 'Agriculture',
    full_name: 'United States Department of Agriculture',
    established_date: '1862-05-15',
    color_primary: '#004B23',
    children: [
      { level: 'agency', acronym: 'FSA', name: 'Farm Service Agency' },
      { level: 'agency', acronym: 'NRCS', name: 'Natural Resources Conservation Service' },
      { level: 'agency', acronym: 'FS', name: 'Forest Service' },
      { level: 'agency', acronym: 'ARS', name: 'Agricultural Research Service' }
    ]
  }
  // ... additional departments
];
```

## API Design

### Endpoints

```typescript
// Get full taxonomy tree
GET /api/taxonomy/tree
Response: {
  departments: [{
    id: "uuid",
    name: "Department of Defense",
    acronym: "DOD",
    icon: "/assets/icons/departments/dod.svg",
    children: [...]
  }]
}

// Search organizations
GET /api/taxonomy/search?q=army&level=agency
Response: {
  results: [{
    id: "uuid",
    name: "Department of the Army",
    acronym: "Army",
    hierarchy: "DOD > Army",
    icon: "/assets/icons/agencies/army.svg"
  }],
  total: 1
}

// Get organization details
GET /api/taxonomy/organization/{id}
Response: {
  id: "uuid",
  name: "Centers for Disease Control and Prevention",
  acronym: "CDC",
  parent: { id: "uuid", name: "HHS" },
  hierarchy_path: "HHS/CDC",
  website: "https://www.cdc.gov",
  mission_statement: "...",
  icon: "/assets/icons/agencies/cdc.svg",
  seal: "/assets/seals/cdc-seal.png"
}

// Create custom program/office
POST /api/taxonomy/organization
{
  parent_id: "uuid",
  level: "program",
  name: "C5ISR Center",
  acronym: "C5ISR",
  description: "Command, Control, Computers, Communications, Cyber, Intelligence, Surveillance and Reconnaissance"
}

// Update organization
PATCH /api/taxonomy/organization/{id}
{
  icon_path: "/assets/custom/c5isr.svg",
  verified: true
}
```

## Frontend Components

### React Component Structure

```jsx
// TaxonomySelector.js
const TaxonomySelector = ({ projectId, onChange }) => {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [selectedSubAgency, setSelectedSubAgency] = useState(null);
  const [searchMode, setSearchMode] = useState(false);

  return (
    <div className="taxonomy-selector">
      {searchMode ? (
        <TaxonomySearch onSelect={handleSelection} />
      ) : (
        <TaxonomyHierarchy
          onDepartmentSelect={setSelectedDepartment}
          onAgencySelect={setSelectedAgency}
          onSubAgencySelect={setSelectedSubAgency}
        />
      )}
      <SelectedPath
        department={selectedDepartment}
        agency={selectedAgency}
        subAgency={selectedSubAgency}
      />
    </div>
  );
};

// TaxonomyDisplay.js
const TaxonomyDisplay = ({ organizationId }) => {
  const org = useOrganization(organizationId);

  return (
    <div className="taxonomy-display">
      <img src={org.icon} alt={org.acronym} className="org-icon" />
      <span className="org-hierarchy">{org.hierarchy_path}</span>
      {org.seal && (
        <img src={org.seal} alt={`${org.name} Seal`} className="org-seal" />
      )}
    </div>
  );
};

// AgencyIconGrid.js
const AgencyIconGrid = ({ level = 'department' }) => {
  const organizations = useOrganizationsByLevel(level);

  return (
    <div className="agency-icon-grid">
      {organizations.map(org => (
        <div key={org.id} className="agency-card">
          <img src={org.icon} alt={org.acronym} />
          <span>{org.acronym}</span>
          <span className="full-name">{org.name}</span>
        </div>
      ))}
    </div>
  );
};
```

## Implementation Phases

### Phase 1: Core Data Structure (Week 1)
- [ ] Create database schema and migrations
- [ ] Build initial data seed script for departments/agencies
- [ ] Implement basic CRUD API endpoints
- [ ] Create admin interface for taxonomy management

### Phase 2: Visual Assets (Week 2)
- [ ] Collect/create SVG icons for top 15 departments
- [ ] Collect/create icons for top 30 agencies
- [ ] Implement icon fallback system
- [ ] Build asset management pipeline

### Phase 3: UI Components (Week 3)
- [ ] Create TaxonomySelector component
- [ ] Build TaxonomySearch with autocomplete
- [ ] Implement TaxonomyDisplay component
- [ ] Add icon grid view for visual selection

### Phase 4: Integration (Week 4)
- [ ] Integrate with project creation workflow
- [ ] Add taxonomy to project cards/displays
- [ ] Implement filtering by organization
- [ ] Add to proposal document generation

## Asset Requirements

### Icon Specifications
- **Format**: SVG preferred, PNG fallback
- **Dimensions**: 64x64px base, scalable
- **Color**: Monochrome with agency color option
- **Style**: Consistent line weight and style

### Seal Specifications
- **Format**: PNG or WebP
- **Dimensions**: 300x300px minimum
- **Background**: Transparent
- **Usage**: Proposal covers and official documents

## Search & Discovery

### Full-Text Search
- Search by acronym (highest weight)
- Search by name
- Search by alternate names
- Fuzzy matching for misspellings

### Hierarchical Navigation
- Drill-down from department to program
- Breadcrumb navigation
- Jump-to-level shortcuts
- Recently used organizations

## Performance Considerations

### Caching Strategy
- Cache full taxonomy tree (changes infrequently)
- Cache icon assets in CDN
- Local storage for user's frequent selections
- Materialized paths for fast hierarchy queries

### Loading Optimization
- Lazy load agency children
- Progressive icon loading
- Virtual scrolling for large lists
- Debounced search with minimum 2 characters

## Migration Plan

### Existing Project Data
```sql
-- Migration script to map existing projects
UPDATE projects
SET organization_id = (
  SELECT id FROM government_organizations
  WHERE acronym = projects.agency_acronym
)
WHERE agency_acronym IS NOT NULL;
```

## Success Metrics

### Functional Success
- 100% of federal departments included
- 80% of major agencies included
- <100ms taxonomy tree load time
- <50ms search response time

### User Success
- 90% projects correctly classified
- <3 clicks to select organization
- Visual recognition improves by 50%
- Search success rate >95%

## Risk Mitigation

### Data Accuracy
- Admin verification process
- Community contributions with approval
- Regular updates from official sources
- Fallback to text-only if icons unavailable

### Performance
- Implement caching at all levels
- Use database materialized views
- CDN for static assets
- Progressive enhancement approach

---

**Next Steps**:
1. Review and approve design
2. Begin Phase 1 implementation
3. Start collecting visual assets
4. Create initial data seed