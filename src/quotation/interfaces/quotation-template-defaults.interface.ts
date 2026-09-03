/**
 * Quotation Template Defaults Interface
 * Defines the structure for fixed template content stored in Organization
 */

export interface QuotationTemplateDefaults {
  // Page 2 - Standard Content
  subject?: string;
  introduction?: string;
  
  // Page 3 - Applicable Codes
  applicableCodes?: string[];
  
  // Page 5 - Primary Structural Members
  primaryStructuralMembers?: string[];
  
  // Page 6 - Secondary Structural Members
  secondaryStructuralMembers?: string[];
  
  // Page 8 - Notes
  notes?: string;
  
  // Page 8 - Special Technical Assumptions
  specialTechnicalAssumptions?: string[];
  
  // Page 8 - Payment Terms
  paymentTerms?: string;
  
  // Page 8 - Bank Details
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    address?: string;
  };
  
  // Page 9 - Exclusion
  exclusions?: string[];
  
  // Page 9 - Delivery Schedule
  deliverySchedule?: string[];
  
  // Page 9 - Other Commercial Terms
  otherCommercialTerms?: string[];
  
  // Page 10 - Cancellations
  cancellations?: string;
  
  // Page 10 - Production Release
  productionRelease?: string;
  
  // Page 10 - Warranty
  warranty?: string;
  
  // Page 10 - Governing Law
  governingLaw?: string;
  
  // Page 10 - Taxes & Duties
  taxesAndDuties?: string;
  
  // Signature
  signature?: {
    name?: string;
    designation?: string;
  };
}

export const DEFAULT_QUOTATION_TEMPLATE: QuotationTemplateDefaults = {
  subject: 'Techno Commercial Offer for Design Supply of PEB Building.',
  introduction: `We Thank you for valued enquiry for Pre engineering building Steel Structure and giving us opportunity to submit a Proposal to your valuable project in a cost-effective manner.

This Proposal to you is based on steels standard design criteria and specifications. However, the overall dimensions and layout are in General accordance with your enquiry or Drawings Given by you.

Kindly note that we have tried our utmost to assure that this proposal meets all your project requirements and specifications. However, in some case we had to make some assumptions, suggest certain deviations and exclude some items that you may have requested.

We hope you will find the same in order, awaiting your kind reply & esteemed order.`,
  
  applicableCodes: [
    'Wind Load application, Serviceability and Load combinations according to MBMA-2012, Design According to AISC-2010.',
    'Seismic: IS 1893:2005 (Part-I), RF:4, I:1, Z-III, Seismic Coefficient: 0.16',
  ],
  
  primaryStructuralMembers: [
    'Built-up Sections',
    'Hot Rolled Beam/Channel',
  ],
  
  secondaryStructuralMembers: [
    'Cold Form Z/C Purlins',
    'Cold Form Eave Strut',
    'Bracing System',
  ],
  
  notes: 'All prices are subject to prevailing steel prices at the time of dispatch.',
  
  specialTechnicalAssumptions: [
    'Crane 10MT EOT Considered in both of the module and Running in Full length.',
    'Crane Data need to be confirmed before Finalised with Crane Vendor.',
    '1 Nos. Cage ladder considered for Roof Access.',
    'Rolling Shutter.',
  ],
  
  paymentTerms: '30 % advance with your confirm Work Order, 30 % against GA drawing approval, 35 % against dispatch of structure from our work shop, 05 % after Handover the Project.\n\nChange orders/revisions will be negotiated separately.',
  
  bankDetails: {
    bankName: 'HDFC BANK',
    accountNumber: '99909725390073',
    ifscCode: 'HDFC0006476',
    address: 'Nikol, Ahmedabad',
  },
  
  exclusions: [
    'Foundation and Civil Work',
    'Erection and Commissioning',
    'Transportation beyond factory gate',
    'Any statutory approvals',
  ],
  
  deliverySchedule: [
    'Delivery period: 4-6 weeks from receipt of confirmed order and advance payment.',
    'Partial deliveries subject to mutual agreement.',
  ],
  
  otherCommercialTerms: [
    'Proposal Validity: 30 days from date of submission.',
    'Variation: Any variation in scope will be charged separately.',
    'Permits: All statutory permits to be obtained by client.',
    'Changes and Revision: Changes after order confirmation will be charged.',
    'Inspection of Product: Inspection at our factory during fabrication.',
    'Erection Drawings: GA drawings will be submitted for approval before fabrication.',
  ],
  
  cancellations: 'Order once placed cannot be cancelled. Cancellation charges will apply as per terms.',
  
  productionRelease: 'Production will commence only after receipt of approved GA drawings and advance payment.',
  
  warranty: 'ONE year warranty against manufacturing defects from date of supply.',
  
  governingLaw: 'This contract shall be governed by the laws of Government of India. All disputes shall be subject to arbitration as per Indian Arbitration and Conciliation Act, with venue at Ahmedabad, Gujarat, India.',
  
  taxesAndDuties: 'All taxes and duties as applicable will be charged extra at actuals.',
  
  signature: {
    name: 'For SHEDX PEB LLP.',
    designation: 'Director',
  },
};
