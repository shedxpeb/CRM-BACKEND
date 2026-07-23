import {
  ImportHeaderMap,
  ImportEnumMap,
  ImportConfig,
} from '../../common/services/excel-import.service';
import {
  LeadSource,
  LeadPriority,
  LeadStatus,
  ProjectType,
  StructureType,
  RoofType,
  WallType,
  MaterialPreference,
} from './get-leads.dto';

export const LEAD_HEADER_MAP: ImportHeaderMap = {
  customerName: [
    'customer name',
    'customername',
    'name',
    'contact name',
    'contact',
    'client name',
    'client',
  ],
  companyName: ['company', 'company name', 'companyname', 'organization', 'firm', 'business name'],
  designation: ['designation', 'designation', 'title', 'job title', 'position'],
  website: ['website', 'web', 'url', 'site'],
  mobile: [
    'mobile',
    'mobile no',
    'mobile no.',
    'mobile number',
    'phone',
    'phone number',
    'contact number',
    'contact no',
    'contact no.',
    'telephone',
    'tel',
  ],
  alternateMobile: [
    'alternate mobile',
    'alternate phone',
    'alt mobile',
    'alt phone',
    'secondary mobile',
    'secondary phone',
    'other phone',
    'other mobile',
  ],
  email: ['email', 'email id', 'email address', 'mail', 'e-mail', 'emailid'],
  gstNumber: ['gst', 'gst number', 'gst no', 'gst no.', 'gstnumber', 'gstin'],
  panNumber: ['pan', 'pan number', 'pan no', 'pan no.', 'pannumber', 'pancard'],
  industry: ['industry', 'sector', 'field', 'domain'],
  businessType: ['business type', 'business category', 'company type', 'org type'],
  addressLine1: [
    'address',
    'address 1',
    'address line 1',
    'address line',
    'street',
    'street address',
    'addressline1',
  ],
  addressLine2: ['address 2', 'address line 2', 'addressline2', 'street 2'],
  area: ['area', 'locality', 'region', 'district'],
  city: ['city', 'town', 'district', 'municipality'],
  state: ['state', 'province', 'region'],
  country: ['country', 'nation'],
  pincode: ['pincode', 'pin code', 'postal code', 'zip', 'zip code', 'pin'],
  companySize: ['company size', 'size', 'organization size'],
  annualRevenue: ['annual revenue', 'revenue', 'turnover', 'annual turnover'],
  employeeCount: ['employee count', 'employees', 'headcount', 'team size', 'staff'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
  facebook: ['facebook', 'facebook url', 'fb'],
  instagram: ['instagram', 'instagram url', 'insta'],
  projectTitle: [
    'project title',
    'project name',
    'project',
    'title',
    'requirement',
    'requirement title',
  ],
  projectType: ['project type', 'project category', 'type of project'],
  structureType: ['structure type', 'structure', 'building type', 'construction type'],
  width: ['width', 'building width', 'w'],
  length: ['length', 'building length', 'l', 'depth'],
  height: ['height', 'building height', 'h', 'clear height'],
  baySpacing: ['bay spacing', 'bay', 'spacing', 'bay span'],
  roofType: ['roof type', 'roofing', 'roof'],
  craneRequired: ['crane required', 'crane', 'overhead crane', 'need crane'],
  craneCapacity: ['crane capacity', 'crane load', 'crane tonnage'],
  mezzanine: ['mezzanine', 'mezzanine floor', 'mezzanine required'],
  mezzanineArea: ['mezzanine area', 'mezz area'],
  mezzanineLoad: ['mezzanine load', 'mezz load', 'mezzanine capacity'],
  wallType: ['wall type', 'wall', 'walling', 'wall cladding'],
  insulationRequired: ['insulation required', 'insulation', 'insulation needed'],
  insulationType: ['insulation type', 'insulation kind'],
  insulationThickness: ['insulation thickness', 'insulation mm'],
  materialPreference: ['material preference', 'material', 'material quality', 'preference'],
  siteLocation: ['site location', 'location', 'site'],
  siteAddress: ['site address', 'site addr', 'construction site'],
  mapCoordinates: ['map coordinates', 'coordinates', 'gps', 'latitude', 'location coordinates'],
  soilNotes: ['soil notes', 'soil', 'soil report', 'geotechnical'],
  customerNotes: ['customer notes', 'notes', 'remarks', 'comments', 'feedback', 'customer remarks'],
  specialRequirement: [
    'special requirement',
    'special req',
    'custom requirement',
    'additional requirement',
  ],
  source: ['source', 'lead source', 'how did they find us', 'referral source', 'origin'],
  priority: ['priority', 'urgency', 'importance', 'level'],
  status: ['status', 'lead status', 'stage', 'state'],
  score: ['score', 'lead score', 'rating', 'priority score'],
  assignedTo: [
    'assigned to',
    'assignee',
    'owner',
    'sales rep',
    'sales person',
    'assigned employee',
  ],
  remarks: ['remarks', 'comment', 'internal notes', 'internal remark'],
  nextFollowUpDate: [
    'follow up date',
    'follow-up date',
    'next follow up',
    'next follow-up',
    'followup date',
  ],
};

export const LEAD_ENUM_MAPS: ImportEnumMap = {
  source: {
    website: LeadSource.Website,
    referral: LeadSource.Referral,
    'cold call': LeadSource.ColdCall,
    coldcall: LeadSource.ColdCall,
    email: LeadSource.Email,
    'social media': LeadSource.SocialMedia,
    socialmedia: LeadSource.SocialMedia,
    social: LeadSource.SocialMedia,
    'trade show': LeadSource.TradeShow,
    tradeshow: LeadSource.TradeShow,
    exhibition: LeadSource.TradeShow,
    advertisement: LeadSource.Advertisement,
    ad: LeadSource.Advertisement,
    ads: LeadSource.Advertisement,
    other: LeadSource.Other,
  },
  priority: {
    low: LeadPriority.Low,
    medium: LeadPriority.Medium,
    med: LeadPriority.Medium,
    high: LeadPriority.High,
    urgent: LeadPriority.Urgent,
    critical: LeadPriority.Urgent,
  },
  status: {
    new: LeadStatus.New,
    contacted: LeadStatus.Contacted,
    'design pending': LeadStatus.DesignPending,
    designpending: LeadStatus.DesignPending,
    'boq pending': LeadStatus.BOQPending,
    boqpending: LeadStatus.BOQPending,
    'estimate sent': LeadStatus.EstimateSent,
    estimatesent: LeadStatus.EstimateSent,
    'proposal sent': LeadStatus.ProposalSent,
    proposalsent: LeadStatus.ProposalSent,
    negotiation: LeadStatus.Negotiation,
    approved: LeadStatus.Approved,
    rejected: LeadStatus.Rejected,
    converted: LeadStatus.Converted,
  },
  projectType: {
    factory: ProjectType.Factory,
    warehouse: ProjectType.Warehouse,
    'industrial shed': ProjectType.IndustrialShed,
    industrialshed: ProjectType.IndustrialShed,
    industrial: ProjectType.IndustrialShed,
    commercial: ProjectType.Commercial,
    residential: ProjectType.Residential,
    other: ProjectType.Other,
  },
  structureType: {
    peb: StructureType.PEB,
    'steel structure': StructureType.SteelStructure,
    steelstructure: StructureType.SteelStructure,
    steel: StructureType.SteelStructure,
    hybrid: StructureType.Hybrid,
    other: StructureType.Other,
  },
  roofType: {
    'metal sheet': RoofType.MetalSheet,
    metalsheet: RoofType.MetalSheet,
    metal: RoofType.MetalSheet,
    'deck sheet': RoofType.DeckSheet,
    decksheet: RoofType.DeckSheet,
    'sandwich panel': RoofType.SandwichPanel,
    sandwichpanel: RoofType.SandwichPanel,
    sandwich: RoofType.SandwichPanel,
    other: RoofType.Other,
  },
  wallType: {
    'metal sheet': WallType.MetalSheet,
    metalsheet: WallType.MetalSheet,
    'brick wall': WallType.BrickWall,
    brickwall: WallType.BrickWall,
    brick: WallType.BrickWall,
    'sandwich panel': WallType.SandwichPanel,
    sandwichpanel: WallType.SandwichPanel,
    other: WallType.Other,
  },
  materialPreference: {
    standard: MaterialPreference.Standard,
    premium: MaterialPreference.Premium,
    economy: MaterialPreference.Economy,
    budget: MaterialPreference.Economy,
  },
};

export const LEAD_IMPORT_CONFIG: ImportConfig = {
  headerMap: LEAD_HEADER_MAP,
  requiredFields: ['customerName', 'mobile', 'email'],
  defaults: {
    companyName: undefined,
    projectTitle: 'Imported Project',
    projectType: ProjectType.Factory,
    structureType: StructureType.PEB,
    priority: LeadPriority.Medium,
    source: LeadSource.Other,
    status: LeadStatus.New,
    isConverted: false,
    tags: [],
    attachments: [],
  },
  enumMaps: LEAD_ENUM_MAPS,
  uniqueCheckFields: ['mobile', 'email'],
  transformRow: (row: Record<string, unknown>) => {
    if (!row.companyName && row.customerName) {
      row.companyName = row.customerName;
    }

    if (row.mobile) {
      row.mobile = String(row.mobile).replace(/[\s\-()+\s]/g, '');
    }
    if (row.alternateMobile) {
      row.alternateMobile = String(row.alternateMobile).replace(/[\s\-()+\s]/g, '');
    }

    if (row.score !== undefined && row.score !== '') {
      const num = parseInt(String(row.score), 10);
      row.score = isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
    } else {
      row.score = 0;
    }

    for (const numField of [
      'width',
      'length',
      'height',
      'baySpacing',
      'craneCapacity',
      'mezzanineArea',
      'mezzanineLoad',
      'insulationThickness',
      'annualRevenue',
    ]) {
      if (row[numField] !== undefined && row[numField] !== '') {
        const num = parseFloat(String(row[numField]));
        row[numField] = isNaN(num) ? undefined : num;
      } else {
        row[numField] = undefined;
      }
    }

    if (row.employeeCount !== undefined && row.employeeCount !== '') {
      const num = parseInt(String(row.employeeCount), 10);
      row.employeeCount = isNaN(num) ? undefined : num;
    } else {
      row.employeeCount = undefined;
    }

    const booleanFields = ['craneRequired', 'mezzanine', 'insulationRequired'];
    for (const field of booleanFields) {
      if (row[field] !== undefined && row[field] !== '') {
        const str = String(row[field]).toLowerCase().trim();
        row[field] = ['true', 'yes', '1', 'y'].includes(str);
      } else {
        row[field] = false;
      }
    }

    if (row.assignedTo && typeof row.assignedTo === 'string') {
      row.assignedToName = row.assignedTo;
      delete row.assignedTo;
    }

    return row;
  },
};
