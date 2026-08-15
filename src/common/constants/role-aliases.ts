/** Map JWT UserRole enum values to Role.name records stored in DB */
export const ROLE_NAME_ALIASES: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'Super Admin', 'SuperAdmin'],
  OWNER: ['OWNER', 'Owner', 'COMPANY_OWNER', 'Company Owner'],
  ADMIN: ['ADMIN', 'Admin'],
  EMPLOYEE: ['EMPLOYEE', 'Employee'],
  SALES_MANAGER: ['SALES_MANAGER', 'Sales Manager', 'SalesManager'],
  SALES_EXECUTIVE: ['SALES_EXECUTIVE', 'Sales Executive', 'SalesExecutive'],
  PROJECT_MANAGER: ['PROJECT_MANAGER', 'Project Manager', 'ProjectManager'],
  PURCHASE_MANAGER: ['PURCHASE_MANAGER', 'Purchase Manager', 'PurchaseManager'],
  INVENTORY_MANAGER: ['INVENTORY_MANAGER', 'Inventory Manager', 'InventoryManager'],
  ACCOUNTANT: ['ACCOUNTANT', 'Accountant'],
  VIEW_ONLY: ['VIEW_ONLY', 'View Only', 'ViewOnly'],
};
