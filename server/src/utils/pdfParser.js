const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF parsing error: ${error.message}`);
  }
};

const extractTextFromFile = async (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`File reading error: ${error.message}`);
  }
};

// general helper that decides which extractor to run based on mimetype
const extractText = async (filePath, mimeType) => {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(filePath);
  }
  // docx is not plain text, try reading as buffer and converting if library available
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // simple fallback: read file as binary and strip tags (not ideal)
    const mammoth = require('mammoth');
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (err) {
      // if mammoth not installed or fails, just read raw
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
  // default to plain text
  return await extractTextFromFile(filePath);
};

module.exports = {
  extractTextFromPDF,
  extractTextFromFile,
  extractText,
};
