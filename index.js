import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileConverter from "./src/routes/fileConversionRoute/index.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use("/uploads", express.static("uploads"));


app.use(express.json());
fileConverter(app);

app.get("/", (req, res) => {
  res.send({ code: 200, message: "Server is running successfully." });
});

const startServer = async () => {
    try {
      const PORT = process.env.PORT || 5152;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error("❌ Error during server initialization:", error);
      process.exit(1); 
    }
  };
  

startServer()
