import { Router } from "express";
import { supabasePainelUra } from "../../config/supabaseClient.js";

const router = Router();

router.get("/test-data", async (req, res) => {
  try {
    const { data, error } = await supabasePainelUra
      .from("users")  // ou a tabela correta do painel-ura
      .select("*")
      .limit(5);

    if (error) {
      console.error("Erro Supabase (sistema_ura):", error);
      return res
        .status(500)
        .json({ error: "Erro ao consultar Supabase em sistema_ura" });
    }

    return res.json({ data });
  } catch (err) {
    console.error("Erro interno (sistema_ura):", err);
    return res
      .status(500)
      .json({ error: "Erro interno no servidor (sistema_ura)" });
  }
});

export default router;
