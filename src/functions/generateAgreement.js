import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Generate PDF from HTML content using Puppeteer
 * @param {Object} params - Parameters object
 * @param {string} params.content - HTML content to convert to PDF
 * @param {Object} options - PDF generation options
 * @param {string} options.format - Page format (A4, A5, etc.)
 * @param {Object} options.margin - Margin settings
 * @param {string} options.filename - Optional filename for the PDF
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePdf = async (params, options = {}) => {
  let browser;

  try {
    console.log('🚀 Starting PDF generation...');

    // Default options
    const defaultOptions = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      displayHeaderFooter: false
    };

    // Merge with provided options
    const pdfOptions = { ...defaultOptions, ...options };

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(params.content, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format,
      margin: pdfOptions.margin,
      printBackground: pdfOptions.printBackground,
      displayHeaderFooter: pdfOptions.displayHeaderFooter
    });

    console.log('✅ PDF generated successfully');

    // If filename is provided, save to file
    if (pdfOptions.filename) {
      const outputPath = path.join(process.cwd(), 'uploads', pdfOptions.filename);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(outputPath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
          }

        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`📄 PDF saved to: ${outputPath}`);
      }

    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generate PDF from HTML file
 * @param {string} htmlFilePath - Path to HTML file
 * @param {Object} options - PDF generation options
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePdfFromFile = async (htmlFilePath, options = {}) => {
  try {
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    return await generatePdf({ content: htmlContent }, options);
  } catch (error) {
    console.error('❌ Error reading HTML file:', error);
    throw new Error(`Failed to read HTML file: ${error.message}`);
  }
};

/**
 * Generate PDF with template data
 * @param {string} templatePath - Path to EJS template
 * @param {Object} data - Data to render in template
 * @param {Object} options - PDF generation options
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePdfFromTemplate = async (templatePath, data, options = {}) => {
  try {
    const ejs = await import('ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    const htmlContent = ejs.render(template, data);

    return await generatePdf({ content: htmlContent }, options);
  } catch (error) {
    console.error('❌ Error generating PDF from template:', error);
    throw new Error(`Template PDF generation failed: ${error.message}`);
  }
};
