const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

const extractTextFromDOCX = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

const extractText = async (filePath, mimeType) => {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(filePath);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDOCX(filePath);
  } else if (mimeType === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error('Unsupported file type');
  }
};

module.exports = { extractTextFromPDF, extractTextFromDOCX, extractTextFromFile: (fp) => fs.readFileSync(fp, 'utf-8'), extractText };