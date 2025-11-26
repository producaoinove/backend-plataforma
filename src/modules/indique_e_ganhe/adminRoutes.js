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
      role,
    } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios faltando (email, password)" });
    }

    // Opcional: validar role permitida
    const allowedRoles = ["admin", "vendedor", "indicador", "backoffice", "financeiro"];
    const finalRole = allowedRoles.includes(role) ? role : "indicador";

    // 1) Criar usuário no Auth (trigger cria profile + role = 'indicador')
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

    if (createError || !userCreated?.user?.id) {
      console.error("Erro ao criar usuário (auth.admin):", createError);
      return res
        .status(500)
        .json({ error: "Erro ao criar usuário no Supabase Auth" });
    }

    const userId = userCreated.user.id;

    // 2) Atualizar role na tabela user_roles, se for diferente de 'indicador'
    if (finalRole !== "indicador") {
      const { error: roleError } = await supabaseNioAfiliados
        .from("user_roles")
        .update({ role: finalRole })
        .eq("user_id", userId);

      if (roleError) {
        console.error("Erro ao atualizar role:", roleError);
        // Usuário existe, mas role não foi atualizada
        return res.status(500).json({
          error: "Usuário criado, mas erro ao definir role",
          user_id: userId,
        });
      }
    }

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      user_id: userId,
      role: finalRole,
    });
  } catch (err) {
    console.error("Erro interno em /admin/create-user:", err);
    return res
      .status(500)
      .json({ error: "Erro interno no servidor ao criar usuário" });
  }
});

export default router;