import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserRequest {
  action: 'create' | 'delete' | 'update_password' | 'get_shop_auth_stats' | 'create_shop_with_admin' | 'delete_shop_complete'
  email?: string
  password?: string
  new_password?: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: 'admin' | 'technician' | 'super_admin' | 'shop_admin'
  shop_id?: string
  user_id?: string
  profile_id?: string
  shop_ids?: string[]
  // Pour create_shop_with_admin
  shop_name?: string
  shop_email?: string
  shop_phone?: string
  shop_address?: string
  admin_email?: string
  admin_password?: string
  admin_first_name?: string
  admin_last_name?: string
}

Deno.serve(async (req) => {
  console.log('Admin user management function called')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from JWT token to verify super admin status
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Verify user has appropriate permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, shop_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Access denied: Profile not found')
    }

    const isSuperAdmin = profile.role === 'super_admin'
    const isShopAdmin = profile.role === 'admin' || profile.role === 'shop_admin'

    const body: UserRequest = await req.json()
    const { action, email, password, new_password, first_name, last_name, phone, role, shop_id, user_id, profile_id } = body

    console.log('Action requested:', action)

    switch (action) {
      case 'create_shop_with_admin': {
        if (!isSuperAdmin) {
          throw new Error('Access denied: Super admin privileges required')
        }

        const { shop_name, shop_email, shop_phone, shop_address, admin_email, admin_password, admin_first_name, admin_last_name } = body

        if (!shop_name || !admin_email || !admin_password || !admin_first_name) {
          throw new Error('Missing required fields: shop_name, admin_email, admin_password, admin_first_name')
        }

        if (admin_password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        // 1. Vérifier d'abord si un compte auth existe déjà avec cet email
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        if (listError) {
          throw new Error(`Erreur vérification email: ${listError.message}`)
        }
        const emailLower = admin_email.toLowerCase()
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === emailLower)
        if (existingUser) {
          return new Response(
            JSON.stringify({
              error: "Un compte utilise déjà cet email. Choisissez un autre email ou supprimez d'abord la boutique/le compte associé."
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          )
        }

        // 2. Création de l'utilisateur auth EN PREMIER (évite boutiques fantômes)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: admin_email,
          password: admin_password,
          email_confirm: true
        })

        if (authError || !authData?.user) {
          console.error('Auth user creation error:', authError)
          const msg = authError?.message?.toLowerCase() || ''
          if (msg.includes('already') || msg.includes('registered') || authError?.status === 422) {
            return new Response(
              JSON.stringify({ error: "Un compte utilise déjà cet email. Choisissez un autre email ou supprimez d'abord la boutique/le compte associé." }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            )
          }
          return new Response(
            JSON.stringify({ error: `Erreur création utilisateur: ${authError?.message || 'inconnue'}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        console.log('Auth user created:', authData.user.id)

        // 3. Création de la boutique
        const { data: newShop, error: shopError } = await supabase
          .from('shops')
          .insert({
            name: shop_name,
            email: shop_email || null,
            phone: shop_phone || null,
            address: shop_address || null
          })
          .select()
          .single()

        if (shopError) {
          console.error('Shop creation error:', shopError)
          // Rollback: suppression du user auth
          await supabase.auth.admin.deleteUser(authData.user.id)
          return new Response(
            JSON.stringify({ error: `Erreur création boutique: ${shopError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        console.log('Shop created:', newShop.id)

        // 4. Création du profil admin
        const { data: profileData, error: newProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            shop_id: newShop.id,
            first_name: admin_first_name,
            last_name: admin_last_name || '',
            role: 'admin',
            must_change_password: true
          })
          .select()
          .single()

        if (newProfileError) {
          console.error('Profile creation error:', newProfileError)
          // Rollback: suppression boutique + auth user
          await supabase.from('shops').delete().eq('id', newShop.id)
          await supabase.auth.admin.deleteUser(authData.user.id)
          return new Response(
            JSON.stringify({ error: `Erreur création profil: ${newProfileError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        console.log('Profile created:', profileData.id)

        return new Response(
          JSON.stringify({
            success: true,
            shop: newShop,
            user: authData.user,
            profile: profileData
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'delete_shop_complete': {
        if (!isSuperAdmin) {
          throw new Error('Access denied: Super admin privileges required')
        }
        const { shop_id: targetShopId } = body
        if (!targetShopId) {
          throw new Error('Missing shop_id')
        }

        console.log('Deleting shop completely:', targetShopId)

        // 1. Récupérer tous les profils (et user_ids) liés à ce shop
        const { data: shopProfiles, error: profilesFetchError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('shop_id', targetShopId)

        if (profilesFetchError) {
          throw new Error(`Erreur récupération profils: ${profilesFetchError.message}`)
        }

        const userIds = (shopProfiles || []).map(p => p.user_id).filter(Boolean) as string[]
        console.log(`Found ${userIds.length} user(s) attached to shop`)

        // 2. Récupérer les sav_cases pour cascade
        const { data: savCases } = await supabase
          .from('sav_cases')
          .select('id')
          .eq('shop_id', targetShopId)
        const savCaseIds = (savCases || []).map(s => s.id)

        if (savCaseIds.length > 0) {
          await supabase.from('sav_parts').delete().in('sav_case_id', savCaseIds)
          await supabase.from('sav_status_history').delete().in('sav_case_id', savCaseIds)
        }

        // 3. Supprimer toutes les données métier liées au shop
        const tablesToClean = [
          'parts', 'customers', 'quotes', 'order_items',
          'notifications', 'sav_messages', 'sav_cases', 'profiles'
        ]
        for (const table of tablesToClean) {
          const { error: delErr } = await supabase.from(table as any).delete().eq('shop_id', targetShopId)
          if (delErr) {
            console.error(`Error deleting ${table}:`, delErr)
            // On continue malgré tout pour ne pas bloquer la suppression
          }
        }

        // 4. Supprimer la boutique elle-même
        const { error: shopDelError } = await supabase.from('shops').delete().eq('id', targetShopId)
        if (shopDelError) {
          throw new Error(`Erreur suppression boutique: ${shopDelError.message}`)
        }

        // 5. Pour chaque user_id, vérifier qu'il n'a plus aucun profil (autre boutique) puis supprimer auth
        const deletedAuthUsers: string[] = []
        const skippedAuthUsers: string[] = []
        for (const uid of userIds) {
          const { data: remaining } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', uid)
            .limit(1)
          if (!remaining || remaining.length === 0) {
            const { error: authDelError } = await supabase.auth.admin.deleteUser(uid)
            if (authDelError) {
              console.error(`Error deleting auth user ${uid}:`, authDelError)
            } else {
              deletedAuthUsers.push(uid)
            }
          } else {
            skippedAuthUsers.push(uid)
          }
        }

        console.log(`Shop deleted. Auth users removed: ${deletedAuthUsers.length}, kept: ${skippedAuthUsers.length}`)

        return new Response(
          JSON.stringify({
            success: true,
            deleted_auth_users: deletedAuthUsers.length,
            kept_auth_users: skippedAuthUsers.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      case 'create': {
        if (!email || !password || !role || !shop_id) {
          throw new Error('Missing required fields for user creation')
        }

        // Vérifier les permissions
        if (!isSuperAdmin) {
          if (!isShopAdmin) {
            throw new Error('Access denied: Admin privileges required')
          }
          // Les admins de boutique ne peuvent créer des utilisateurs que dans leur propre boutique
          if (profile.shop_id !== shop_id) {
            throw new Error('Access denied: You can only invite users to your own shop')
          }
        }

        console.log('Creating user with email:', email)

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        })

        if (authError) {
          console.error('Auth error:', authError)
          
          // Si l'utilisateur existe déjà, créer seulement le profil
          if (authError.message?.includes('already been registered') || authError.status === 422) {
            console.log('User already exists, searching for existing user')
            
            // Chercher l'utilisateur existant par email
            const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
            
            if (searchError) {
              throw searchError
            }
            
            const existingUser = existingUsers.users.find(u => u.email === email)
            
            if (!existingUser) {
              throw new Error('User exists but could not be found')
            }
            
            console.log('Found existing user:', existingUser.id)
            
            // Vérifier s'il a déjà un profil
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', existingUser.id)
              .maybeSingle()
            
            if (existingProfile) {
              throw new Error('User already has a profile in the system')
            }
            
            // Créer le profil pour l'utilisateur existant
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .insert({
                user_id: existingUser.id,
                shop_id,
                first_name,
                last_name,
                phone,
                role
              })
              .select()
              .single()

            if (profileError) {
              console.error('Profile error:', profileError)
              throw profileError
            }

            console.log('Profile created for existing user:', profileData.id)

            return new Response(
              JSON.stringify({ 
                success: true, 
                user: existingUser, 
                profile: profileData,
                message: 'Profile created for existing user'
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          } else {
            throw authError
          }
        }

        console.log('Auth user created:', authData.user.id)

        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            shop_id,
            first_name,
            last_name,
            phone,
            role
          })
          .select()
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          // If profile creation fails, delete the auth user
          await supabase.auth.admin.deleteUser(authData.user.id)
          throw profileError
        }

        console.log('Profile created:', profileData.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            user: authData.user, 
            profile: profileData 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'delete': {
        if (!user_id || !profile_id) {
          throw new Error('Missing user_id or profile_id for deletion')
        }

        // Seul super_admin peut supprimer des utilisateurs
        if (!isSuperAdmin) {
          throw new Error('Access denied: Super admin privileges required for deletion')
        }

        console.log('Deleting user:', user_id)

        // Delete profile first
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile_id)

        if (profileError) {
          console.error('Profile deletion error:', profileError)
          throw profileError
        }

        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
        
        if (authError) {
          console.error('Auth deletion error:', authError)
          throw authError
        }

        console.log('User deleted successfully')

        return new Response(
          JSON.stringify({ success: true }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'update_password': {
        if (!user_id || !new_password) {
          throw new Error('Missing user_id or new_password for password update')
        }

        // Seul super_admin peut changer les mots de passe
        if (!isSuperAdmin) {
          throw new Error('Access denied: Super admin privileges required for password update')
        }

        console.log('Updating password for user:', user_id)

        // Update password
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          user_id,
          { password: new_password }
        )

        if (passwordError) {
          console.error('Password update error:', passwordError)
          throw passwordError
        }

        console.log('Password updated successfully')

        return new Response(
          JSON.stringify({ success: true }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'get_shop_auth_stats': {
        // Seul super_admin peut récupérer les stats d'auth
        if (!isSuperAdmin) {
          throw new Error('Access denied: Super admin privileges required')
        }

        console.log('Fetching auth stats for shops')

        // Récupérer tous les profils avec leur shop_id et noms
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('user_id, shop_id, first_name, last_name')
          .not('shop_id', 'is', null)

        if (allProfilesError) throw allProfilesError

        // Récupérer tous les utilisateurs auth
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
          perPage: 1000
        })

        if (authUsersError) throw authUsersError

        // Créer un map user_id -> last_sign_in_at
        const authMap: Record<string, string | null> = {}
        for (const u of authUsers.users) {
          authMap[u.id] = u.last_sign_in_at || null
        }

        // Compter les connexions par shop et trouver le dernier connecté
        const shopStats: Record<string, { total_logins: number; last_login_at: string | null; last_login_user_name: string | null; users: Record<string, string | null> }> = {}
        
        for (const p of allProfiles || []) {
          if (!p.shop_id || !p.user_id) continue
          
          if (!shopStats[p.shop_id]) {
            shopStats[p.shop_id] = { total_logins: 0, last_login_at: null, last_login_user_name: null, users: {} }
          }
          
          const lastSignIn = authMap[p.user_id] || null
          shopStats[p.shop_id].users[p.user_id] = lastSignIn
          
          // Compter comme "connexion" si l'utilisateur s'est déjà connecté
          if (lastSignIn) {
            shopStats[p.shop_id].total_logins += 1
            
            // Tracker le dernier connecté
            if (!shopStats[p.shop_id].last_login_at || lastSignIn > shopStats[p.shop_id].last_login_at!) {
              shopStats[p.shop_id].last_login_at = lastSignIn
              const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Inconnu'
              shopStats[p.shop_id].last_login_user_name = fullName
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, shop_stats: shopStats }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Error in admin user management:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})