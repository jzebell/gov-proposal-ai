# Authentication & Authorization System Specification 🔐

**Date**: September 25, 2025
**Status**: Design Phase - Ready for Implementation
**Priority**: Critical Infrastructure Foundation

---

## 🎯 **SYSTEM OVERVIEW**

**Enterprise-Grade Security Architecture:**
- **OAuth 2.0/OpenID Connect** - Microsoft Azure AD & Google Workspace integration
- **JWT-based sessions** - Secure, stateless authentication
- **Role-Based Access Control (RBAC)** - 7-tier permission system
- **Admin approval workflow** - Controlled user onboarding
- **Comprehensive audit logging** - Configurable security events
- **Development mock system** - Full simulation for testing

---

## 🏗️ **AUTHENTICATION ARCHITECTURE**

### **OAuth 2.0 Integration**
```
Frontend → OAuth Provider (MS/Google) → Backend → JWT Token → Protected Resources
```

**Supported Providers:**
- **Microsoft Azure AD** - Enterprise Office 365 integration
- **Google Workspace** - Gmail/GSuite business accounts
- **Development Mock** - Simulated OAuth for testing

**Security Flow:**
1. User clicks "Sign in with Microsoft/Google"
2. Redirect to OAuth provider authorization
3. Provider returns authorization code
4. Backend exchanges code for access token
5. Backend validates token and creates user session
6. JWT issued with user claims and roles
7. Frontend receives JWT for subsequent requests

### **Session Management**
- **JWT Tokens** - Signed, time-limited, stateless
- **Refresh Token Rotation** - Secure session renewal
- **Session Timeout** - 8 hours (configurable)
- **Multiple Device Support** - Cross-device session management

---

## 👥 **USER MANAGEMENT SYSTEM**

### **Registration Workflow**
```
OAuth Registration → Email Verification → Admin Approval → Account Activation
```

**Process:**
1. **OAuth Sign-in** - User authenticates with provider
2. **Profile Creation** - System creates pending user profile
3. **Email Verification** - Automated verification email sent
4. **Admin Notification** - Admins notified of pending approval
5. **Admin Review** - Admin approves/denies with role assignment
6. **Account Activation** - User notified and granted access

### **User States**
- **Pending** - Registered, awaiting email verification
- **Awaiting Approval** - Verified, awaiting admin approval
- **Active** - Approved and active
- **Suspended** - Temporarily disabled
- **Inactive** - Permanently disabled

---

## 🔐 **ROLE-BASED ACCESS CONTROL (RBAC)**

### **Role Hierarchy**
```
Admin (Level 7) → Proposal Lead (6) → Solutions Architect (5) →
Writer (4) → Business Development (3) → Reviewer (2) → Subject Matter Expert (1)
```

### **Role Definitions & Permissions**

#### **1. Admin (Level 7)**
- **User Management:** Create, modify, delete users; assign roles
- **System Configuration:** All settings, integrations, security
- **Project Management:** All projects, full CRUD operations
- **Document Management:** All documents, system-wide access
- **AI Features:** All models, personas, configuration
- **Analytics:** Full system analytics, audit logs
- **Audit Events:** Configure logging, view all events

#### **2. Proposal Lead (Level 6)**
- **Team Management:** Assign team members to projects
- **Project Management:** Create, manage assigned projects
- **Document Management:** Project documents, team collaboration
- **AI Features:** All writing tools, model selection
- **Analytics:** Project and team performance metrics
- **Workflow:** Approve submissions, manage deadlines

#### **3. Solutions Architect (Level 5)**
- **Technical Leadership:** Solution design, architecture decisions
- **Project Access:** Technical sections of assigned projects
- **Document Management:** Technical documents, specifications
- **AI Features:** Technical writing personas, specialized models
- **Integration:** External systems, API documentation
- **Review:** Technical review and approval authority

#### **4. Writer (Level 4)**
- **Content Creation:** Write and edit assigned sections
- **Document Management:** Project documents (assigned projects)
- **AI Features:** Writing personas, content generation
- **Collaboration:** Comment, suggest, collaborate
- **Templates:** Access writing templates and standards

#### **5. Business Development (Level 3)**
- **Client Engagement:** Customer-facing content
- **Project Access:** Business sections of projects
- **Document Management:** Business documents, presentations
- **AI Features:** Business writing personas
- **Past Performance:** Access relevant case studies

#### **6. Reviewer (Level 2)**
- **Review Authority:** Review assigned content
- **Quality Assurance:** Comment, approve, request changes
- **Document Access:** Read-only access to assigned projects
- **Collaboration:** Provide feedback and suggestions
- **Standards:** Enforce quality and compliance standards

#### **7. Subject Matter Expert (Level 1)**
- **Domain Expertise:** Provide specialized knowledge
- **Document Access:** Read relevant technical sections
- **Consultation:** Provide input on specific topics
- **Review:** Technical accuracy review
- **Knowledge Base:** Contribute to knowledge repository

### **Permission Matrix**

| Resource | Admin | Prop Lead | Sol Arch | Writer | Biz Dev | Reviewer | SME |
|----------|-------|-----------|----------|--------|---------|----------|-----|
| **Users** | CRUD | Read Team | Read Team | Read | Read | Read | Read |
| **Projects** | CRUD | CRUD Own | Read/Edit Tech | Read/Edit Assigned | Read/Edit Biz | Read Assigned | Read Relevant |
| **Documents** | CRUD All | CRUD Team | CRUD Tech | CRUD Assigned | CRUD Biz | Read Assigned | Read Relevant |
| **AI Features** | Full | Full | Technical | Standard | Business | Limited | Consultation |
| **Settings** | Full | Team | None | Personal | Personal | Personal | Personal |
| **Analytics** | Full | Team | None | Personal | Personal | None | None |

---

## 🗄️ **DATABASE SCHEMA**

### **Users Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    oauth_provider VARCHAR(50) NOT NULL, -- 'microsoft', 'google', 'mock'
    oauth_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role_id INTEGER REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, awaiting_approval, active, suspended, inactive
    department VARCHAR(100),
    team VARCHAR(100),
    login_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP
);
```

### **Roles Table**
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- 1-7 hierarchy level
    permissions JSONB, -- Detailed permission object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Sessions Table**
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Audit Log Table**
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50), -- auth, user_mgmt, project, document, ai, system
    resource_type VARCHAR(50), -- user, project, document, setting
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 **IMPLEMENTATION PLAN**

### **Phase 1: Core Authentication (2-3 hours)**
1. **OAuth Integration**
   - Install passport.js with Microsoft/Google strategies
   - Configure OAuth applications in Azure AD/Google Console
   - Implement OAuth callback handling
   - Create JWT token generation/validation

2. **Database Setup**
   - Create auth-related tables
   - Seed initial roles and permissions
   - Set up database indexes for performance

3. **Backend API**
   - Authentication middleware
   - Protected route implementation
   - Session management endpoints
   - User profile endpoints

### **Phase 2: Frontend Integration (1-2 hours)**
4. **Login Interface**
   - OAuth login buttons
   - Loading states and error handling
   - Redirect handling after authentication

5. **Protected Routes**
   - Route guards based on authentication
   - Role-based component rendering
   - Permission checking utilities

### **Phase 3: User Management (2-3 hours)**
6. **Admin Interface**
   - User approval dashboard
   - Role assignment interface
   - User status management

7. **Registration Workflow**
   - Email verification system
   - Admin notification system
   - User onboarding flow

### **Phase 4: RBAC & Security (2-3 hours)**
8. **Permission System**
   - Permission checking middleware
   - Role-based UI components
   - Resource-level access control

9. **Audit Logging**
   - Configurable event logging
   - Log viewing interface for admins
   - Security monitoring

### **Phase 5: Development Tools (1 hour)**
10. **Mock Authentication**
    - Development-only mock OAuth
    - Test user creation
    - Role switching for testing

---

## ⚙️ **CONFIGURATION**

### **Environment Variables**
```env
# OAuth Configuration
MICROSOFT_CLIENT_ID=your_azure_app_id
MICROSOFT_CLIENT_SECRET=your_azure_app_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=30d

# Session Configuration
SESSION_TIMEOUT=28800 # 8 hours in seconds
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION=900 # 15 minutes in seconds

# Development
ENABLE_MOCK_AUTH=true # Only in development
```

### **Audit Event Configuration**
```json
{
  "authentication": {
    "login_success": true,
    "login_failure": true,
    "logout": false,
    "password_reset": true
  },
  "user_management": {
    "user_created": true,
    "user_updated": true,
    "role_changed": true,
    "status_changed": true
  },
  "project_management": {
    "project_created": true,
    "project_deleted": true,
    "team_assigned": true
  },
  "document_management": {
    "document_uploaded": false,
    "document_deleted": true,
    "document_shared": true
  },
  "ai_usage": {
    "content_generated": false,
    "model_changed": false,
    "persona_used": false
  },
  "system_configuration": {
    "settings_changed": true,
    "integration_modified": true
  }
}
```

---

## 🚀 **SECURITY BEST PRACTICES**

### **Implementation Standards**
- **OAuth 2.0 + PKCE** - Prevent authorization code interception
- **Secure Cookie Settings** - HttpOnly, Secure, SameSite
- **CSRF Protection** - Token-based CSRF prevention
- **Rate Limiting** - API endpoint protection
- **Input Validation** - Sanitization and validation middleware
- **Secure Headers** - HSTS, CSP, X-Frame-Options
- **Audit Logging** - Comprehensive security event tracking

### **Production Deployment**
- **HTTPS Only** - Force SSL/TLS encryption
- **Environment Secrets** - Secure secret management
- **Database Security** - Encrypted connections, limited access
- **Session Security** - Secure token storage and rotation
- **Monitoring** - Real-time security event monitoring

---

## 🧪 **TESTING STRATEGY**

### **Development Mock System**
- **Mock OAuth Provider** - Simulated Microsoft/Google authentication
- **Test Users** - Pre-configured users with different roles
- **Permission Testing** - Automated RBAC validation
- **Session Testing** - Token expiration and refresh testing

### **Test Scenarios**
- OAuth authentication flow
- Role-based access control
- Session management and expiration
- Admin approval workflow
- Audit logging functionality
- Security boundary testing

---

**🎯 Ready for immediate implementation with enterprise-grade security, comprehensive RBAC, and development-friendly testing capabilities.**