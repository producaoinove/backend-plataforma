// src/modules/indique_e_ganhe/adminRoutes.js
import { Router } from "express";
import { supabaseNioAfiliados } from "../../config/supabaseClient.js";

const router = Router();

/**
 * POST /api/indique_e_ganhe/admin/create-user
 * Body esperado:
 * {
 *   email: string,
 *   password: string,
 *   fullName: string,
 *   whatsapp: string,
 *   city: string,
 *   state: string,
 *   role: 'admin' | 'vendedor' | 'backoffice' | 'financeiro' | 'indicador'
 * }
 *
 * OBS: depois vamos proteger isso com JWT / API key de admin.
 */
router.post("/admin/create-user", async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      whatsapp,
      city,
      state,
      role, // ainda podemos usar mais pra frente se quiser
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    // 1) Criar usuário no Auth (gatilha o handle_new_user automaticamente)
    const { data: userCreated, error: createError } =
      await supabaseNioAfiliados.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          whatsapp,
          city,
          state,
        },
      });

    if (createError) {
      console.error("Erro ao criar usuário (auth.admin):", createError);
      return res
        .status(500)
        .json({ error: "Erro ao criar usuário no Supabase Auth" });
    }

    const userId = userCreated.user.id;

    // 2) (Opcional) podemos no futuro atualizar role/perfil se quiser sobrepor algo.
    // Por enquanto deixamos o trigger fazer tudo

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      user_id: userId,
    });
  } catch (err) {
    console.error("Erro interno em admin/create-user:", err);
    return res
      .status(500)
      .json({ error: "Erro interno no servidor ao criar usuário" });
  }
});

export default router;
