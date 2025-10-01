# Win Themes & Ghosting Engine - Feature Requirements

**Status:** 📋 Planned
**Priority:** High
**Epic:** Competitive Strategy & Proposal Differentiation
**Added:** 2025-09-30

## Overview

An AI-driven competitive analysis and strategy engine that helps develop compelling win themes and effective ghosting strategies based on market research, competitor analysis, and customer intelligence.

## Business Requirements

### Problem Statement
Government proposal win themes and competitive positioning are:
- Often generic and not customer-specific
- Developed without thorough competitive intelligence
- Inconsistently applied across proposal sections
- Difficult to differentiate when competitors have similar capabilities
- Time-consuming to research and develop properly

### Solution Vision
An AI-powered system that:
1. **Researches** the competitive landscape for each solicitation
2. **Analyzes** competitor strengths, weaknesses, and past performance
3. **Identifies** customer hot buttons and evaluation priorities
4. **Generates** compelling, customer-specific win themes
5. **Suggests** effective ghosting strategies without naming competitors
6. **Validates** theme integration across all proposal sections

## Core Features

### 1. Competitive Intelligence Gathering

**Description:** Automated collection and analysis of competitor information from public sources.

**Data Sources:**
- **SAM.gov (System for Award Management):**
  - Past contract awards to competitors
  - Contractor registration data
  - NAICS codes and capability statements
  - Small business certifications

- **USASpending.gov:**
  - Contract values and periods of performance
  - Subcontracting relationships
  - Award trends over time
  - Geographic distribution of work

- **FBO/beta.SAM.gov Archives:**
  - Past proposals/awards on similar RFPs
  - Customer Q&A from past solicitations
  - Amendment histories showing customer priorities

- **GovWin IQ / Deltek (if available):**
  - Win rates by customer/contract type
  - Team compositions
  - Pricing strategies
  - Pipeline intelligence

- **Public Company Filings (for public competitors):**
  - 10-K annual reports
  - Investor presentations
  - Earnings calls transcripts
  - Strategic initiatives and focus areas

- **LinkedIn / Company Websites:**
  - Key personnel and their backgrounds
  - Recent hires (capability expansion signals)
  - Press releases and news
  - Published case studies

- **Customer Website Research:**
  - Strategic plans and mission statements
  - Recent initiatives and priorities
  - Organizational structure changes
  - Published performance metrics

**AI Processing:**
- Natural language processing of unstructured documents
- Entity extraction (companies, people, contracts)
- Sentiment analysis of customer feedback
- Trend identification over time
- Network analysis of teaming relationships

**Output:**
- Competitor profiles with strengths/weaknesses
- Market share analysis for this customer
- Past performance summaries
- Key personnel and their track records
- Pricing intelligence (where available)

### 2. Competitor Strength/Weakness Analysis

**Description:** Detailed SWOT analysis for each identified competitor on this specific opportunity.

**Analysis Framework:**

**Strengths Assessment:**
- Incumbent advantage (if applicable)
- Past performance with this customer
- Technical capabilities and certifications
- Key personnel qualifications
- Contract vehicles and access
- Financial capacity (bonding, etc.)
- Geographic proximity to customer
- Small business status (8(a), SDVOSB, etc.)

**Weaknesses Assessment:**
- Lack of specific experience
- Past performance issues or gaps
- Technical limitations
- Personnel turnover or unavailability
- Financial constraints
- Lack of required clearances
- Geographic distance from work site
- Size mismatches (too large/small)

**AI-Driven Gap Identification:**
- Compare our capabilities vs. competitor capabilities
- Identify areas where we have clear advantages
- Find competitor vulnerabilities to exploit
- Suggest capability gaps we should address (teaming, hiring, etc.)

**Incumbent Analysis (Special Case):**
If competitor is incumbent:
- Analyze current contract performance (CPARS, past performance ratings)
- Identify pain points customer has experienced
- Review transition challenges customer faced when incumbent won
- Assess customer satisfaction indicators
- Predict incumbent's likely proposal strategy

**Example Competitor Profile:**
```
Competitor: Acme Technologies, Inc.
Incumbent: Yes (current contractor since 2020)

Strengths:
• 4-year performance history with customer (2020-2024)
• Deep knowledge of customer's existing systems
• On-site presence with 15 full-time staff
• Past performance rating: Satisfactory (4.2/5.0)
• Small business (8(a) certified) - matches customer's goals

Weaknesses:
• Recent key personnel departures (PM and Tech Lead left in 2023)
• CPARS notes delays in deliverables (Q3 2023, Q1 2024)
• No experience with cloud migration (new RFP requirement)
• Limited AI/ML capabilities (only 1 data scientist on staff)
• Customer dissatisfaction with communication (per market research)

Our Advantages vs. Acme:
✓ Proven cloud migration experience (3 recent projects)
✓ Dedicated AI/ML team of 8 specialists
✓ Stable team with low turnover (avg tenure 6 years)
✓ Superior communication protocols and PM methodology
✓ ISO 9001 quality certification (Acme is not certified)

Ghosting Opportunities:
→ Emphasize transition risk mitigation (incumbent's recent PM turnover)
→ Highlight proven cloud expertise without naming their gap
→ Stress importance of proactive communication and transparency
→ Feature AI/ML innovation as critical to mission success
```

### 3. Customer Hot Button Identification

**Description:** AI analysis of customer priorities, pain points, and evaluation criteria focus areas.

**Analysis Methods:**

**Solicitation Document Analysis:**
- Parse evaluation criteria weights and subfactors
- Identify repeated keywords and phrases
- Analyze language intensity (e.g., "must," "critical," "essential")
- Map requirements to priorities
- Detect unstated preferences from question phrasing

**Historical Pattern Analysis:**
- Review past awards by this customer
- Identify consistency in selection criteria
- Analyze protest decisions (what customer valued)
- Track customer feedback from past proposals

**Stakeholder Research:**
- Identify key decision-makers (CO, COR, technical evaluators)
- Research their backgrounds and priorities
- Analyze their public statements and publications
- Review their recent initiatives and projects

**Customer Strategic Documents:**
- Strategic plans and modernization roadmaps
- Budget justifications and priorities
- Performance metrics and goals
- Risk registers and mitigation priorities

**AI Sentiment Analysis:**
- Analyze customer's language in Q&A responses
- Detect urgency and frustration indicators
- Identify unstated concerns
- Predict likely evaluation focus areas

**Output - Customer Profile:**
```
Customer: Defense Logistics Agency (DLA) - J6 IT Directorate

Top Priorities (Ranked):
1. Cybersecurity & Zero Trust Architecture (30% weight in eval)
   - Recent audit findings = high urgency
   - Explicit requirement for NIST 800-171 compliance
   - CIO published memo prioritizing zero trust (Jan 2024)

2. Cloud Migration & Modernization (25% weight)
   - Legacy system sunsetting in 18 months (hard deadline)
   - Emphasis on "seamless transition" (mentioned 7x in RFP)
   - AWS GovCloud preference indicated in Q&A #42

3. Cost Efficiency & Value (20% weight)
   - Budget pressures noted in Industry Day presentation
   - Preference for Fixed-Price over Cost-Plus
   - Evaluation subfactor: "innovative cost savings approaches"

4. Small Business Participation (15% weight)
   - 40% small business subcontracting goal
   - SDVOSB set-aside preference for task orders
   - Recent poor performance by large primes = skepticism

5. Communication & Transparency (10% weight)
   - Current contractor issues with responsiveness
   - Requirement for bi-weekly status reports
   - Emphasis on "proactive problem escalation"

Key Decision-Makers:
• Jane Smith, Contracting Officer - Risk-averse, values compliance
• John Doe, COR - Technical background, innovator, published on AI/ML
• Sarah Johnson, J6 Director - Mission-focused, impatient with delays

Hot Button Keywords:
"Zero trust," "seamless," "proven," "innovative," "transparent,"
"cost-effective," "risk mitigation," "accelerate," "modernization"
```

### 4. Win Theme Generator

**Description:** AI-generated win themes tailored to customer priorities and our differentiators vs. competitors.

**Win Theme Structure:**
Each win theme should:
- Address a specific customer hot button
- Highlight our unique capability or approach
- Implicitly ghost competitor weaknesses
- Be customer-benefit focused (not we-focused)
- Be memorable and repeatable across proposal

**Win Theme Formula:**
```
[Customer Challenge/Priority] + [Our Unique Solution] + [Customer Benefit] = Win Theme
```

**AI Generation Process:**
1. **Input Analysis:**
   - Customer hot buttons (ranked priorities)
   - Our discriminators vs. competitors
   - Competitor weaknesses to exploit
   - Evaluation criteria and weights

2. **Theme Drafting:**
   - Generate 5-10 candidate win themes
   - Align each theme to evaluation criteria
   - Ensure themes are mutually reinforcing
   - Avoid contradictory or competing themes

3. **Validation:**
   - Check for ghosting effectiveness (addresses competitor weakness without naming)
   - Verify customer benefit clarity
   - Test for memorability and impact
   - Confirm proof points exist (we can substantiate claims)

4. **Refinement:**
   - User feedback and iteration
   - A/B testing with proposal team
   - Integration guidance for each theme

**Example Generated Win Themes:**

**Opportunity:** Cloud migration for logistics system

**Generated Win Themes:**

1. **"Proven Zero-Risk Cloud Migration"**
   - Customer Priority: Risk aversion, seamless transition
   - Our Differentiator: 12 successful migrations, proprietary methodology
   - Ghosting: Incumbent has no cloud experience
   - Proof: Past performance examples, migration playbook
   - Usage: Executive summary, technical approach, transition plan

2. **"Mission Continuity Guaranteed"**
   - Customer Priority: No operational disruptions during transition
   - Our Differentiator: Parallel running period, 24/7 support during cutover
   - Ghosting: Incumbent's past delays and communication issues
   - Proof: SLA commitments, dedicated cutover team
   - Usage: Management approach, risk mitigation, QA plan

3. **"Innovation Without Experimentation"**
   - Customer Priority: Modern tech (AI/ML, automation) but low risk
   - Our Differentiator: Mature AI tools already proven in production
   - Ghosting: Competitors proposing unproven or greenfield solutions
   - Proof: Tool demonstrations, current production metrics
   - Usage: Technical approach, innovation section, past performance

4. **"Small Business, Enterprise Capabilities"**
   - Customer Priority: Small business goals, but need sophistication
   - Our Differentiator: Small business with Fortune 500 quality systems
   - Ghosting: Large primes' overhead, small businesses' limited capacity
   - Proof: ISO certifications, enterprise clients, small business certs
   - Usage: Management approach, corporate experience, small business plan

5. **"Total Cost Certainty"**
   - Customer Priority: Budget constraints, cost predictability
   - Our Differentiator: Fixed-price commitment, cost savings sharing
   - Ghosting: Cost-reimbursement contractors with overruns
   - Proof: Historical cost control metrics, pricing model
   - Usage: Cost volume, value proposition, risk mitigation

### 5. Ghosting Strategy Engine

**Description:** AI-suggested ghosting strategies that highlight competitor weaknesses without naming them.

**Ghosting Principles:**
- **Never name competitors** (unethical and often prohibited)
- **Contrast approaches** (our way vs. "traditional" or "other approaches")
- **Emphasize risk** of competitor weaknesses (without attributing)
- **Proof over claims** (demonstrate don't just assert)
- **Subtlety over obviousness** (evaluators should connect dots themselves)

**Ghosting Techniques:**

**1. Feature Contrast:**
```
Instead of: "Unlike Competitor X, we have cloud experience"
Ghosting: "Our team brings 10+ years of cloud migration experience,
          eliminating the learning curve and transition risks that
          often plague first-time cloud adopters."
```

**2. Risk Highlighting:**
```
Instead of: "Competitor X had delays on their last project"
Ghosting: "Personnel continuity is critical to on-time delivery.
          Our proposed PM and Tech Lead have worked together for
          5 years with zero unplanned departures, ensuring stable
          leadership throughout contract performance."
```

**3. Requirement Emphasis:**
```
Instead of: "Competitor X doesn't have CMMI Level 3"
Ghosting: "The RFP's emphasis on mature processes (Section L.3.2)
          reflects the mission-critical nature of this work. Our
          CMMI Level 3 certification demonstrates proven process
          maturity that mitigates quality and schedule risks."
```

**4. Capability Demonstration:**
```
Instead of: "Competitor X has weak AI capabilities"
Ghosting: "Modern logistics systems require mature AI/ML capabilities,
          not experimental or lab-based approaches. Our AI team has
          8 production systems serving 10M+ transactions daily, with
          proven accuracy rates exceeding 99.7%."
```

**5. Customer Pain Point Resolution:**
```
Instead of: "The incumbent has communication problems"
Ghosting: "Proactive, transparent communication prevents small issues
          from becoming major problems. Our PM methodology includes
          bi-weekly status reports, monthly executive briefings, and
          real-time dashboards accessible 24/7 to government
          stakeholders - ensuring no surprises."
```

**AI Ghosting Generator:**
Input:
- Competitor weakness to exploit
- Related customer hot button
- Our capability/approach to contrast

Output:
- 3-5 ghosting statement options
- Section placement suggestions (where to use)
- Graphics/proof point recommendations
- Tone guidance (subtle vs. emphatic)

**Example:**
```
Input:
Competitor: Incumbent
Weakness: Recent key personnel turnover (PM and Tech Lead departed)
Customer Hot Button: Risk aversion, continuity

Generated Ghosting Options:

Option 1 (Subtle):
"Stable leadership drives project success. Our proposed PM and
Technical Lead have partnered on 4 previous contracts over 7 years,
bringing deep experience working together and proven ability to
navigate challenges as a cohesive team."

Option 2 (Moderate):
"Personnel turnover is a leading cause of project disruption and
knowledge loss. We mitigate this risk through competitive
compensation, career development programs, and team stability
incentives. Our proposed team averages 6.2 years tenure, with our
PM and Technical Lead having worked together since 2017."

Option 3 (Emphatic):
"Mid-contract leadership changes introduce unacceptable risks:
knowledge loss, learning curves, relationship gaps, and schedule
impacts. Our commitment is simple: the team we propose is the team
you get, with contractual commitments to personnel continuity and
mandatory government approval for any key personnel changes."

Recommended: Option 2 (Moderate)
Placement: Management Approach, Section 4.2 (Personnel Continuity)
Graphics: Organizational chart with tenure indicators
Proof: Resumes showing work history together, retention metrics
```

### 6. Theme Integration Validator

**Description:** Automated checking that win themes are consistently applied across all proposal sections.

**Validation Checks:**

**Coverage Analysis:**
- Which sections mention each win theme?
- Are themes distributed appropriately?
- Are any themes under-represented?
- Are themes over-concentrated in one section?

**Consistency Checking:**
- Are themes described consistently across sections?
- Do supporting facts align across all mentions?
- Are graphics reinforcing the same themes?
- Do different authors contradict each other?

**Strength Assessment:**
- Keyword density for theme-related terms
- Proof point coverage (claims backed by evidence)
- Graphics alignment with themes
- Compliance keyword integration with themes

**Output Dashboard:**
```
Win Theme Integration Report - Proposal XYZ

Theme 1: "Proven Zero-Risk Cloud Migration"
├── Coverage: 8 of 12 sections (67%) ✓
├── Primary Sections: Exec Summary, Tech Approach, Past Performance ✓
├── Supporting Evidence: 4 past performance examples cited ✓
├── Graphics: 2 figures (migration methodology, risk mitigation) ✓
├── Consistency: High (94% similarity across mentions) ✓
└── Recommendation: Well integrated, consider adding to cost volume

Theme 2: "Mission Continuity Guaranteed"
├── Coverage: 5 of 12 sections (42%) ⚠️
├── Primary Sections: Mgmt Approach, Transition Plan
├── Supporting Evidence: 2 SLA commitments, 1 case study ⚠️
├── Graphics: 1 figure (transition timeline) ⚠️
├── Consistency: Moderate (76% similarity) ⚠️
└── Recommendation: Strengthen with more proof points, add graphic

Theme 3: "Innovation Without Experimentation"
├── Coverage: 3 of 12 sections (25%) ❌
├── Primary Sections: Tech Approach only
├── Supporting Evidence: Tool demos mentioned but no metrics ❌
├── Graphics: None ❌
├── Consistency: N/A (insufficient mentions)
└── Recommendation: CRITICAL - Expand coverage, add proof, create graphics

Overall Theme Integration Score: 72/100 (Good)
Recommendations:
• Strengthen Theme 3 presence (currently underutilized)
• Add production metrics for AI/ML tools to Theme 3
• Create infographic showing AI tool maturity levels
• Cross-reference all themes in Executive Summary
```

### 7. Competitive Strategy Advisor

**Description:** AI-powered recommendations for proposal strategy based on competitive positioning.

**Strategic Recommendations:**

**Positioning Strategy:**
- Challenger (if not incumbent): Emphasize innovation and fresh perspective
- Incumbent Defense (if we're incumbent): Emphasize continuity and proven performance
- Underdog: Emphasize hunger, agility, and personalized attention
- Favorite: Emphasize reliability and risk mitigation

**Pricing Strategy Hints:**
- If we have cost advantage: Emphasize value and efficiency
- If competitors will lowball: Emphasize quality and "hidden costs" of cheap solutions
- If we're premium priced: Justify with superior capabilities and risk mitigation

**Teaming Strategy:**
- Suggest teaming partners to fill capability gaps
- Identify competitors we could team with vs. compete against
- Recommend small business partners aligned with customer goals

**Protest Risk Assessment:**
- Identify likely protest grounds if we win
- Suggest mitigation strategies in proposal
- Predict competitors most likely to protest

**Example Strategic Advice:**
```
Opportunity: DLA Cloud Migration ($50M, 5-year)

Our Position: Challenger (Acme Technologies is incumbent)

Recommended Strategy: AGGRESSIVE CHALLENGER

Rationale:
• Incumbent has vulnerabilities (turnover, cloud gap, communication issues)
• Customer signals openness to change (cloud emphasis, innovation focus)
• We have clear discriminators (cloud expertise, AI capabilities, stability)
• Price will be competitive (similar size/overhead as incumbent)

Tactical Approach:
1. Lead with innovation and fresh perspective
   - Position incumbent as "legacy mindset"
   - Emphasize our modern, cloud-native approach

2. Amplify incumbent pain points through ghosting
   - Personnel continuity (their turnover vs. our stability)
   - Communication (their issues vs. our proactive approach)
   - Cloud expertise (their gap vs. our proven experience)

3. Mitigate transition risk concerns
   - Customer may fear disruption of replacing incumbent
   - Comprehensive transition plan with parallel running period
   - Emphasize our transition experience (12 successful migrations)

4. Price aggressively but not recklessly
   - Undercut incumbent by 5-8% (enough to notice, not enough to question)
   - Justify savings through efficiency, not staff cuts
   - Offer fixed-price to contrast with incumbent's cost-reimbursement

5. Leverage small business strength
   - We're small business, incumbent is not
   - Customer has 40% SB subcontracting goal
   - Position as "best of both worlds" (SB status + enterprise capabilities)

6. Build coalition with customer stakeholders
   - Technical evaluators will love our AI/ML capabilities
   - Contracting officer will appreciate risk mitigation focus
   - COR will value innovation and proactive communication

Risks:
⚠️ Incumbent familiarity factor (devil you know vs. devil you don't)
   Mitigation: Extensive past performance with similar customers

⚠️ Transition complexity concerns
   Mitigation: Detailed, credible transition plan with parallel operations

⚠️ Protest by incumbent if we win
   Mitigation: Ensure technical superiority is clear and defensible

Success Probability: 65% (moderate-high confidence)
```

## Technical Architecture

### Data Pipeline

```
1. Data Collection (Automated Scrapers)
   ├── SAM.gov API integration
   ├── USASpending.gov data pulls
   ├── Web scraping (LinkedIn, company sites, news)
   └── Manual input (customer meetings, industry days)

2. Data Processing (ETL)
   ├── Entity extraction (companies, people, contracts)
   ├── Relationship mapping (teams, subcontractors, customers)
   ├── Document parsing (RFPs, past awards, financials)
   └── Deduplication and normalization

3. AI Analysis
   ├── NLP for sentiment and priorities
   ├── SWOT generation via LLM
   ├── Win theme drafting
   ├── Ghosting strategy suggestions
   └── Competitive scoring and ranking

4. Presentation Layer
   ├── Competitor dashboards
   ├── Customer profile pages
   ├── Win theme generators
   ├── Integration validators
   └── Strategy advisor chatbot
```

### Database Schema

```sql
-- Competitors
CREATE TABLE competitors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  sam_uei VARCHAR(50) UNIQUE, -- Unique Entity Identifier from SAM.gov
  cage_code VARCHAR(20),
  duns VARCHAR(20),
  company_size VARCHAR(50), -- small, medium, large
  small_business_types JSONB, -- 8(a), SDVOSB, HUBZone, etc.
  website_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  headquarters_location VARCHAR(255),
  employee_count INTEGER,
  revenue_estimate NUMERIC(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Competitor Contracts (from SAM.gov/USASpending)
CREATE TABLE competitor_contracts (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id),
  contract_number VARCHAR(100),
  customer_agency VARCHAR(255),
  customer_office VARCHAR(255),
  award_date DATE,
  value NUMERIC(15,2),
  period_of_performance_start DATE,
  period_of_performance_end DATE,
  naics_code VARCHAR(20),
  psc_code VARCHAR(20), -- Product/Service Code
  contract_type VARCHAR(50), -- FFP, CPFF, T&M, etc.
  description TEXT,
  source VARCHAR(50), -- SAM.gov, USASpending, manual
  created_at TIMESTAMP DEFAULT NOW()
);

-- Competitor SWOT Analysis
CREATE TABLE competitor_swot (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id),
  opportunity_id INTEGER REFERENCES projects(id),
  is_incumbent BOOLEAN DEFAULT FALSE,
  strengths JSONB, -- Array of strength statements
  weaknesses JSONB, -- Array of weakness statements
  opportunities JSONB, -- Array of opportunities
  threats JSONB, -- Array of threats
  overall_threat_level VARCHAR(20), -- low, medium, high, critical
  win_probability_estimate NUMERIC(3,2), -- 0.00 to 1.00
  analysis_date TIMESTAMP DEFAULT NOW(),
  analyzed_by INTEGER REFERENCES users(id)
);

-- Customer Profiles
CREATE TABLE customer_profiles (
  id SERIAL PRIMARY KEY,
  agency_name VARCHAR(255) NOT NULL,
  office_name VARCHAR(255),
  key_personnel JSONB, -- Array of decision-maker objects
  strategic_priorities JSONB, -- Array of priority objects with rankings
  hot_buttons JSONB, -- Array of hot button keywords/phrases
  past_award_patterns JSONB, -- Analysis of historical awards
  budget_constraints TEXT,
  preferred_contract_types JSONB,
  small_business_goals JSONB,
  source_documents JSONB, -- References to analyzed documents
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Win Themes
CREATE TABLE win_themes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  theme_title VARCHAR(255) NOT NULL,
  theme_statement TEXT NOT NULL,
  customer_priority VARCHAR(255), -- Which hot button does this address?
  our_discriminator TEXT, -- What makes us unique?
  competitor_weakness TEXT, -- What competitor gap does this ghost?
  proof_points JSONB, -- Array of evidence/examples
  recommended_sections JSONB, -- Where to use this theme
  graphics_needed JSONB, -- Suggested figures/charts
  status VARCHAR(50), -- draft, approved, in_use
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Ghosting Strategies
CREATE TABLE ghosting_strategies (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  win_theme_id INTEGER REFERENCES win_themes(id),
  target_competitor_id INTEGER REFERENCES competitors(id),
  competitor_weakness TEXT NOT NULL,
  ghosting_statements JSONB, -- Array of ghosting statement options
  intensity_level VARCHAR(20), -- subtle, moderate, emphatic
  section_placement VARCHAR(100),
  proof_required TEXT,
  graphics_suggested JSONB,
  status VARCHAR(50), -- draft, approved, in_use
  created_at TIMESTAMP DEFAULT NOW()
);

-- Theme Integration Tracking
CREATE TABLE theme_integration_tracking (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  win_theme_id INTEGER REFERENCES win_themes(id),
  section_path VARCHAR(255), -- e.g., "3.2.1"
  mention_count INTEGER DEFAULT 0,
  keyword_density NUMERIC(4,2), -- Percentage
  proof_points_cited JSONB, -- Which proof points used
  graphics_used JSONB, -- Which figures reference this theme
  consistency_score NUMERIC(3,2), -- 0.00 to 1.00
  last_analyzed TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```
POST   /api/competitive-intel/competitors/research
  - Trigger automated research on a competitor
  - Input: company_name, sam_uei, research_depth
  - Output: Research job ID, estimated completion time

GET    /api/competitive-intel/competitors/:id/profile
  - Get comprehensive competitor profile
  - Output: Company info, contracts, SWOT, threat level

POST   /api/competitive-intel/opportunities/:id/analyze
  - Run full competitive analysis for an opportunity
  - Input: project_id, known_competitors[]
  - Output: Competitor rankings, threat assessments

GET    /api/competitive-intel/customers/:agency/profile
  - Get customer intelligence profile
  - Output: Hot buttons, priorities, decision-makers, patterns

POST   /api/win-themes/generate
  - AI-generate win themes for an opportunity
  - Input: project_id, customer_priorities[], our_discriminators[]
  - Output: Array of generated win theme options

POST   /api/win-themes/:id/ghosting-strategies
  - Generate ghosting strategies for a win theme
  - Input: theme_id, competitor_weaknesses[], intensity
  - Output: Array of ghosting statement options

GET    /api/win-themes/:project_id/integration-report
  - Validate theme integration across proposal
  - Output: Coverage analysis, consistency scores, recommendations

POST   /api/competitive-intel/strategy-advisor
  - Get AI strategic recommendations
  - Input: project_id, our_position (incumbent/challenger/etc.)
  - Output: Detailed strategic advice, tactics, risk assessment
```

## User Workflows

### Capture Manager Workflow

1. **Opportunity Qualification**
   - Create project/opportunity in system
   - Upload solicitation document
   - Identify known competitors

2. **Competitive Research**
   - Trigger automated competitor research
   - Review generated competitor profiles
   - Add manual intelligence from industry days, etc.

3. **SWOT Development**
   - Review AI-generated SWOT for each competitor
   - Refine and add insider knowledge
   - Rate threat levels (which competitors are biggest threats?)

4. **Customer Analysis**
   - Review AI-generated customer profile
   - Add intelligence from customer meetings
   - Prioritize hot buttons based on conversations

5. **Win Theme Development**
   - Use AI to generate initial win theme options
   - Collaborate with proposal team to refine
   - Approve final themes for proposal integration

6. **Ghosting Strategy**
   - Review AI-suggested ghosting approaches
   - Select intensity level (subtle vs. emphatic)
   - Approve ghosting strategies for use

7. **Strategy Guidance**
   - Consult AI strategy advisor
   - Make go/no-go decision
   - Brief proposal team on competitive strategy

### Proposal Writer Workflow

1. **Theme Familiarization**
   - Review approved win themes for opportunity
   - Understand proof points and supporting evidence
   - Review ghosting strategies for assigned sections

2. **Theme Integration**
   - Weave win themes into prose naturally
   - Use approved ghosting language
   - Cite proof points consistently

3. **Validation**
   - Run theme integration validator
   - Check coverage and consistency scores
   - Adjust based on recommendations

## Success Metrics

### Research Efficiency
- **Time to Competitor Profile:** < 4 hours (vs. 2-3 days manual)
- **Data Completeness:** 90%+ of public information captured
- **Refresh Frequency:** Weekly auto-updates on tracked competitors

### Strategy Quality
- **Win Theme Effectiveness:** Measured by evaluator feedback (post-award)
- **Ghosting Subtlety:** No competitor naming violations (100% compliance)
- **Prediction Accuracy:** Strategy advisor win probability vs. actual (±15%)

### Business Impact
- **Win Rate Improvement:** 20% increase in win rate on competed opportunities
- **Color Review Scores:** Improved scores on competitive positioning sections
- **Proposal Team Confidence:** Survey-measured confidence in competitive strategy

## Dependencies

- Document repository for solicitation and past award storage
- Web scraping infrastructure for public data collection
- SAM.gov API access and credentials
- AI/LLM access for analysis and generation

## Risks and Mitigations

### Risk: Inaccurate competitive intelligence
**Mitigation:** Human review required, confidence scores on AI-generated insights

### Risk: Unethical ghosting (naming competitors)
**Mitigation:** Automated validation, mandatory compliance checking, training

### Risk: Over-reliance on AI strategy advice
**Mitigation:** Present as "advisor" not "decider," human judgment required

### Risk: Competitor intelligence gathering legality
**Mitigation:** Only public sources, legal review of data collection practices

## Timeline

**Phase 1 (3-4 months):** Competitive data collection, basic competitor profiles
**Phase 2 (2-3 months):** SWOT analysis, customer profiles, threat assessment
**Phase 3 (2-3 months):** Win theme generation, ghosting strategies
**Phase 4 (1-2 months):** Theme integration validation, strategy advisor

**Total: 8-12 months**

---

**Document Owner:** Product Team
**Last Updated:** 2025-09-30
**Next Steps:** Legal review of competitive intelligence gathering, UI mockups
