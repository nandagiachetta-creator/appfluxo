import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_EMAIL = 'nandagiachetta@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return res(null, 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Sem autorização' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return json({ error: 'Token inválido' }, 401)

    const payload = JSON.parse(atob(parts[1]))
    if (payload.email !== ADMIN_EMAIL) return json({ error: 'Acesso negado' }, 401)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, ...params } = await req.json()

    if (action === 'list_users') {
      const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
      if (error) return json({ error: error.message }, 500)
      return json({ users: data.users })
    }

    if (action === 'create_user') {
      const { name, email, temp_password } = params
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password: temp_password,
        email_confirm: true,
        user_metadata: { full_name: name, must_change_password: true }
      })
      if (error) return json({ error: error.message }, 400)
      return json({ user: data.user })
    }

    if (action === 'invite_user') {
      const { name, email, redirect_to } = params
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name },
        redirectTo: redirect_to
      })
      if (error) return json({ error: error.message }, 400)
      return json({ user: data.user })
    }

    if (action === 'delete_user') {
      const { user_id } = params
      const { error } = await sb.auth.admin.deleteUser(user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    return json({ error: 'Ação desconhecida' }, 400)

  } catch (e) {
    return json({ error: e.message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

function res(body: null, status: number, headers: Record<string, string>) {
  return new Response(body, { status, headers })
}
