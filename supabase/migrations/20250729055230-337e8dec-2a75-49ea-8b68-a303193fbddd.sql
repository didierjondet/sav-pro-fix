-- Créer un profil super admin pour l'utilisateur djondet@gmail.com
-- D'abord, vérifier s'il existe déjà un profil pour cet email
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Récupérer l'ID utilisateur depuis auth.users pour l'email djondet@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'djondet@gmail.com' 
    LIMIT 1;
    
    -- Si l'utilisateur existe, créer ou mettre à jour son profil
    IF target_user_id IS NOT NULL THEN
        -- Supprimer le profil existant s'il existe
        DELETE FROM profiles WHERE user_id = target_user_id;
        
        -- Créer le nouveau profil super admin
        INSERT INTO profiles (user_id, first_name, last_name, role) 
        VALUES (target_user_id, 'Super', 'Admin', 'super_admin');
        
        RAISE NOTICE 'Profil super admin créé pour l''utilisateur %', target_user_id;
    ELSE
        RAISE NOTICE 'Utilisateur avec email djondet@gmail.com non trouvé dans auth.users';
    END IF;
END $$;