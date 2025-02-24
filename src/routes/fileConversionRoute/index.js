import express from "express";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import fileConverterController from "../../controller/fileConversionController/index.js";

const uploadDirExcel = path.resolve("uploads", "excel");
const uploadDirPdfImages = path.resolve("uploads", "pdf-images");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.ensureDir(uploadDirExcel, (err) => {
      if (err) return cb(new Error("Failed to create excel upload directory"));
      fs.ensureDir(uploadDirPdfImages, (err) => {
        if (err) return cb(new Error("Failed to create pdf-images directory"));
        cb(null, file.mimetype.includes("excel") ? uploadDirExcel : uploadDirPdfImages);
      });
    });
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const fileConverter = async (app) => {
  console.log("✅ File converter route initialized.");
  app.post("/fileConverter", upload.single("file"), fileConverterController.fileConverter);
  app.get("/fileConverter/:fileName", fileConverterController.getImages);
  app.get("/get-pdf/:fileName", fileConverterController.getPdf);
};

export default fileConverter;
