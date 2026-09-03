import * as fs from 'fs';

async function checkPdfPages() {
  try {
    console.log('=== PDF PAGE COUNT CHECK ===');
    
    const pdfPath = 'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\QUO000002-final.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    
    // Count /Type /Page objects
    const pageMatches = pdfBuffer.toString('utf-8').match(/\/Type\s*\/Page/g);
    console.log('Page objects:', pageMatches ? pageMatches.length : 0);
    
    // Count endobj markers
    const endobjMatches = pdfBuffer.toString('utf-8').match(/endobj/g);
    console.log('endobj markers:', endobjMatches ? endobjMatches.length : 0);
    
    // Try to find page count from /Pages dictionary
    const pdfText = pdfBuffer.toString('utf-8');
    const countMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (countMatch) {
      console.log('Page count from /Count:', countMatch[1]);
    }
    
    // Look for trailer /Root
    const rootMatch = pdfText.match(/trailer\s*<<[\s\S]*?\/Root\s+(\d+)\s+\d\s+R/);
    if (rootMatch) {
      console.log('Root object reference:', rootMatch[1]);
    }
    
    console.log('=== CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

checkPdfPages();
