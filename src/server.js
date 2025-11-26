import "dotenv/config";
import express from "express";
import cors from "cors";

import indiqueRoutes from "./modules/indique_e_ganhe/routes.js";
import indiqueAdminRoutes from "./modules/indique_e_ganhe/adminRoutes.js";
import uraRoutes from "./modules/sistema_ura/routes.js";
import securityRoutes from "./modules/indique_e_ganhe/securityRoutes.js";

const app = express();
const port = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Healthcheck (para monitor e para Railway)
app.get("/healthz", (req, res) => {
  res.json({ ok: true, message: "Backend plataforma rodando" });
});

// Prefixos por projeto
app.use("/api/indique_e_ganhe", indiqueRoutes);
app.use("/api/indique_e_ganhe", indiqueAdminRoutes); // 👈 mesmo prefixo
app.use("/api/indique_e_ganhe/security", securityRoutes);

app.use("/api/sistema_ura", uraRoutes);

// 404 padrão
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Start
app.listen(port, () => {
  console.log(`🚀 Backend plataforma rodando na porta ${port}`);
});
