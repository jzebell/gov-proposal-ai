# Development Backlog - Future Enhancements

**Last Updated:** 2025-09-30
**Status:** Post-Production / Long-term Development

This document tracks features and enhancements that are valuable but not currently prioritized for immediate implementation. These items will be revisited after core production features are complete and stable.

---

## 🔮 Post-Production Features

### #9 - ML Decision Dashboard for AI Choice Visibility
**Priority:** Medium
**Complexity:** High
**Estimated Effort:** 3-4 weeks

**Description:**
Create a comprehensive dashboard that provides visibility into AI decision-making processes, showing how the system selects documents, weighs relevance, and generates responses.

**Features:**
- Document selection rationale visualization
- Relevance scoring heat maps
- Confidence metrics per response
- Performance tracking over time
- Decision tree diagrams
- Token usage analytics

**Dependencies:**
- ML infrastructure must be stable
- Analytics data collection in place
- User feedback system operational

**Business Value:**
- Increases user trust in AI recommendations
- Helps identify areas for model improvement
- Provides transparency for compliance/audit purposes
- Enables data-driven optimization

**Technical Notes:**
- Requires logging infrastructure for AI decisions
- May need significant backend data aggregation
- Consider privacy implications of decision logging

---

### #18 - External Document Integration (SharePoint)
**Priority:** Medium
**Complexity:** High
**Estimated Effort:** 4-6 weeks

**Description:**
Integration with external document management systems, primarily Microsoft SharePoint, to enable seamless access to documents stored outside the nxtProposal system.

**Features:**
- SharePoint API authentication (OAuth 2.0)
- Document search and retrieval
- Link management for external documents
- Bi-directional sync capabilities
- Permission and access control mapping
- Automatic metadata extraction

**Dependencies:**
- SharePoint API access and credentials
- Secure credential storage system
- Network/firewall configuration for API access
- Understanding of customer SharePoint structures

**Business Value:**
- Eliminates need for duplicate document storage
- Reduces manual document copying
- Keeps source of truth in existing systems
- Enterprise-ready integration

**Technical Notes:**
- Requires Microsoft Graph API implementation
- OAuth2 flow for user authentication
- Consider rate limiting and API quotas
- May need webhook support for real-time updates

**Security Considerations:**
- Store credentials securely (HashiCorp Vault, AWS Secrets Manager)
- Implement proper access control mapping
- Audit trail for external document access
- Handle token refresh automatically

**Phases:**
1. **Phase 1:** Read-only SharePoint document access
2. **Phase 2:** Link management and metadata sync
3. **Phase 3:** Bi-directional sync (optional)
4. **Phase 4:** Other systems (Google Drive, Dropbox, Box)

---

## 📋 Items Moved to Backlog

These items were previously on the active todo list but have been deprioritized based on current project needs:

### Related to Active Features
- Advanced ML Dashboard (complement to existing AI features)
- External integrations (once core system is production-stable)

---

## 🔄 Review Schedule

This backlog should be reviewed:
- **Quarterly:** During sprint planning sessions
- **Post-Production:** After core features are deployed and stable
- **On-Demand:** When customer requests align with backlog items
- **Annual:** Strategic planning and roadmap updates

---

## 📊 Prioritization Criteria

Items move from backlog to active development based on:

1. **Customer Demand** - Multiple customer requests or high-value customer request
2. **Strategic Value** - Alignment with long-term product vision
3. **Resource Availability** - Team capacity and expertise available
4. **Technical Readiness** - Dependencies resolved and infrastructure ready
5. **ROI** - Clear business value relative to implementation cost

---

## 🎯 Success Metrics

For items graduating from backlog to active:
- Clear acceptance criteria defined
- Technical design document created
- Resource allocation confirmed
- Timeline and milestones established
- Success metrics identified

---

## 📝 Notes

- Items in backlog are NOT deleted - they represent valuable future enhancements
- Customers may request backlog items - evaluate on case-by-case basis
- Some backlog items may become obsolete as technology evolves - review annually
- New items can be added to backlog at any time via product team

---

**Maintained by:** Senior Software Engineer
**Next Review:** 2026-01-01 (Quarterly)
