-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('New', 'Contacted', 'DesignPending', 'BOQPending', 'EstimateSent', 'ProposalSent', 'Negotiation', 'Approved', 'Rejected', 'Converted');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectType" AS ENUM ('Factory', 'Warehouse', 'IndustrialShed', 'Commercial', 'Residential', 'ColdStorage', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StructureType" AS ENUM ('PEB', 'SteelStructure', 'Hybrid', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RoofType" AS ENUM ('MetalSheet', 'DeckSheet', 'SandwichPanel', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WallType" AS ENUM ('MetalSheet', 'BrickWall', 'SandwichPanel', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MaterialPreference" AS ENUM ('Standard', 'Premium', 'Economy');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM ('Website', 'Referral', 'ColdCall', 'Email', 'SocialMedia', 'TradeShow', 'Advertisement', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CustomerStatus" AS ENUM ('Active', 'Inactive', 'Prospect', 'Converted', 'Churned', 'Archived');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Industry" AS ENUM ('Construction', 'Manufacturing', 'Technology', 'Healthcare', 'Hospitality', 'Retail', 'Education', 'Finance', 'RealEstate', 'Infrastructure', 'Energy', 'Mining', 'Agriculture', 'Transportation', 'Logistics', 'Commercial', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BusinessType" AS ENUM ('SoleProprietorship', 'Partnership', 'PrivateLimited', 'PublicLimited', 'LLP', 'Government', 'NonProfit', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'EMPLOYEE', 'ADMIN');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrganizationType" AS ENUM ('SYSTEM', 'COMPANY');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('Active', 'Inactive', 'Suspended');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'FORGOT_PASSWORD', 'EMAIL_VERIFICATION', 'CHANGE_EMAIL', 'TWO_FACTOR', 'ORGANIZATION_INVITE');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectStage" AS ENUM ('Design', 'BOQ', 'Procurement', 'Fabrication', 'Dispatch', 'Installation', 'Handover');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectTaskStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Overdue');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Delayed');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectActivityType" AS ENUM ('project_created', 'project_updated', 'design_started', 'design_completed', 'design_uploaded', 'boq_created', 'boq_updated', 'procurement_started', 'material_reserved', 'purchase_request_created', 'fabrication_started', 'fabrication_completed', 'dispatch_started', 'dispatch_completed', 'installation_started', 'installation_completed', 'milestone_completed', 'team_assigned', 'task_assigned', 'status_changed', 'stage_changed', 'document_uploaded', 'note_added', 'payment_received', 'project_completed', 'handover_completed');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('Draft', 'PendingApproval', 'Approved', 'Rejected', 'Sent', 'PartiallyReceived', 'FullyReceived', 'Cancelled', 'Closed');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('Pending', 'InProgress', 'Blocked', 'Review', 'Completed', 'Verified', 'Rejected', 'Closed', 'Cancelled', 'Reopened');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TaskCategory" AS ENUM ('General', 'Office', 'FieldWork', 'Maintenance', 'Installation', 'Inspection', 'Documentation', 'Meeting', 'Training', 'Other');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LinkedModule" AS ENUM ('Leads', 'Customers', 'Projects', 'Estimates', 'Proposals', 'Quotations', 'Invoices', 'Inventory', 'Purchases', 'Finance', 'Documents', 'General');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SalaryAdjustmentType" AS ENUM ('Credit', 'Deduction', 'Advance', 'Bonus', 'Penalty');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SalaryAdjustmentStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Processed');
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "website" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'Active',
    "maxUsers" INTEGER NOT NULL DEFAULT 25,
    "maxStorageGb" INTEGER NOT NULL DEFAULT 10,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "settings" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "organizationType" "OrganizationType" NOT NULL DEFAULT 'COMPANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatar" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "mobile" TEXT,
    "name" TEXT,
    "organizationId" TEXT,
    "passwordHistory" JSONB,
    "passwordVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idleExpiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "isRememberMe" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenHash" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "OtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "maxResends" INTEGER NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "email" TEXT NOT NULL,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "industry" "Industry",
    "businessType" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT,
    "assignedEmployee" TEXT,
    "assignedEmployeeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Website',
    "status" "CustomerStatus" NOT NULL DEFAULT 'Prospect',
    "notes" TEXT,
    "attachments" TEXT[],
    "customerSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "convertedFromLeadId" TEXT,
    "createdById" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "customFields" JSONB,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" SERIAL NOT NULL,
    "projectCode" TEXT,
    "projectName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "leadId" TEXT,
    "projectType" TEXT NOT NULL,
    "value" DECIMAL(14,2),
    "budget" DECIMAL(14,2),
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" "ProjectPriority" NOT NULL,
    "projectManager" TEXT,
    "projectManagerId" TEXT,
    "structureType" TEXT NOT NULL,
    "width" DECIMAL(12,3),
    "length" DECIMAL(12,3),
    "height" DECIMAL(12,3),
    "baySpacing" DECIMAL(12,3),
    "roofType" TEXT NOT NULL,
    "craneSystem" TEXT NOT NULL,
    "mezzanine" BOOLEAN NOT NULL DEFAULT false,
    "wallType" TEXT NOT NULL,
    "insulation" BOOLEAN NOT NULL DEFAULT false,
    "coveredArea" DECIMAL(12,3),
    "totalWeight" DECIMAL(12,3),
    "status" TEXT NOT NULL DEFAULT 'Lead',
    "stage" "ProjectStage",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "designProgress" INTEGER NOT NULL DEFAULT 0,
    "procurementProgress" INTEGER NOT NULL DEFAULT 0,
    "fabricationProgress" INTEGER NOT NULL DEFAULT 0,
    "installationProgress" INTEGER NOT NULL DEFAULT 0,
    "healthStatus" TEXT NOT NULL DEFAULT 'Healthy',
    "timelineHealth" TEXT NOT NULL DEFAULT 'Healthy',
    "budgetHealth" TEXT NOT NULL DEFAULT 'Healthy',
    "materialHealth" TEXT NOT NULL DEFAULT 'Healthy',
    "resourceHealth" TEXT NOT NULL DEFAULT 'Healthy',
    "materialCost" DECIMAL(14,2),
    "procurementCost" DECIMAL(14,2),
    "fabricationCost" DECIMAL(14,2),
    "installationCost" DECIMAL(14,2),
    "profitMargin" DECIMAL(5,2),
    "boqId" TEXT,
    "designId" TEXT,
    "estimateId" TEXT,
    "proposalId" TEXT,
    "quotationId" TEXT,
    "invoiceIds" TEXT[],
    "inventoryReservationIds" TEXT[],
    "reservedItems" TEXT[],
    "consumedItems" TEXT[],
    "customFields" JSONB,
    "createdById" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'Pending',
    "delay" INTEGER,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ProjectTeamMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workload" INTEGER,

    CONSTRAINT "ProjectTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ProjectActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT NOT NULL,
    "assignedToName" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "ProjectPriority" NOT NULL,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'Pending',
    "dependencies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT,
    "projectTitle" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "structureType" "StructureType" NOT NULL,
    "source" "LeadSource" NOT NULL,
    "priority" "LeadPriority" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'New',
    "lastFollowUp" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "leadNumber" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "alternateMobile" TEXT,
    "assignedTo" TEXT,
    "attachments" TEXT[],
    "baySpacing" DECIMAL(12,3),
    "convertedDate" TIMESTAMP(3),
    "craneCapacity" DECIMAL(12,3),
    "craneRequired" BOOLEAN DEFAULT false,
    "createdBy" TEXT,
    "customFields" JSONB,
    "customerId" TEXT,
    "customerNotes" TEXT,
    "gstNumber" TEXT,
    "height" DECIMAL(12,3),
    "insulationRequired" BOOLEAN DEFAULT false,
    "insulationThickness" DECIMAL(12,3),
    "insulationType" TEXT,
    "length" DECIMAL(12,3),
    "mapCoordinates" TEXT,
    "mezzanine" BOOLEAN DEFAULT false,
    "mezzanineArea" DECIMAL(12,3),
    "mezzanineLoad" DECIMAL(12,3),
    "pincode" TEXT,
    "score" INTEGER,
    "siteAddress" TEXT,
    "siteLocation" TEXT,
    "soilNotes" TEXT,
    "specialRequirement" TEXT,
    "state" TEXT,
    "updatedBy" TEXT,
    "width" DECIMAL(12,3),
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "annualRevenue" DECIMAL(14,2),
    "area" TEXT,
    "businessType" "BusinessType",
    "companyLogo" TEXT,
    "companySize" TEXT,
    "country" TEXT DEFAULT 'India',
    "designation" TEXT,
    "employeeCount" INTEGER,
    "facebook" TEXT,
    "industry" "Industry",
    "instagram" TEXT,
    "linkedin" TEXT,
    "organizationId" TEXT NOT NULL,
    "panNumber" TEXT,
    "profileImage" TEXT,
    "tags" TEXT[],
    "website" TEXT,
    "materialPreference" "MaterialPreference",
    "roofType" "RoofType",
    "wallType" "WallType",

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "StatusPipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT,
    "color" TEXT,
    "allowedTransitions" TEXT[],
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "StatusHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "requestedById" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "comment" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "BusinessEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "EventRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "condition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "NumberSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ItemMaster" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemNumber" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "itemTypeId" TEXT,
    "brand" TEXT,
    "grade" TEXT,
    "specification" TEXT,
    "hsnCode" TEXT,
    "unit" TEXT NOT NULL,
    "weight" DECIMAL(12,3),
    "defaultRate" DECIMAL(14,2),
    "gstRate" DECIMAL(5,2),
    "taxType" TEXT,
    "technicalDescription" TEXT,
    "datasheetUrl" TEXT,
    "productImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "tags" TEXT[],
    "manufacturer" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "standardDimensions" JSONB,
    "currency" TEXT DEFAULT 'INR',
    "images" TEXT[],
    "preferredSupplierId" TEXT,
    "preferredSupplier" TEXT,
    "inventoryItemId" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "itemTypeClass" TEXT,
    "materialGrade" TEXT,
    "isStructural" BOOLEAN NOT NULL DEFAULT false,
    "isCladding" BOOLEAN NOT NULL DEFAULT false,
    "isAccessory" BOOLEAN NOT NULL DEFAULT false,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "thickness" DECIMAL(12,3),
    "length" DECIMAL(12,3),
    "width" DECIMAL(12,3),
    "customFields" JSONB,
    "createdById" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "ItemMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ItemVariant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemMasterId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "variantCode" TEXT NOT NULL,
    "specifications" TEXT,
    "standardWeight" DECIMAL(12,3),
    "dimensions" JSONB,
    "defaultRate" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ItemBundle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bundleCode" TEXT NOT NULL,
    "bundleName" TEXT NOT NULL,
    "description" TEXT,
    "bundleRate" DECIMAL(14,2),
    "discountPercentage" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "ItemBundleItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bundleId" TEXT,
    "itemMasterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "rate" DECIMAL(14,2),

    CONSTRAINT "ItemBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Warehouse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "manager" TEXT,
    "contactNumber" TEXT,
    "capacity" DECIMAL(12,3),
    "currentOccupancy" DECIMAL(12,3) DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "suppliedMaterials" TEXT[],
    "leadTime" INTEGER,
    "rating" DECIMAL(5,2),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "InventoryCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemNumber" SERIAL NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemMasterId" TEXT,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reservedStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "issuedStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "safetyStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "purchaseRate" DECIMAL(14,2),
    "totalValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "warehouseId" TEXT,
    "warehouseName" TEXT,
    "binLocation" TEXT,
    "reorderQuantity" DECIMAL(12,3),
    "incomingStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "outgoingStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "category" TEXT,
    "brand" TEXT,
    "itemTypeClass" TEXT,
    "status" TEXT NOT NULL DEFAULT 'In Stock',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customFields" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "supplierId" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "movementNumber" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "warehouseId" TEXT,
    "warehouseName" TEXT,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "referenceNumber" TEXT,
    "referenceType" TEXT,
    "performedBy" TEXT NOT NULL,
    "remarks" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorNumber" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT DEFAULT 'India',
    "bankDetails" JSONB,
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL(14,2),
    "creditDays" INTEGER,
    "outstanding" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "attachments" TEXT[],
    "customFields" JSONB,
    "createdById" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poNumberInt" SERIAL NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT,
    "warehouseId" TEXT,
    "warehouseName" TEXT,
    "paymentTerms" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'Draft',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "revisionNote" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountType" TEXT DEFAULT 'Amount',
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "packingCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shippingCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "internalNotes" TEXT,
    "approvedById" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "sentToVendor" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfUrl" TEXT,
    "customFields" JSONB,
    "createdById" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemMasterId" TEXT,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DECIMAL(14,2) NOT NULL,
    "gstRate" DECIMAL(5,2),
    "gstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountType" TEXT DEFAULT 'Amount',
    "total" DECIMAL(14,2) NOT NULL,
    "hsnCode" TEXT,
    "receivedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "pendingQuantity" DECIMAL(12,3),
    "receivedDate" TIMESTAMP(3),
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "PurchaseOrderTimeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "performedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "assignedUserName" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'Pending',
    "priority" "TaskPriority" NOT NULL DEFAULT 'Medium',
    "category" "TaskCategory",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "estimatedHours" DOUBLE PRECISION,
    "timeSpent" DOUBLE PRECISION,
    "linkedModule" "LinkedModule",
    "linkedRecordId" TEXT,
    "linkedRecordName" TEXT,
    "projectId" TEXT,
    "leadId" TEXT,
    "customerId" TEXT,
    "documentId" TEXT,
    "incentiveValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaymentEditable" BOOLEAN NOT NULL DEFAULT false,
    "completionNotes" TEXT,
    "completionProof" JSONB,
    "beforeImages" TEXT[],
    "afterImages" TEXT[],
    "verifiedBy" TEXT,
    "verifiedByName" TEXT,
    "verificationNotes" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "tags" TEXT[],
    "createdById_field" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "TaskChecklist" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Depends On',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "TaskActivityLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByName" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE  IF NOT EXISTS "SalaryAdjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "type" "SalaryAdjustmentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "referenceName" TEXT,
    "status" "SalaryAdjustmentStatus" NOT NULL DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalaryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_email_key" ON "Organization"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Organization_email_idx" ON "Organization"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Organization_isDeleted_idx" ON "Organization"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_isRevoked_idx" ON "Session"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_idx" ON "LoginAttempt"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_email_purpose_consumedAt_idx" ON "OtpChallenge"("email", "purpose", "consumedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Role_organizationId_idx" ON "Role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Role_organizationId_name_key" ON "Role"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_customerId_key" ON "Customer"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_leadId_idx" ON "Customer"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_mobile_idx" ON "Customer"("mobile");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_companyName_idx" ON "Customer"("companyName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_isDeleted_idx" ON "Customer"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_organizationId_status_idx" ON "Customer"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Project_projectId_key" ON "Project"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_priority_idx" ON "Project"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_customerName_idx" ON "Project"("customerName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_projectManagerId_idx" ON "Project"("projectManagerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_isDeleted_idx" ON "Project"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_projectCode_idx" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_organizationId_status_idx" ON "Project"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTeamMember_projectId_idx" ON "ProjectTeamMember"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTeamMember_employeeId_idx" ON "ProjectTeamMember"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectActivity_projectId_idx" ON "ProjectActivity"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectActivity_projectId_performedAt_idx" ON "ProjectActivity"("projectId", "performedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_status_idx" ON "ProjectTask"("projectId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTask_assignedTo_idx" ON "ProjectTask"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_nextFollowUpDate_idx" ON "Lead"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_companyName_idx" ON "Lead"("companyName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_createdById_idx" ON "Lead"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_isDeleted_idx" ON "Lead"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusPipeline_organizationId_entityType_order_idx" ON "StatusPipeline"("organizationId", "entityType", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusPipeline_organizationId_entityType_idx" ON "StatusPipeline"("organizationId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StatusPipeline_organizationId_entityType_status_key" ON "StatusPipeline"("organizationId", "entityType", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusHistory_entityType_entityId_changedAt_idx" ON "StatusHistory"("entityType", "entityId", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusHistory_entityType_entityId_idx" ON "StatusHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusHistory_organizationId_entityType_changedAt_idx" ON "StatusHistory"("organizationId", "entityType", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_entityType_entityId_createdAt_idx" ON "Comment"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attachment_entityType_entityId_createdAt_idx" ON "Attachment"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApprovalRequest_entityType_entityId_level_idx" ON "ApprovalRequest"("entityType", "entityId", "level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApprovalRequest_approverId_status_idx" ON "ApprovalRequest"("approverId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApprovalRequest_organizationId_idx" ON "ApprovalRequest"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessEvent_organizationId_entityType_entityId_createdAt_idx" ON "BusinessEvent"("organizationId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessEvent_organizationId_entityType_eventType_idx" ON "BusinessEvent"("organizationId", "entityType", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessEvent_entityType_entityId_idx" ON "BusinessEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventRule_organizationId_entityType_isActive_idx" ON "EventRule"("organizationId", "entityType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventRule_organizationId_entityType_eventType_fromStatus_key" ON "EventRule"("organizationId", "entityType", "eventType", "fromStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NumberSequence_organizationId_idx" ON "NumberSequence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NumberSequence_organizationId_entityName_key" ON "NumberSequence"("organizationId", "entityName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ItemMaster_itemNumber_key" ON "ItemMaster"("itemNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemMaster_organizationId_idx" ON "ItemMaster"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemMaster_organizationId_status_idx" ON "ItemMaster"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemMaster_organizationId_category_idx" ON "ItemMaster"("organizationId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemMaster_itemCode_idx" ON "ItemMaster"("itemCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemMaster_isDeleted_idx" ON "ItemMaster"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ItemMaster_organizationId_sku_key" ON "ItemMaster"("organizationId", "sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemVariant_itemMasterId_idx" ON "ItemVariant"("itemMasterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemVariant_organizationId_idx" ON "ItemVariant"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemBundle_organizationId_idx" ON "ItemBundle"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemBundle_isDeleted_idx" ON "ItemBundle"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemBundleItem_bundleId_idx" ON "ItemBundleItem"("bundleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemBundleItem_itemMasterId_idx" ON "ItemBundleItem"("itemMasterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Warehouse_organizationId_idx" ON "Warehouse"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Warehouse_isDeleted_idx" ON "Warehouse"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_organizationId_warehouseCode_key" ON "Warehouse"("organizationId", "warehouseCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Supplier_organizationId_idx" ON "Supplier"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Supplier_isDeleted_idx" ON "Supplier"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryCategory_organizationId_idx" ON "InventoryCategory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_itemNumber_key" ON "InventoryItem"("itemNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_idx" ON "InventoryItem"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_status_idx" ON "InventoryItem"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_itemCode_idx" ON "InventoryItem"("itemCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_itemMasterId_idx" ON "InventoryItem"("itemMasterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_warehouseId_idx" ON "InventoryItem"("warehouseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_isDeleted_idx" ON "InventoryItem"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_organizationId_itemCode_key" ON "InventoryItem"("organizationId", "itemCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StockMovement_organizationId_idx" ON "StockMovement"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StockMovement_inventoryItemId_idx" ON "StockMovement"("inventoryItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StockMovement_date_idx" ON "StockMovement"("date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_vendorNumber_key" ON "Vendor"("vendorNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vendor_isDeleted_idx" ON "Vendor"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumberInt_key" ON "PurchaseOrder"("poNumberInt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_organizationId_idx" ON "PurchaseOrder"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_isDeleted_idx" ON "PurchaseOrder"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_organizationId_status_idx" ON "PurchaseOrder"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_organizationId_isDeleted_idx" ON "PurchaseOrder"("organizationId", "isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_itemMasterId_idx" ON "PurchaseOrderItem"("itemMasterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_organizationId_idx" ON "PurchaseOrderItem"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderTimeline_purchaseOrderId_idx" ON "PurchaseOrderTimeline"("purchaseOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderTimeline_organizationId_idx" ON "PurchaseOrderTimeline"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderTimeline_createdAt_idx" ON "PurchaseOrderTimeline"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Task_taskId_key" ON "Task"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_organizationId_status_idx" ON "Task"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_organizationId_priority_idx" ON "Task"("organizationId", "priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_assignedUserId_idx" ON "Task"("assignedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_isDeleted_idx" ON "Task"("isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_organizationId_isDeleted_idx" ON "Task"("organizationId", "isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskChecklist_taskId_idx" ON "TaskChecklist"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskActivityLog_taskId_idx" ON "TaskActivityLog"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskActivityLog_taskId_createdAt_idx" ON "TaskActivityLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryAdjustment_organizationId_idx" ON "SalaryAdjustment"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryAdjustment_organizationId_employeeId_idx" ON "SalaryAdjustment"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryAdjustment_organizationId_status_idx" ON "SalaryAdjustment"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryAdjustment_employeeId_idx" ON "SalaryAdjustment"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryAdjustment_isDeleted_idx" ON "SalaryAdjustment"("isDeleted");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemMaster" ADD CONSTRAINT "ItemMaster_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemVariant" ADD CONSTRAINT "ItemVariant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemVariant" ADD CONSTRAINT "ItemVariant_itemMasterId_fkey" FOREIGN KEY ("itemMasterId") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemBundle" ADD CONSTRAINT "ItemBundle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemBundleItem" ADD CONSTRAINT "ItemBundleItem_itemMasterId_fkey" FOREIGN KEY ("itemMasterId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ItemBundleItem" ADD CONSTRAINT "ItemBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ItemBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemMasterId_fkey" FOREIGN KEY ("itemMasterId") REFERENCES "ItemMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PurchaseOrderTimeline" ADD CONSTRAINT "PurchaseOrderTimeline_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskChecklist" ADD CONSTRAINT "TaskChecklist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SalaryAdjustment" ADD CONSTRAINT "SalaryAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

