import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';

async function generatePdfViaHttp() {
  try {
    console.log('=== PDF GENERATION VIA HTTP ===');
    
    // First, login to get auth token
    const loginData = JSON.stringify({
      email: 'admin@crm.local',
      password: 'admin123'
    });

    const loginOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: 8000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginResponse = await new Promise<{ data: any; token: string }>((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const token = json.data?.accessToken || json.accessToken;
            resolve({ data: json, token });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    if (!loginResponse.token) {
      console.log('ERROR: Failed to get auth token');
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    console.log('Auth token obtained');

    // Now request PDF
    const pdfOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: 8000,
      path: '/quotations/20f5aa03-caf8-489d-9f74-4b0bac478b81/pdf',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginResponse.token}`,
        'Cookie': `accessToken=${loginResponse.token}`
      }
    };

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const req = http.request(pdfOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log('PDF response received, size:', pdfBuffer.length, 'bytes');

    // Validate PDF
    if (pdfBuffer.length < 100) {
      console.log('ERROR: PDF too small');
      console.log('Response:', pdfBuffer.toString('utf-8'));
      return;
    }

    const header = pdfBuffer.subarray(0, 4).toString('utf-8');
    if (header !== '%PDF') {
      console.log('ERROR: Invalid PDF header:', header);
      console.log('First 200 bytes:', pdfBuffer.subarray(0, 200).toString('utf-8'));
      return;
    }

    console.log('PDF validation passed');

    // Write to file
    const outputPath = 'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\QUO000002-final.pdf';
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log('PDF saved to:', outputPath);
    console.log('=== TEST COMPLETE ===');

  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

generatePdfViaHttp();
