# Fix Edit Project Button - Technical Design

**Document**: Fix Edit Project Button Implementation
**Date**: 2025-09-29
**Version**: 1.0
**Status**: In Progress
**Priority**: P1 - Critical Fix
**Author**: Senior Software Engineer

## Executive Summary

The ProjectCard component is missing the Edit button even though it receives an `onEdit` prop and the Layout component has a full edit modal implementation ready. Users cannot edit project information directly from the project cards.

## Problem Analysis

### Current State
1. **ProjectCard.js**:
   - Receives `onEdit` prop (line 22) but never uses it
   - Only renders View, Team, and Archive buttons
   - No Edit button exists in the quick actions section

2. **Layout.js**:
   - Has complete `handleEditProject` function (line 395)
   - Has full Edit Project Modal implementation (lines 2141-2380)
   - Passes `onEdit={handleEditProject}` to ProjectCard (line 1443)
   - Edit functionality works from the Project View modal

3. **AIWritingThreePanel.js**:
   - Has its own project edit implementation
   - Edit button works correctly there

### Root Cause
The Edit button was never implemented in the ProjectCard component's quick actions section, despite all the infrastructure being in place.

## Solution Design

### Implementation Plan

Add an Edit button to the ProjectCard component between the View and Team buttons (or after View if no Team button).

### Button Specifications
- **Icon**: ✏️
- **Label**: "Edit"
- **Style**: Similar to View button (transparent with border)
- **Color**: Primary color border/text
- **Position**: After View button, before Team button

### Code Changes Required

1. **ProjectCard.js** - Add Edit button after View button:
```javascript
// After View button (around line 455)
<button style={{
  padding: '6px 8px',
  border: `1px solid ${theme.primary}`,
  backgroundColor: 'transparent',
  color: theme.primary,
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '3px'
}}
onClick={(e) => {
  e.stopPropagation();
  if (onEdit) onEdit(project);
}}
onMouseEnter={(e) => {
  e.target.style.backgroundColor = theme.primary;
  e.target.style.color = 'white';
}}
onMouseLeave={(e) => {
  e.target.style.backgroundColor = 'transparent';
  e.target.style.color = theme.primary;
}}
>
  ✏️ Edit
</button>
```

2. **Grid Template Adjustment**:
   - Update the grid template columns to accommodate the Edit button
   - Current: View, Team (optional), Archive (admin only)
   - New: View, Edit, Team (optional), Archive (admin only)

## Testing Checklist

### Functional Tests
- [ ] Edit button appears on all project cards
- [ ] Clicking Edit opens the Edit Project modal
- [ ] Edit modal shows correct project information
- [ ] Save button updates project information
- [ ] Cancel button closes modal without saving
- [ ] Project card reflects updated information after save

### Visual Tests
- [ ] Edit button styling matches design system
- [ ] Hover effects work correctly
- [ ] Button spacing is consistent
- [ ] Grid layout adjusts properly with/without Team and Archive buttons

### Regression Tests
- [ ] View button still works
- [ ] Team button still works (when present)
- [ ] Archive button still works (for admins)
- [ ] Project click navigation still works
- [ ] Three-panel edit still works independently

## User Flow

1. User sees project card with View, Edit, Team, Archive buttons
2. User clicks Edit button
3. Edit Project modal opens with current project data
4. User modifies project information
5. User clicks Save or Cancel
6. Modal closes, changes are reflected (if saved)

## Alternative Considered

**Option**: Replace View button with Edit button
- **Pros**: Fewer buttons, cleaner interface
- **Cons**: Users expect both view and edit capabilities
- **Decision**: Rejected - both actions are commonly needed

## Success Metrics

- Edit button click-through rate > 10%
- Reduced support tickets about "can't edit project"
- Time to edit project < 10 seconds

## Implementation Time

- Development: 30 minutes
- Testing: 30 minutes
- Total: 1 hour

---

**Next Steps**: Implement the Edit button in ProjectCard.js