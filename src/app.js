import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileConverter from "./routes/fileConversionRoute/index.js";

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
    const PORT =  5154;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Error during server initialization:", error.message);
  }
};

export default startServer;
