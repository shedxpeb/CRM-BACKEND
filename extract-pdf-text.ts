import * as fs from 'fs';

async function extractPdfText() {
  try {
    console.log('=== PDF TEXT EXTRACTION ===');
    
    const pdfPath = 'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\QUO000002-final.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    
    // Extract readable text from PDF (basic extraction)
    // PDF text is compressed, but we can look for visible strings
    const pdfText = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 100000));
    
    // Look for common text patterns in the PDF
    console.log('\n=== SEARCHING FOR KEY DATA ===');
    
    const keywords = [
      'shx-02-001',
      'Vikas Gondaliya',
      'PEB CRM Admin',
      'QUO000002',
      'Building Specification',
      'Design Code',
      'Design Load',
      'Mezzanine',
      'Crane',
      'Material',
      'Contract Price',
      'Bank Details',
      'Page 1 of',
      'Page 2 of',
      'Page 3 of',
      'Page 10 of',
      '[object Object]',
      'undefined',
      'NaN',
    ];
    
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = pdfText.match(regex);
      if (matches) {
        console.log(`✓ Found "${keyword}": ${matches.length} times`);
      } else {
        console.log(`✗ Missing "${keyword}"`);
      }
    }
    
    // Look for page footer patterns
    console.log('\n=== PAGE FOOTER ANALYSIS ===');
    const pageFooterMatches = pdfText.match(/Page \d+ of \d+/g);
    if (pageFooterMatches) {
      console.log('Page footers found:', pageFooterMatches);
    }
    
    // Look for section headers
    console.log('\n=== SECTION HEADERS ===');
    const sectionMatches = pdfText.match(/[A-Z][A-Z\s]{5,}/g);
    if (sectionMatches) {
      const uniqueSections = [...new Set(sectionMatches)].slice(0, 20);
      console.log('Sections:', uniqueSections);
    }
    
    console.log('\n=== EXTRACTION COMPLETE ===');
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

extractPdfText();
