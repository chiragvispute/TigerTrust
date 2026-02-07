import express from "express";
import routes from "./routes";
import dotenv from "dotenv";
import path from "path";

// Load environment variables - try root .env first
const rootEnvPath = path.resolve(__dirname, "../../.env");
const localEnvPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: rootEnvPath });
if (!process.env.HELIUS_KEY) {
  dotenv.config({ path: localEnvPath });
}

const app = express();
app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => {
res.send("RSE Server Running");
});

const port = parseInt(process.env.RSE_SERVER_PORT || "4000");
app.listen(port, () => {
console.log(`RSE server running on port ${port}`);
});
