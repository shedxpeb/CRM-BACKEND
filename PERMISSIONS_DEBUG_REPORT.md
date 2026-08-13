# 403 Forbidden Debug Report - Customer API Endpoints

## Request Flow Analysis

### Guard Execution Order (from app.module.ts)
1. ThrottlerGuard
2. JwtAuthGuard
3. TenantContextGuard
4. RolesGuard
5. OrganizationGuard
6. PermissionsGuard
7. ModuleAccessGuard
8. DataIsolationGuard

### Endpoints Failing
- `GET /api/customer?page=1&pageSize=25` → 403 Forbidden
- `GET /api/customer/stats` → 403 Forbidden

---

## ROOT CAUSE IDENTIFIED

### Issue: ModuleAccessGuard Permission Format Mismatch

**File**: `src/auth/guards/module-access.guard.ts`

**Problem**:
- The `modulePermissionMap` keys were using plural forms (e.g., `customers`, `leads`)
- The `extractModuleKey()` method was normalizing singular URLs to plural (e.g., `customer` → `customers`)
- Permission strings use singular format (e.g., `customer:list`, `lead:read`)
- This caused a mismatch when checking permissions

**Example**:
- URL: `/api/customer` → normalized to `customers`
- Permission map key: `customers`
- Required permissions: `['customer:list', 'customer:read']`
- User permissions: `['customer:list', 'customer:read']`
- Mismatch: Guard checks for `customers.*` but user has `customer.*`

**Fix Applied**:
1. Changed `modulePermissionMap` keys to singular format (matching permission strings)
2. Modified `extractModuleKey()` to normalize plural URLs to singular
3. Fixed `applyModuleRestrictions()` in PermissionInheritanceService to use `:` delimiter instead of `.`

---

## Detailed Guard Analysis

### 1. JwtAuthGuard (src/auth/guards/jwt-auth.guard.ts)
- **Status**: ✅ PASS
- **Lines 12-23**: Checks for `@Public()` decorator, otherwise validates JWT
- **No rejection** - JWT validation working correctly

### 2. TenantContextGuard (src/common/guards/tenant-context.guard.ts)
- **Status**: ✅ PASS
- **Lines 21-49**: Sets tenant context from authenticated user
- **No rejection** - Context setting working correctly

### 3. RolesGuard (src/auth/guards/roles.guard.ts)
- **Status**: ✅ PASS
- **Lines 10-32**: Checks for `@Roles()` decorator
- **No rejection** - No role decorators on customer endpoints

### 4. OrganizationGuard (src/common/guards/organization.guard.ts)
- **Status**: ✅ PASS
- **Lines 10-45**: Validates organization context
- **No rejection** - Organization context present

### 5. PermissionsGuard (src/auth/guards/permissions.guard.ts)
- **Status**: ✅ PASS (with enhanced logging)
- **Lines 88-175**: Checks `@RequirePermissions()` decorator
- **Required permissions**:
  - `GET /api/customer` → `customer:list`
  - `GET /api/customer/stats` → `customer:read`
- **Default permissions** (lines 15-79):
  - ADMIN: includes `customer:list`, `customer:read`
  - EMPLOYEE: includes `customer:list`, `customer:read`
- **Enhancement**: Added debug logging to track permission checks

### 6. ModuleAccessGuard (src/auth/guards/module-access.guard.ts) ⚠️
- **Status**: ⚠️ FIXED
- **Lines 116-212**: Checks module-level access and permissions
- **Issue**: Permission format mismatch (see ROOT CAUSE above)
- **Fix Applied**:
  - Lines 26-108: Changed module keys from plural to singular
  - Lines 223-255: Updated `extractModuleKey()` to normalize to singular
  - Lines 194-210: Added detailed logging for permission checks

### 7. DataIsolationGuard (src/common/guards/data-isolation.guard.ts)
- **Status**: ✅ PASS
- **Lines 30-79**: Validates resource ownership
- **Note**: Only applies to requests with resource IDs
- List endpoints (`/api/customer`, `/api/customer/stats`) have no ID, so this guard passes

---

## Permission Mappings Verified

### Customer Permissions
- `customer:list` - List customers (line 20 in controller)
- `customer:read` - Read customer details (line 32, 40, 88, 98, 107 in controller)
- `customer:create` - Create customer (line 118, 130 in controller)
- `customer:update` - Update customer (line 143, 172 in controller)
- `customer:delete` - Delete customer (line 160, 185 in controller)
- `customer:restore` - Restore deleted customer (line 80 in controller)

### Note on `customer:stats`
- The `/stats` endpoint uses `customer:read` permission (line 32)
- This is correct - stats is a read operation
- No separate `customer:stats` permission needed

---

## Files Modified

### 1. src/auth/guards/module-access.guard.ts
- **Lines 26-108**: Changed module permission map keys from plural to singular
- **Lines 223-255**: Updated `extractModuleKey()` to normalize plural URLs to singular
- **Lines 194-210**: Added detailed logging for module access checks

### 2. src/permissions/permission-inheritance.service.ts
- **Lines 389-411**: Fixed `applyModuleRestrictions()` to use `:` delimiter instead of `.`

### 3. src/auth/guards/permissions.guard.ts
- **Lines 1-5**: Added Logger import
- **Lines 84-87**: Added Logger instance
- **Lines 259-276**: Added debug logging for permission checks

---

## Testing Recommendations

1. Test `GET /api/customer?page=1&pageSize=25` with ADMIN role
2. Test `GET /api/customer/stats` with ADMIN role
3. Test with EMPLOYEE role to verify default permissions
4. Check logs for detailed permission check output
5. Verify module access guard logs show correct module key (`customer` not `customers`)

---

## Additional Notes

### Guard Order Importance
The guard order is critical:
- JwtAuthGuard must run first to authenticate user
- TenantContextGuard must run before database queries
- PermissionsGuard checks endpoint-specific permissions
- ModuleAccessGuard checks module-level permissions
- DataIsolationGuard validates resource ownership

### Permission Caching
- PermissionInheritanceService caches permissions for 5 minutes
- Cache is invalidated when roles/permissions change
- Users may need to re-login after permission changes

### Module Enablement
- ModuleAccessGuard also checks if module is enabled for organization
- Ensure `customer` module is enabled in `organizationModule` table
- Module key in database should be `customer` (singular)
