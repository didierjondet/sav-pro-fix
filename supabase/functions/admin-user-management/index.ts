import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserRequest {
  action: 'create' | 'delete' | 'update_password'
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

    const { action, email, password, new_password, first_name, last_name, phone, role, shop_id, user_id, profile_id }: UserRequest = await req.json()

    console.log('Action requested:', action)

    switch (action) {
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