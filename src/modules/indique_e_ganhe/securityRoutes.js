// src/modules/indique_e_ganhe/securityRoutes.js
import { Router } from "express";
import { supabaseNioAfiliados } from "../../config/supabaseClient.js";

const router = Router();

// Mesmas configs que você já usava na Edge Function
const RATE_LIMITS = {
  signup: { maxAttempts: 5, windowMinutes: 60, blockMinutes: 30 },
  login: { maxAttempts: 10, windowMinutes: 15, blockMinutes: 15 },
  default: { maxAttempts: 20, windowMinutes: 60, blockMinutes: 60 },
};

router.post("/verify-recaptcha", async (req, res) => {
  try {
    const { recaptchaToken, identifier, actionType = "default" } = req.body;

    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        error: "Token reCAPTCHA obrigatório",
      });
    }

    // 1) Verificar reCAPTCHA no Google
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("ERRO: RECAPTCHA_SECRET_KEY não configurada");
      return res.status(500).json({
        success: false,
        error: "Configuração de reCAPTCHA ausente",
      });
    }

    const verifyUrl =
      "https://www.google.com/recaptcha/api/siteverify?" +
      `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(
        recaptchaToken
      )}`;

    const recaptchaResponse = await fetch(verifyUrl, { method: "POST" });
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) {
      return res.status(400).json({
        verified: false,
        rateLimitOk: false,
        error: "Verificação reCAPTCHA falhou",
        errors: recaptchaData["error-codes"],
      });
    }

    // 2) Rate limiting (se identifier for enviado)
    if (identifier) {
      const limits = RATE_LIMITS[actionType] || RATE_LIMITS.default;

      // Verificar se está bloqueado
      const { data: tracking } = await supabaseNioAfiliados
        .from("abuse_tracking")
        .select("*")
        .eq("identifier", identifier)
        .eq("action_type", actionType)
        .single();

      if (tracking?.blocked_until && new Date(tracking.blocked_until) > new Date()) {
        return res.status(429).json({
          verified: true,
          rateLimitOk: false,
          error: "Muitas tentativas. Tente novamente mais tarde.",
          blockedUntil: tracking.blocked_until,
        });

      }

      const newAttemptCount = (tracking?.attempt_count || 0) + 1;
      const shouldBlock = newAttemptCount >= limits.maxAttempts;

      await supabaseNioAfiliados
        .from("abuse_tracking")
        .upsert(
          {
            identifier,
            action_type: actionType,
            attempt_count: newAttemptCount,
            last_attempt_at: new Date().toISOString(),
            blocked_until: shouldBlock
              ? new Date(
                Date.now() + limits.blockMinutes * 60 * 1000
              ).toISOString()
              : null,
          },
          { onConflict: "identifier,action_type" }
        );

      if (shouldBlock) {
        return res.status(429).json({
          verified: true,
          rateLimitOk: false,
          error: "Muitas tentativas. Tente novamente mais tarde.",
          blockedUntil: tracking.blocked_until,
        });

      }
    }

    // Se chegou até aqui, está tudo certo
    return res.json({
      verified: true,
      rateLimitOk: true,
      score: recaptchaData.score,
      action: recaptchaData.action,
    });
  } catch (err) {
    console.error("Erro em /security/verify-recaptcha:", err);
    return res.status(500).json({
      verified: false,
      rateLimitOk: false,
      error: "Erro interno no servidor",
    });
  }
});

export default router;
