# Capability Matrix - Feature Requirements

**Status:** 📋 Planned
**Priority:** High
**Epic:** Past Performance & Capability Matching
**Related:** Past Performance RAG System (Epic 2)
**Added:** 2025-09-30

## Overview

A comprehensive capability matching system that automatically compares new solicitation requirements against organizational skills, experience, and past performance to identify strengths, gaps, and teaming needs.

## Business Requirements

### Problem Statement
When evaluating new opportunities, organizations struggle to:
- Quickly assess their capability match to solicitation requirements
- Identify skill/experience gaps that need addressing
- Find specific past performance examples that demonstrate required capabilities
- Make data-driven go/no-go and teaming decisions
- Quantify their competitive position on technical capabilities

### Solution Vision
An AI-powered capability matrix that:
1. **Extracts** all technical and experience requirements from solicitations
2. **Matches** requirements against organizational capabilities and past performance
3. **Scores** match percentage and confidence level for each requirement
4. **Identifies** gaps requiring hiring, training, or teaming partners
5. **Recommends** optimal past performance references for each requirement
6. **Generates** capability assessment reports for go/no-go decisions

## Core Features

### 1. Requirement Extraction Engine

**Description:** AI-powered parsing of solicitation documents to extract all technical, experience, and qualification requirements.

**Extraction Categories:**

**Technical Requirements:**
- Technologies (programming languages, frameworks, platforms)
- Tools and software (specific products, versions)
- Architectures (microservices, cloud-native, etc.)
- Standards and protocols (NIST, ISO, FedRAMP, etc.)
- Security requirements (clearances, certifications, compliance)
- Infrastructure (cloud providers, on-prem, hybrid)

**Experience Requirements:**
- Domain expertise (logistics, healthcare, financial, etc.)
- Customer type (DoD, civilian agencies, state/local)
- Project scale (contract value, team size, duration)
- Delivery methodologies (Agile, DevOps, CMMI, etc.)
- Geographic experience (CONUS, OCONUS, specific locations)

**Qualification Requirements:**
- Personnel certifications (PMP, CISSP, AWS, etc.)
- Corporate certifications (CMMI, ISO 9001, etc.)
- Facility clearances (Facility Security Clearance)
- Small business status (8(a), SDVOSB, HUBZone, etc.)
- Contract vehicles (GSA Schedule, SeaPort-e, etc.)

**Personnel Requirements:**
- Labor categories and quantities
- Education levels (Bachelor's, Master's, PhD)
- Years of experience per role
- Specific skill combinations
- Clearance levels required

**AI Parsing Approach:**
- Named entity recognition (NER) for technical terms
- Relationship extraction (X requires Y)
- Importance classification (mandatory vs. desired vs. nice-to-have)
- Quantity extraction (e.g., "minimum 5 years experience")
- Context understanding (what applies to what)

**Example Extraction:**
```
Solicitation: "Cloud Migration for Logistics System"

Extracted Requirements:

Technical Requirements:
├── Cloud Platform: AWS GovCloud (MANDATORY)
│   ├── Specific Services: EC2, S3, RDS, Lambda
│   ├── Infrastructure as Code: Terraform or CloudFormation
│   └── Security: FedRAMP High authorization required
├── Programming Languages: Python, Java (MANDATORY)
├── Database: PostgreSQL 12+ (MANDATORY), MongoDB (DESIRED)
├── DevOps: CI/CD pipeline, containerization (Docker/Kubernetes)
└── Security: NIST 800-171 compliance, ATO experience

Experience Requirements:
├── Cloud Migration: Minimum 3 completed migrations to AWS (MANDATORY)
│   └── Similar scale: $10M+ contract value
├── Logistics Domain: Experience with supply chain systems (DESIRED)
├── DoD Customer: Prior DoD contracts required (MANDATORY)
└── FedRAMP: Experience obtaining FedRAMP authorization (MANDATORY)

Qualification Requirements:
├── Corporate: CMMI Level 3 or equivalent (DESIRED)
├── Personnel: AWS Certified Solutions Architect (MANDATORY for Tech Lead)
├── Security: Active Facility Security Clearance (MANDATORY)
└── Contract Vehicle: None specified (ANY accepted)

Personnel Requirements:
├── Project Manager (1):
│   ├── PMP certification (MANDATORY)
│   ├── 10+ years PM experience
│   ├── DoD customer experience
│   └── Secret clearance minimum
├── Technical Lead (1):
│   ├── AWS Solutions Architect certification (MANDATORY)
│   ├── 8+ years cloud architecture experience
│   └── Python and Java expertise
├── Software Engineers (4-6):
│   ├── Bachelor's in Computer Science or equivalent
│   ├── 5+ years development experience
│   └── AWS and containerization experience
└── DevOps Engineers (2):
    ├── Jenkins/GitLab CI/CD experience
    ├── Terraform or CloudFormation
    └── Kubernetes administration

Evaluation Criteria Weights:
├── Technical Approach: 40%
├── Past Performance: 30%
├── Management Approach: 20%
└── Cost: 10%
```

### 2. Organizational Capability Inventory

**Description:** Comprehensive database of organizational capabilities, skills, experience, and qualifications.

**Capability Categories:**

**Technical Capabilities:**
- Technologies used (with proficiency levels)
- Tools and platforms in production use
- Architectural patterns employed
- Security and compliance certifications held
- Infrastructure and environments

**Experience Inventory:**
- Past projects by domain, customer type, technology
- Contract performance history (CPARS ratings)
- Customer testimonials and references
- Awards and recognitions
- Lessons learned and case studies

**Personnel Capabilities:**
- Staff skills matrix (technologies, tools, domains)
- Certifications held by employees
- Clearance levels available
- Years of experience by role
- Availability for new projects

**Corporate Qualifications:**
- Business certifications (ISO, CMMI, etc.)
- Facility security clearances
- Small business certifications
- Contract vehicles held
- Past performance ratings (averaged)

**Data Sources:**
- Past Performance RAG system
- HR systems (skills, certifications, clearances)
- Project management system (project histories)
- Document repository (case studies, white papers)
- Manual entry (corporate certifications, etc.)

**Example Capability Profile:**
```
Organization: Acme Solutions, Inc.

Technical Capabilities:
├── Cloud Platforms:
│   ├── AWS: Expert (15 projects, 8 years experience)
│   ├── Azure: Intermediate (5 projects, 3 years experience)
│   └── GCP: Beginner (1 pilot project)
├── Programming Languages:
│   ├── Python: Expert (20 projects, 10 years)
│   ├── Java: Expert (25 projects, 12 years)
│   ├── JavaScript/TypeScript: Advanced (15 projects, 6 years)
│   └── Go: Intermediate (3 projects, 2 years)
├── Databases:
│   ├── PostgreSQL: Expert (18 projects, 9 years)
│   ├── MongoDB: Advanced (8 projects, 4 years)
│   └── Oracle: Intermediate (5 projects, 6 years)
└── DevOps/Infrastructure:
    ├── Docker/Kubernetes: Expert (12 projects, 5 years)
    ├── Terraform: Advanced (10 projects, 4 years)
    ├── Jenkins/GitLab CI: Expert (15 projects, 7 years)
    └── Ansible: Intermediate (6 projects, 3 years)

Experience Inventory:
├── Cloud Migrations: 12 completed (AWS: 10, Azure: 2)
│   ├── Average contract value: $8.5M
│   ├── Average CPARS rating: 4.6/5.0
│   └── Success rate: 100% (no failed migrations)
├── DoD Customers: 18 contracts
│   ├── Agencies: DLA, DISA, Army, Navy
│   ├── Total contract value: $125M
│   └── Average CPARS: 4.5/5.0
├── FedRAMP Experience: 3 ATOs obtained
│   ├── 2x FedRAMP Moderate
│   └── 1x FedRAMP High (in progress)
└── Logistics Domain: 7 projects
    ├── Supply chain systems: 4
    ├── Inventory management: 2
    └── Transportation optimization: 1

Personnel Capabilities (75 employees):
├── Cloud Architects: 4
│   ├── AWS Certified: 4
│   ├── Azure Certified: 2
│   └── Avg experience: 9 years
├── Software Engineers: 35
│   ├── Python: 28
│   ├── Java: 25
│   ├── JavaScript: 20
│   └── Avg experience: 6.5 years
├── DevOps Engineers: 8
│   ├── Terraform certified: 5
│   ├── Kubernetes certified: 6
│   └── Avg experience: 5 years
└── Project Managers: 5
    ├── PMP certified: 5
    ├── DoD experience: 4
    └── Avg experience: 12 years

Clearances Available:
├── Secret: 42 employees
├── Top Secret: 12 employees
└── Facility Clearance: Secret level

Corporate Qualifications:
├── CMMI Level 3 (achieved 2021)
├── ISO 9001:2015 (achieved 2020)
├── ISO 27001 (achieved 2022)
├── Small Business (8(a) certified until 2026)
└── Contract Vehicles:
    ├── GSA Schedule 70
    ├── SeaPort-e Prime
    └── CIO-SP4 (pending)
```

### 3. Capability Matching Engine

**Description:** AI-powered matching of solicitation requirements against organizational capabilities with scoring and gap identification.

**Matching Algorithm:**

**1. Direct Match:**
- Exact technology/tool match
- Past performance with same customer
- Personnel with exact certifications
- Score: 100% match

**2. Close Match:**
- Similar but not identical technology (e.g., GitLab vs. Jenkins)
- Adjacent domain experience (supply chain vs. logistics)
- Transferable skills
- Score: 70-90% match

**3. Partial Match:**
- Related but not directly applicable experience
- Limited exposure (1-2 projects)
- Training/ramp-up required
- Score: 40-70% match

**4. No Match / Gap:**
- No relevant experience
- Technology never used
- Skill not present in organization
- Score: 0-40% match (GAP identified)

**Matching Factors:**

**Recency:** More recent experience scored higher
```
Last 12 months: 1.0x multiplier
1-2 years ago: 0.9x multiplier
2-4 years ago: 0.7x multiplier
4+ years ago: 0.5x multiplier
```

**Scale:** Larger/more complex projects scored higher
```
Contract value >= requirement: 1.0x
Contract value 50-100% of requirement: 0.8x
Contract value < 50% of requirement: 0.6x
```

**Success:** Better performance rated higher
```
CPARS 4.5-5.0: 1.0x multiplier
CPARS 4.0-4.5: 0.9x multiplier
CPARS 3.5-4.0: 0.7x multiplier
CPARS < 3.5: 0.5x multiplier
```

**Confidence Level:**
- High Confidence (90-100%): Strong proof points, multiple examples
- Medium Confidence (70-90%): Some proof, limited examples
- Low Confidence (50-70%): Weak proof, indirect evidence
- No Confidence (0-50%): No relevant evidence

**Example Match Results:**
```
Requirement: "AWS GovCloud cloud migration experience (minimum 3 projects)"

Capability Match:
├── Direct Match: YES
├── Match Score: 95%
├── Confidence: High (95%)
├── Evidence:
│   ├── 10 completed AWS migrations (3 required ✓)
│   ├── 8 were GovCloud specifically (perfect match ✓)
│   ├── Most recent: 6 months ago (very recent ✓)
│   ├── Average contract size: $8.5M (similar scale ✓)
│   └── CPARS average: 4.6/5.0 (excellent performance ✓)
├── Supporting Projects:
│   ├── DLA Logistics Cloud Migration (2024) - $12M - CPARS 4.8
│   ├── DISA Data Center Migration (2023) - $9M - CPARS 4.5
│   └── Army Supply Chain Modernization (2023) - $7M - CPARS 4.6
└── Recommendation: STRONG - Use all 3 as past performance references

─────────────────────────────────────────────────────────────

Requirement: "FedRAMP High authorization experience"

Capability Match:
├── Partial Match: MEDIUM
├── Match Score: 60%
├── Confidence: Medium (70%)
├── Evidence:
│   ├── 2 FedRAMP Moderate ATOs obtained (close but not High ⚠️)
│   ├── 1 FedRAMP High in progress (demonstrates capability ✓)
│   ├── Most recent: 8 months ago (recent ✓)
│   └── All successful (no failed ATOs ✓)
├── Gap Analysis:
│   ├── Have process and team for FedRAMP
│   ├── Never completed a High authorization (moderate only)
│   └── Current project will complete in 3 months
├── Supporting Projects:
│   ├── DoD Healthcare System (2024) - FedRAMP Moderate - Success
│   ├── VA Benefits Portal (2023) - FedRAMP Moderate - Success
│   └── DHS Identity System (2025) - FedRAMP High - In Progress
└── Recommendation: ADDRESSABLE - Emphasize in-progress High ATO,
    may need teaming partner with completed High experience

─────────────────────────────────────────────────────────────

Requirement: "Logistics domain expertise (supply chain systems)"

Capability Match:
├── Close Match: YES
├── Match Score: 75%
├── Confidence: High (85%)
├── Evidence:
│   ├── 7 logistics projects total (good breadth ✓)
│   ├── 4 supply chain systems specifically (direct match ✓)
│   ├── Most recent: 1 year ago (relatively recent ✓)
│   ├── Average CPARS: 4.4/5.0 (very good ✓)
│   └── DLA customer experience (same customer as this RFP ✓)
├── Supporting Projects:
│   ├── DLA Supply Chain Visibility (2023) - $5M - CPARS 4.6
│   ├── Navy Inventory Management (2022) - $3M - CPARS 4.5
│   └── Army Logistics Modernization (2021) - $4M - CPARS 4.2
└── Recommendation: STRONG - Highlight DLA project especially

─────────────────────────────────────────────────────────────

Requirement: "Quantum computing experience"

Capability Match:
├── No Match: GAP IDENTIFIED
├── Match Score: 5%
├── Confidence: Very Low (10%)
├── Evidence:
│   ├── No quantum computing projects ❌
│   ├── No staff with quantum expertise ❌
│   ├── No certifications or training ❌
│   └── 1 white paper published on quantum (minimal exposure)
├── Gap Analysis:
│   ├── Completely new technology for our organization
│   ├── Would require hiring or extensive training
│   ├── Or teaming with quantum computing specialist
│   └── Lead time to build capability: 6-12 months
└── Recommendation: CRITICAL GAP - Teaming partner required
    OR consider no-bid if quantum is heavily weighted
```

### 4. Gap Analysis & Recommendations

**Description:** Automated identification of capability gaps with prioritized recommendations for addressing them.

**Gap Classification:**

**Critical Gap:**
- Mandatory requirement with no match
- Heavily weighted in evaluation (>20%)
- Cannot be addressed quickly (<3 months)
- **Action:** Must address or consider no-bid

**Significant Gap:**
- Mandatory requirement with weak match (<50%)
- Moderate evaluation weight (10-20%)
- Can be addressed with effort (3-6 months)
- **Action:** Develop mitigation plan (hiring, teaming, training)

**Minor Gap:**
- Desired (not mandatory) requirement with weak match
- Low evaluation weight (<10%)
- Can be addressed easily (<3 months)
- **Action:** Consider addressing if competitive

**Non-Issue Gap:**
- Nice-to-have requirement with no match
- Not scored in evaluation
- **Action:** Acknowledge but deprioritize

**Gap Mitigation Strategies:**

**1. Hire Expertise:**
- Identify specific roles/skills needed
- Estimate time to recruit and onboard
- Calculate cost impact
- Assess availability of talent in market

**2. Train Existing Staff:**
- Identify training programs/certifications
- Estimate time to proficiency
- Calculate training costs
- Assess feasibility given timeline

**3. Teaming Partner:**
- Identify potential partners with needed capability
- Assess teaming arrangement (prime/sub, JV, etc.)
- Calculate impact on win strategy and pricing
- Evaluate partner reliability and compatibility

**4. Subcontract:**
- Identify specialized subcontractors
- Define scope for subcontracted work
- Assess impact on technical approach
- Calculate subcontractor costs

**5. Acquire Capability:**
- Consider acquiring a company with needed capability (M&A)
- Long-term strategy, not practical for single opportunity
- May be worth it for strategic capability gaps

**Example Gap Analysis Report:**
```
Opportunity: DLA Cloud Migration - Gap Analysis

Overall Capability Match: 78% (Good)
├── Strong Matches (90-100%): 12 requirements (60%)
├── Acceptable Matches (70-90%): 5 requirements (25%)
├── Weak Matches (50-70%): 2 requirements (10%)
└── Gaps (< 50%): 1 requirement (5%)

════════════════════════════════════════════════════════════

CRITICAL GAPS (Must Address):

None identified ✓

════════════════════════════════════════════════════════════

SIGNIFICANT GAPS (Should Address):

Gap #1: FedRAMP High Authorization Experience
├── Current Match: 60% (Partial)
├── Requirement: Demonstrate successful FedRAMP High ATO
├── Our Status: 2x FedRAMP Moderate, 1x High in-progress
├── Evaluation Weight: 15% (Past Performance subfactor)
├── Impact: Could lose 10-15 points in evaluation
└── Recommendations (Ranked):
    1. WAIT 3 months for current High ATO to complete (BEST)
       - Pros: Genuine capability, no teaming needed
       - Cons: RFP due in 6 weeks (timing doesn't work)
       - Feasibility: LOW (timeline issue)

    2. Team with FedRAMP High specialist (RECOMMENDED)
       - Candidate partners: Secure Cloud Inc., AuthPro LLC
       - Pros: Immediate capability, credible past performance
       - Cons: Share revenue, more complex proposal
       - Feasibility: HIGH (both partners available)
       - Estimated cost impact: 15-20% subcontract

    3. Emphasize in-progress project + Moderate successes
       - Pros: No teaming complexity
       - Cons: Weaker competitive position vs. High-experienced competitors
       - Feasibility: HIGH
       - Risk: May score lower than competitors

DECISION: Recommend Option #2 (Teaming)
ACTION: Contact Secure Cloud Inc. for teaming discussion

════════════════════════════════════════════════════════════

MINOR GAPS (Consider Addressing):

Gap #2: MongoDB NoSQL Database Experience
├── Current Match: 40% (Weak)
├── Requirement: "Desired" - 3+ years MongoDB production experience
├── Our Status: 8 projects with MongoDB, but limited depth
├── Evaluation Weight: 5% (Technical Approach subfactor)
├── Impact: Could lose 2-5 points if emphasized
└── Recommendations:
    1. Highlight existing MongoDB projects (RECOMMENDED)
       - Pros: Simple, authentic
       - Cons: May not fully satisfy evaluators
       - Feasibility: HIGH

    2. Provide MongoDB training to 2-3 engineers
       - Pros: Builds genuine capability
       - Cons: Cost and time investment ($5K, 2 weeks)
       - Feasibility: MEDIUM (tight timeline)

    3. Subcontract NoSQL database optimization
       - Pros: Brings in expert
       - Cons: Additional cost and complexity
       - Feasibility: MEDIUM

DECISION: Recommend Option #1 (Highlight existing)
ACTION: Identify best MongoDB project examples for past performance

════════════════════════════════════════════════════════════

CAPABILITY STRENGTHS (Leverage in Proposal):

Strength #1: AWS Cloud Migration Expertise ⭐⭐⭐
├── Match Score: 95% (Excellent)
├── Evidence: 10 completed migrations, 8 in GovCloud
├── Evaluation Weight: 30% (Past Performance - highest weight)
├── Competitive Advantage: Likely stronger than most competitors
└── Recommendation: LEAD WITH THIS - Make it a win theme
    "Proven, Zero-Risk Cloud Migration Expertise"

Strength #2: DoD Customer Experience ⭐⭐⭐
├── Match Score: 92% (Excellent)
├── Evidence: 18 DoD contracts, DLA-specific experience
├── Evaluation Weight: 25% (Past Performance subfactor)
├── Competitive Advantage: DLA customer reference is huge
└── Recommendation: Emphasize customer familiarity
    "Deep Understanding of DLA Mission and Culture"

Strength #3: DevOps/CI-CD Pipeline Expertise ⭐⭐
├── Match Score: 88% (Very Good)
├── Evidence: 15 DevOps projects, modern toolchain
├── Evaluation Weight: 20% (Technical Approach)
├── Competitive Advantage: Mature DevOps practice
└── Recommendation: Highlight automation and efficiency
    "Accelerated Delivery Through DevOps Excellence"

════════════════════════════════════════════════════════════

GO/NO-GO RECOMMENDATION:

Decision: GO (Pursue)

Rationale:
✓ 78% overall capability match (above 75% threshold)
✓ Strong in highest-weighted areas (AWS, DoD experience)
✓ Only 1 significant gap, addressable via teaming
✓ No critical gaps that would disqualify us
✓ Competitive strengths align with customer priorities

Conditions:
• Secure teaming partner for FedRAMP High (Secure Cloud Inc.)
• Dedicate top AWS migration team (not available for other bids)
• Allocate budget for MongoDB training ($5K)

Estimated Win Probability: 65% (above 50% threshold)
Expected Value: $50M x 0.65 = $32.5M
Bid/Proposal Cost: ~$150K
ROI: $32.5M / $150K = 217x (pursue)
```

### 5. Past Performance Recommender

**Description:** AI-suggested mapping of past performance projects to specific solicitation requirements for maximum evaluation impact.

**Recommendation Logic:**

**Relevancy Scoring:**
For each past performance project, calculate relevancy to each requirement:
- Technology match (how similar?)
- Domain match (same industry/customer type?)
- Scale match (similar size/complexity?)
- Recency (how recent?)
- Success (CPARS rating, customer satisfaction)
- Customer match (same agency/office?)

**Selection Optimization:**
- Maximum 3-5 past performance references typically allowed
- Choose portfolio that covers most requirements
- Balance between breadth (many requirements) and depth (strong examples)
- Prioritize requirements with highest evaluation weights

**Example:**
```
Solicitation: 12 technical requirements, 5 experience requirements

Past Performance Portfolio: 18 eligible projects

Optimization Goal:
Maximize coverage of weighted requirements using 3 allowed references

Recommended Past Performance References:

Reference #1: DLA Logistics Cloud Migration (2024)
├── Requirements Covered: 8 of 17 (47%)
│   ├── AWS GovCloud migration ✓ (30% weight)
│   ├── DoD customer ✓ (25% weight)
│   ├── Logistics domain ✓ (15% weight)
│   ├── FedRAMP compliance ✓ (10% weight)
│   ├── DevOps/CI-CD ✓ (5% weight)
│   ├── PostgreSQL ✓ (3% weight)
│   ├── Python/Java ✓ (2% weight)
│   └── Similar scale ($12M) ✓
├── CPARS Rating: 4.8/5.0 (Exceptional)
├── Customer: DLA (same as RFP customer ✓✓)
├── Recency: 6 months ago (very recent)
├── Relevancy Score: 95/100
└── Rationale: Highest-weighted requirements, same customer, excellent rating

Reference #2: DISA Data Center Migration (2023)
├── Requirements Covered: 6 of 17 (35%)
│   ├── AWS migration ✓ (30% weight) - reinforces strength
│   ├── DoD customer ✓ (25% weight) - reinforces
│   ├── FedRAMP Moderate ATO ✓ (10% weight)
│   ├── Kubernetes/Docker ✓ (8% weight)
│   ├── Terraform IaC ✓ (5% weight)
│   └── Security controls ✓ (4% weight)
├── CPARS Rating: 4.5/5.0 (Very Good)
├── Customer: DISA (different DoD agency)
├── Recency: 18 months ago (recent)
├── Relevancy Score: 88/100
└── Rationale: Reinforces cloud strength, adds infrastructure/security depth

Reference #3: Navy Supply Chain Modernization (2022)
├── Requirements Covered: 5 of 17 (29%)
│   ├── Logistics domain ✓ (15% weight) - reinforces domain expertise
│   ├── Agile delivery ✓ (8% weight)
│   ├── User-centered design ✓ (5% weight)
│   ├── MongoDB NoSQL ✓ (5% weight) - fills gap!
│   └── API development ✓ (3% weight)
├── CPARS Rating: 4.6/5.0 (Excellent)
├── Customer: Navy (DoD)
├── Recency: 2.5 years ago (moderate)
├── Relevancy Score: 82/100
└── Rationale: Reinforces logistics, fills MongoDB gap, good rating

════════════════════════════════════════════════════════════

Portfolio Summary:
├── Total Requirements Covered: 14 of 17 (82%)
├── Weighted Coverage: 88% (high-weight requirements well-covered)
├── Average CPARS: 4.63/5.0 (excellent)
├── All DoD customers ✓
├── All recent (< 3 years) ✓
└── Gaps Remaining: 3 requirements not covered by these 3 projects
    (but low evaluation weight, acceptable)

Alternative Portfolios Considered:

Portfolio B: Different 3 projects
├── Coverage: 15 of 17 (88%) - slightly better
├── Weighted Coverage: 82% - worse on high-weight items
├── Average CPARS: 4.3/5.0 - lower ratings
└── Verdict: REJECTED - lower weighted coverage, weaker ratings

Portfolio C: Include 4th reference (if allowed)
├── Coverage: 16 of 17 (94%) - excellent
├── Weighted Coverage: 92%
├── Average CPARS: 4.55/5.0
└── Verdict: OPTIMAL IF 4 REFS ALLOWED - check RFP

RECOMMENDATION: Use Portfolio A (3 references above)
Unless RFP allows 4 references, then use Portfolio C
```

### 6. Interactive Capability Dashboard

**Description:** Visual dashboard for capture managers and proposal teams to explore capability matches, gaps, and recommendations.

**Dashboard Views:**

**1. Overall Match Summary:**
- Gauge chart: 78% overall capability match
- Traffic light indicators: Green (strong), Yellow (acceptable), Red (gap)
- Requirement breakdown: Mandatory vs. desired, weights

**2. Capability Heat Map:**
- Matrix view: Requirements (rows) x Projects (columns)
- Color coding: Dark green (strong match) to red (no match)
- Interactive: Click cell to see detailed match analysis

**3. Gap Analysis View:**
- Critical/Significant/Minor gaps listed with priority
- Mitigation options with cost/time/feasibility scores
- Drag-and-drop to assign gaps to team members

**4. Past Performance Selector:**
- Filterable list of all eligible projects
- Side-by-side comparison of up to 5 projects
- Coverage visualization (which requirements each project addresses)
- Optimization suggestions for best portfolio

**5. Competitive Position:**
- Estimated competitor capability scores (if intel available)
- Our position: Strength/Weakness/Parity on each requirement
- Win probability estimate based on technical capabilities

**6. Go/No-Go Decision Tool:**
- Input: Strategic factors (customer relationship, pricing position, etc.)
- Output: Quantitative go/no-go recommendation
- Sensitivity analysis (what if we fill this gap? what if competitor has this strength?)

## Technical Architecture

### Database Schema

```sql
-- Capability Inventory
CREATE TABLE organization_capabilities (
  id SERIAL PRIMARY KEY,
  capability_type VARCHAR(50), -- technical, domain, certification, etc.
  capability_name VARCHAR(255) NOT NULL,
  proficiency_level VARCHAR(50), -- beginner, intermediate, advanced, expert
  years_of_experience NUMERIC(4,1),
  project_count INTEGER,
  last_used_date DATE,
  evidence_projects INTEGER[], -- Array of project IDs
  certifications JSONB, -- Supporting certifications
  personnel_count INTEGER, -- How many staff have this capability
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Requirement Extraction
CREATE TABLE solicitation_requirements (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(50), -- technical, experience, personnel, qualification
  category VARCHAR(100), -- specific categorization
  importance VARCHAR(20), -- mandatory, desired, nice-to-have
  evaluation_weight NUMERIC(5,2), -- Percentage weight in evaluation
  extracted_by VARCHAR(50), -- AI model version
  reviewed_by INTEGER REFERENCES users(id),
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Capability Matches
CREATE TABLE capability_matches (
  id SERIAL PRIMARY KEY,
  requirement_id INTEGER REFERENCES solicitation_requirements(id),
  capability_id INTEGER REFERENCES organization_capabilities(id),
  match_score NUMERIC(3,2), -- 0.00 to 1.00
  confidence_level NUMERIC(3,2), -- 0.00 to 1.00
  match_type VARCHAR(50), -- direct, close, partial, none
  evidence_projects INTEGER[], -- Supporting project IDs
  gap_analysis TEXT, -- If weak match, what's missing?
  mitigation_recommendations JSONB, -- How to address gap
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Gap Mitigation Plans
CREATE TABLE gap_mitigation_plans (
  id SERIAL PRIMARY KEY,
  requirement_id INTEGER REFERENCES solicitation_requirements(id),
  gap_severity VARCHAR(20), -- critical, significant, minor, non-issue
  mitigation_strategy VARCHAR(50), -- hire, train, team, subcontract, acquire
  description TEXT,
  estimated_cost NUMERIC(12,2),
  estimated_time_days INTEGER,
  feasibility_score NUMERIC(3,2), -- 0.00 to 1.00
  status VARCHAR(50), -- proposed, approved, in-progress, completed, rejected
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Past Performance Recommendations
CREATE TABLE pp_recommendations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  pp_project_id INTEGER REFERENCES past_performances(id),
  requirements_covered INTEGER[], -- Array of requirement IDs
  relevancy_score NUMERIC(3,2),
  cpars_rating NUMERIC(2,1),
  recency_score NUMERIC(3,2),
  scale_match_score NUMERIC(3,2),
  customer_match BOOLEAN,
  recommended_for_inclusion BOOLEAN,
  portfolio_position INTEGER, -- 1st ref, 2nd ref, etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```
POST   /api/capability-matrix/requirements/extract
  - Extract requirements from solicitation document
  - Input: solicitation_document_id
  - Output: Array of extracted requirements

POST   /api/capability-matrix/match/:project_id
  - Run capability matching for all requirements
  - Input: project_id
  - Output: Match results, gap analysis, overall score

GET    /api/capability-matrix/gaps/:project_id
  - Get gap analysis and mitigation recommendations
  - Output: Gaps by severity, mitigation options

POST   /api/capability-matrix/gaps/:id/mitigate
  - Create or update gap mitigation plan
  - Input: strategy, cost, timeline, owner
  - Output: Mitigation plan ID

GET    /api/capability-matrix/past-performance/recommend/:project_id
  - Get recommended past performance portfolio
  - Input: project_id, max_references
  - Output: Optimized portfolio, coverage analysis

GET    /api/capability-matrix/go-no-go/:project_id
  - Get go/no-go recommendation
  - Output: Recommendation, rationale, win probability, conditions
```

## Success Metrics

- **Match Accuracy:** 90%+ accuracy on capability matches (human validation)
- **Time Savings:** Reduce capability assessment from 2-3 days to 2-3 hours
- **Gap Identification:** Identify 95%+ of critical gaps (no surprises in proposals)
- **Win Rate Impact:** 15% higher win rate on opportunities where tool used
- **Go/No-Go Accuracy:** 80%+ accuracy on win probability estimates

## Dependencies

- Past Performance RAG system (for evidence retrieval)
- Document repository (for solicitation ingestion)
- HR/personnel system (for skills and certifications)
- Project management system (for project histories)

## Timeline

**Phase 1 (2-3 months):** Requirement extraction, basic matching
**Phase 2 (2 months):** Gap analysis, mitigation recommendations
**Phase 3 (2 months):** Past performance optimization, dashboard
**Phase 4 (1-2 months):** Go/no-go decision tool, competitive analysis

**Total: 7-9 months**

---

**Document Owner:** Product Team
**Last Updated:** 2025-09-30
**Next Steps:** Integrate with PP RAG system, build extraction engine prototype
