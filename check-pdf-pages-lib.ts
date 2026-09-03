import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function checkPdfPagesWithLib() {
  try {
    console.log('=== PDF PAGE COUNT CHECK WITH PDF-LIB ===');
    
    const pdfPath = 'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\QUO000002-final.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    console.log('Page count:', pageCount);
    
    console.log('=== CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

checkPdfPagesWithLib();
