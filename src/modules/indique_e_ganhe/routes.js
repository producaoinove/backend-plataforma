import { Router } from "express";
import { supabaseNioAfiliados } from "../../config/supabaseClient.js";
import fetch from "node-fetch";

const router = Router();

router.get("/test-profiles", async (req, res) => {
  try {
    const { data, error } = await supabaseNioAfiliados
      .from("profiles")
      .select("id, full_name, email")
      .limit(10);

    if (error) {
      console.error("Erro Supabase (indique_e_ganhe):", error);
      return res
        .status(500)
        .json({ error: "Erro ao consultar Supabase em indique_e_ganhe" });
    }

    return res.json({ data });
  } catch (err) {
    console.error("Erro interno (indique_e_ganhe):", err);
    return res
      .status(500)
      .json({ error: "Erro interno no servidor (indique_e_ganhe)" });
  }
});

// Rota: checar viabilidade de CEP (substitui Edge Function check-cep-viability)
router.post("/check-cep-viability", async (req, res) => {
  try {
    const { estado, cep } = req.body;

    // Validação rigorosa de entrada
    if (!estado || !cep) {
      return res.status(400).json({
        error: "Estado e CEP são obrigatórios",
      });
    }

    // Validar tipo de dados
    if (typeof estado !== "string" || typeof cep !== "string") {
      return res.status(400).json({
        error: "Formato de dados inválido",
      });
    }

    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      return res.status(400).json({
        error: "CEP deve ter 8 dígitos",
      });
    }

    // Validar estado brasileiro
    const validStates = [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ];

    const stateUpper = estado.toUpperCase().trim();
    if (!validStates.includes(stateUpper)) {
      return res.status(400).json({
        error: "Estado inválido",
      });
    }

    // Validar que o CEP contém apenas números
    if (!/^\d+$/.test(cleanCep)) {
      return res.status(400).json({
        error: "CEP deve conter apenas números",
      });
    }

    console.log(`Checking CEP ${cleanCep} in state ${stateUpper}`);

    // URL base da API externa (pode colocar no .env se quiser)
    const baseUrl =
      process.env.CHECK_CEP_API_URL ||
      "http://168.121.7.194:9011/api1/viabilidade/checar-cep/";

    // Montar URL com query params (mesma lógica da Edge Function)
    const apiUrl = `${baseUrl}?uf=${encodeURIComponent(
      stateUpper
    )}&cep=${encodeURIComponent(cleanCep)}`;

    console.log("Calling external viability API:", apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`API returned status ${response.status}`);
      // Mesma ideia da Edge: responde 200 com found_any=false
      return res.status(200).json({
        found_any: false,
        error: `Erro ao consultar API externa: ${response.status}`,
      });
    }

    const data = await response.json();
    console.log("API response:", data);

    // Normalizar campo 'operator' para 'operadora'
    if (data.results && Array.isArray(data.results)) {
      data.results = data.results.map((result) => ({
        ...result,
        operadora: result.operator || result.operadora,
        operator: undefined,
      }));
    }

    // Retornar dados conforme formato da Edge Function
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in check-cep-viability route:", error);
    return res.status(500).json({
      found: false,
      error: "Erro ao processar solicitação",
    });
  }
});


router.post("/webhook/send-indicador-to-n8n", async (req, res) => {
  try {
    const { full_name, email, whatsapp, city, state } = req.body;

    // Validação básica pra evitar lixo
    if (!full_name || !email || !whatsapp || !city || !state) {
      return res.status(400).json({ error: "Campos obrigatórios faltando no body" });
    }

    const baseUrl = process.env.N8N_WEBHOOK_INDICADOR_URL;
    if (!baseUrl) {
      console.error("ERRO: N8N_WEBHOOK_INDICADOR_URL não configurada no .env / Railway");
      return res.status(500).json({ error: "Webhook N8N não configurado" });
    }

    const params = new URLSearchParams({
      full_name,
      email,
      whatsapp,
      city,
      state,
    });

    const webhookUrl = `${baseUrl}?${params.toString()}`;

    console.log("📤 Enviando dados do indicador para n8n:", webhookUrl);

    try {
      const response = await fetch(webhookUrl, { method: "GET" });
      const text = await response.text();

      // Só pra debug – status 200 com {"message":"Workflow was started"} é SUCESSO
      console.log("📥 Resposta do n8n:", response.status, text);

      if (!response.ok) {
        console.warn("⚠️ n8n respondeu com status não-2xx (mas não vamos falhar o Supabase)");
      }
    } catch (fetchErr) {
      console.error("❌ Erro de rede ao chamar n8n:", fetchErr);
      // Mesmo assim respondemos sucesso pro Supabase pra não quebrar o cadastro
    }

    // Respondemos rápido pro Supabase
    return res.json({
      success: true,
      message: "Dados enviados para o n8n (fire-and-forget)",
    });
  } catch (err) {
    console.error("Erro em /webhook/send-indicador-to-n8n:", err);
    return res.status(500).json({ success: false, error: "Erro interno no backend" });
  }
});


export default router;
