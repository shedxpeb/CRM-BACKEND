import * as fs from 'fs';

async function inspectPdfBinary() {
  try {
    console.log('=== PDF BINARY INSPECTION ===');
    
    const pdfPath = 'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\QUO000002-final.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    
    // Look for the string "[object Object]" in the PDF
    const pdfText = pdfBuffer.toString('utf-8');
    const objectObjectCount = (pdfText.match(/\[object Object\]/g) || []).length;
    console.log('[object Object] occurrences:', objectObjectCount);
    
    // Find where these occurrences are
    const firstIndex = pdfText.indexOf('[object Object]');
    if (firstIndex >= 0) {
      console.log('\nFirst [object Object] at position:', firstIndex);
      console.log('Context (100 chars before and after):');
      const start = Math.max(0, firstIndex - 100);
      const end = Math.min(pdfText.length, firstIndex + 100);
      console.log(pdfText.substring(start, end));
    }
    
    // Check if it's in a compressed stream
    console.log('\n=== CHECKING FOR STREAMS ===');
    const streamMatches = pdfText.match(/stream/g);
    console.log('Stream markers:', streamMatches ? streamMatches.length : 0);
    
    const endStreamMatches = pdfText.match(/endstream/g);
    console.log('Endstream markers:', endStreamMatches ? endStreamMatches.length : 0);
    
    // Check for FlateDecode compression
    const flateMatches = pdfText.match(/FlateDecode/g);
    console.log('FlateDecode occurrences:', flateMatches ? flateMatches.length : 0);
    
    console.log('\n=== INSPECTION COMPLETE ===');
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

inspectPdfBinary();
