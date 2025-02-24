import path from "path";
import fs from "fs-extra";
import multer from "multer";
import libre from "libreoffice-convert";
import exceljs from "exceljs";
import puppeteer from "puppeteer";
import XLSX from "xlsx";
import { createCanvas, Path2D } from 'canvas';
global.Path2D = Path2D; // Polyfill Path2D for pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

const uploadDir = path.join("uploads", "pdf-images");

const fileConverterController = {
  fileConverter: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const uploadedFileName = req.file.filename;
      console.log("Uploaded File Name:", uploadedFileName);

      const fileType = path.extname(uploadedFileName).toLowerCase();
      let pdfPath;

      if ([".doc", ".docx"].includes(fileType)) {
        pdfPath = await convertWordToPDF(req.file);
      } else if ([".xlsx", ".xls"].includes(fileType)) {
        pdfPath = await convertExcelToPDF(req.file);
      } else if (fileType === ".pdf") {
        pdfPath = req.file.path;
      } else {
        return res.status(400).json({ error: "Unsupported file format" });
      }

      const pdfName = path.basename(pdfPath, ".pdf");
      const images = await convertPDFToImages(pdfPath, pdfName);

      res.json({
        success: true,
        message: "File converted successfully!",
        originalFileName: uploadedFileName,
        images,
      });
    } catch (error) {
      console.error("Conversion Error:", error);
      res.status(500).json({ error: "File conversion failed" });
    }
  },

  getImages: async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const pdfName = path.basename(fileName, path.extname(fileName));
      const folderPath = path.join(uploadDir, pdfName);

      if (!fs.existsSync(folderPath))
        return res.status(404).json({ error: "No images found" });

      const imageFiles = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith(".png"));
      const imageUrls = imageFiles.map(
        (file) => `/uploads/pdf-images/${pdfName}/${file}`
      );

      res.json({ success: true, images: imageUrls });
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ error: "Error fetching images" });
    }
  },

  getPdf: async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const pdfPath = path.join(uploadDir, `${fileName}.pdf`);

      if (!fs.existsSync(pdfPath))
        return res.status(404).json({ error: "PDF file not found" });

      res.json({ success: true, pdfUrl: `/uploads/pdf-images/${fileName}.pdf` });
    } catch (error) {
      console.error("Error fetching PDF:", error);
      res.status(500).json({ error: "Error fetching PDF" });
    }
  },
};

export default fileConverterController;

async function convertWordToPDF(file) {
  const originalName = path.basename(file.originalname, path.extname(file.originalname));
  const outputPath = path.join("uploads", "pdf-images", `${originalName}.pdf`);
  const fileBuffer = fs.readFileSync(file.path);

  return new Promise((resolve, reject) => {
    libre.convert(fileBuffer, ".pdf", undefined, (err, done) => {
      if (err) return reject(`Word to PDF conversion failed: ${err}`);
      fs.writeFileSync(outputPath, done);
      resolve(outputPath);
    });
  });
}

async function convertExcelToPDF(file) {
  const originalName = path.basename(file.originalname, path.extname(file.originalname));
  let htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { border: 1px solid #ccc; padding: 8px; word-wrap: break-word; }
      </style>
    </head>
    <body>
  `;

  try {
    const fileType = path.extname(file.originalname).toLowerCase();
    if (fileType === ".xlsx") {
      const workbook = new exceljs.Workbook();
      await workbook.xlsx.readFile(file.path);

      workbook.worksheets.forEach((sheet) => {
        htmlContent += `<h1>${sheet.name}</h1><table>`;
        sheet.eachRow({ includeEmpty: true }, (row) => {
          htmlContent += "<tr>";
          row.eachCell({ includeEmpty: true }, (cell) => {
            htmlContent += `<td>${cell.value !== null ? cell.value : ""}</td>`;
          });
          htmlContent += "</tr>";
        });
        htmlContent += "</table><br/>";
      });
    } else if (fileType === ".xls") {
      const workbook = XLSX.readFile(file.path);
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        htmlContent += `<h1>${sheetName}</h1><table>`;
        data.forEach((row) => {
          htmlContent += "<tr>";
          row.forEach((cell) => {
            htmlContent += `<td>${cell !== undefined ? cell : ""}</td>`;
          });
          htmlContent += "</tr>";
        });
        htmlContent += "</table><br/>";
      });
    } else {
      throw new Error("Uploaded file is not an Excel file.");
    }

    htmlContent += "</body></html>";

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfPath = path.join("uploads", "pdf-images", `${originalName}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();
    return pdfPath;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    throw new Error("Failed to convert Excel to PDF");
  }
}

async function convertPDFToImages(pdfPath, pdfName) {
  const outputPath = path.join(uploadDir, pdfName);
  await fs.ensureDir(outputPath);

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;

  const images = [];

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const imagePath = path.join(outputPath, `${pdfName}_page_${i}.png`);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(imagePath, buffer);

    images.push(`/uploads/pdf-images/${pdfName}/${pdfName}_page_${i}.png`);
  }

  return images;
}
