// src/modules/indique_e_ganhe/pushRoutes.js
import { Router } from "express";
import webpush from "web-push";
import { supabaseNioAfiliados } from "../../config/supabaseClient.js";

const router = Router();

// Configurar VAPID usando variáveis de ambiente
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.post("/send-notification", async (req, res) => {
  try {
    const { user_id, title, body, data } = req.body;

    console.log("Recebido push notification request:", { user_id, title });

    if (!user_id || !title || !body) {
      return res.status(400).json({
        error: "user_id, title e body são obrigatórios",
      });
    }

    // Buscar subscriptions do usuário
    const { data: subscriptions, error } = await supabaseNioAfiliados
      .from("push_subscriptions")
      .select("id, subscription")  // ← pegar o campo subscription (jsonb)
      .eq("user_id", user_id);

    if (error) {
      console.error("Erro ao buscar push_subscriptions:", error);
      return res.status(500).json({ error: "Erro ao buscar subscriptions" });
    }

    if (!subscriptions || !subscriptions.length) {
      console.log("Nenhuma subscription encontrada para user:", user_id);
      return res.json({
        success: true,
        message: "Nenhuma subscription encontrada",
        sent: 0,
      });
    }

    const payload = JSON.stringify({ 
      title, 
      body, 
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data 
    });
    
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // ✅ CORREÇÃO: acessar sub.subscription (que é o objeto JSONB)
        const pushSubscription = sub.subscription;
        
        await webpush.sendNotification(
          {
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: pushSubscription.keys.p256dh,
              auth: pushSubscription.keys.auth,
            },
          },
          payload
        );
        sent++;
        console.log("Push enviado com sucesso para subscription:", sub.id);
      } catch (err) {
        console.error("Erro ao enviar push:", err.statusCode, err.body);
        failed++;

        // Se a subscription ficou inválida, remover do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log("Removendo subscription inválida:", sub.id);
          try {
            await supabaseNioAfiliados
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          } catch (delErr) {
            console.error("Erro ao deletar subscription inválida:", delErr);
          }
        }
      }
    }

    console.log(`Push notifications: ${sent} enviados, ${failed} falharam`);
    return res.json({ success: true, sent, failed });
  } catch (err) {
    console.error("Erro em /push/send-notification:", err);
    return res
      .status(500)
      .json({ success: false, error: "Erro interno no backend" });
  }
});

export default router;
