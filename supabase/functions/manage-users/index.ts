import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Non authentifié')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

    // Verify caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await userClient.auth.getUser()
    if (!caller) throw new Error('Non authentifié')

    // Check caller is admin using service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerRoles } = await adminClient.from('user_roles').select('role').eq('user_id', caller.id)
    const isCallerAdmin = callerRoles?.some((r: any) => r.role === 'administrateur')
    if (!isCallerAdmin) throw new Error('Accès refusé : administrateur requis')

    const { action, ...payload } = await req.json()

    if (action === 'create') {
      const { email, password, role, poste_ids } = payload
      if (!email || !password || !role) throw new Error('Email, mot de passe et rôle requis')

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError) throw createError

      // Create profile
      await adminClient.from('profiles').insert({ id: newUser.user.id, email })

      // Assign role
      await adminClient.from('user_roles').insert({ user_id: newUser.user.id, role })

      // Assign permissions if contributeur
      if (role === 'contributeur' && poste_ids?.length) {
        await adminClient.from('user_permissions').insert(
          poste_ids.map((pid: string) => ({ user_id: newUser.user.id, poste_id: pid }))
        )
      }

      return new Response(JSON.stringify({ user: { id: newUser.user.id, email } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { user_id, poste_ids, active } = payload
      if (!user_id) throw new Error('user_id requis')

      // Check target role
      const { data: targetRoles } = await adminClient.from('user_roles').select('role').eq('user_id', user_id)
      const isTargetAdmin = targetRoles?.some((r: any) => r.role === 'administrateur')

      // If deactivating an admin, ensure at least one other active admin remains
      if (isTargetAdmin && active === false) {
        const { data: allAdmins } = await adminClient
          .from('user_roles').select('user_id').eq('role', 'administrateur')
        const { data: activeProfiles } = await adminClient
          .from('profiles').select('id').eq('active', true)
        const activeAdminIds = allAdmins
          ?.filter((a: any) => activeProfiles?.some((p: any) => p.id === a.user_id && a.user_id !== user_id))
        if (!activeAdminIds || activeAdminIds.length === 0) {
          throw new Error('Impossible de désactiver le dernier administrateur actif')
        }
      }

      // Update active status
      if (active !== undefined) {
        await adminClient.from('profiles').update({ active }).eq('id', user_id)
        if (!active) {
          await adminClient.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
        } else {
          await adminClient.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
        }
      }

      // Update permissions (only for contributeurs)
      if (poste_ids !== undefined && !isTargetAdmin) {
        await adminClient.from('user_permissions').delete().eq('user_id', user_id)
        if (poste_ids.length) {
          await adminClient.from('user_permissions').insert(
            poste_ids.map((pid: string) => ({ user_id: user_id, poste_id: pid }))
          )
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { user_id } = payload
      if (!user_id) throw new Error('user_id requis')

      // Prevent self-deletion
      if (user_id === caller.id) throw new Error('Impossible de se supprimer soi-même')

      // Check not deleting last admin
      const { data: targetRoles } = await adminClient.from('user_roles').select('role').eq('user_id', user_id)
      const isTargetAdmin = targetRoles?.some((r: any) => r.role === 'administrateur')

      if (isTargetAdmin) {
        const { data: adminCount } = await adminClient.from('user_roles').select('user_id').eq('role', 'administrateur')
        if (adminCount && adminCount.length <= 1) {
          throw new Error('Impossible de supprimer le dernier administrateur')
        }
      }

      // Delete RDVs created by this user
      await adminClient.from('rendez_vous').delete().eq('created_by', user_id)

      // Delete auth user (cascades to profiles, user_roles, user_permissions)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Action inconnue')
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
