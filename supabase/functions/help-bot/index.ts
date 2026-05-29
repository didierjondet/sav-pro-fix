import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// === AES-GCM Decryption Helper ===
async function getDecryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY") || "default-fallback-key-change-me";
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode("ai-config-salt"), iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decryptApiKey(encrypted: string): Promise<string> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function getAIConfig(supabaseClient: any) {
  const fallback = { provider: "lovable", url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: "google/gemini-3-flash-preview" };
  try {
    const { data } = await supabaseClient.from("ai_engine_config").select("*").eq("is_active", true).maybeSingle();
    if (!data || data.provider === "lovable") {
      return { ...fallback, model: data?.model || fallback.model };
    }
    let apiKey: string | undefined;
    if (data.encrypted_api_key) {
      try { apiKey = await decryptApiKey(data.encrypted_api_key); } catch (e) { console.error("Decrypt failed:", e); }
    }
    if (!apiKey) apiKey = Deno.env.get(data.api_key_name);
    // Garde-fou: si pas de clé pour le provider, ne PAS envoyer la clé Lovable à l'URL du provider tiers
    if (!apiKey) return fallback;
    switch (data.provider) {
      case "openai":
        return { provider: "openai", url: "https://api.openai.com/v1/chat/completions", apiKey, model: data.model };
      case "gemini":
        return { provider: "gemini", url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(data.model)}:generateContent`, apiKey, model: data.model };
      default:
        return fallback;
    }
  } catch (e) {
    console.error("getAIConfig error:", e);
    return fallback;
  }
}

const SYSTEM_PROMPT = `Tu es l'assistant IA expert du logiciel de gestion SAV **Fixway**. Tu aides les utilisateurs (techniciens, admins de boutique) à utiliser le logiciel et à optimiser leur activité.

Tu as accès en temps réel aux données du magasin. Utilise-les pour des réponses précises et contextualisées.

## Style de communication
- **Sois CONCIS** : 2-4 phrases max sauf si l'utilisateur demande des détails.
- **Sois INTERACTIF** : pose une question de clarification si la demande est vague plutôt que de deviner.
- **Sois PROACTIF** : si tu détectes un problème dans les données (stock bas, SAV en retard, profil incomplet), signale-le.
- Utilise le Markdown pour structurer (listes, gras, liens).
- Tutoie l'utilisateur.
- NE PROPOSE JAMAIS de créer un ticket toi-même. Le système le fait automatiquement si nécessaire.

## Fonctionnalités complètes de Fixway

### 📋 Gestion SAV — Cycle de vie complet
1. **Création** : Depuis /sav/nouveau. Champs : client, appareil (marque/modèle/IMEI/couleur/grade), type de SAV, description du problème, codes de sécurité (PIN, schéma de déverrouillage), accessoires déposés (chargeur, coque, protection écran), acompte.
2. **Numéro de dossier** : Généré automatiquement (ex: SAV-2024-00042). Chaque dossier a un slug de tracking unique pour le suivi client.
3. **Statuts personnalisables** : Chaque boutique configure ses propres statuts (ex: En attente, Diagnostic, Devis envoyé, En réparation, Terminé, Rendu). Certains statuts sont "finaux" (clôture), d'autres "pausent le timer" (attente pièce).
4. **Types de SAV personnalisables** : Réparation, Garantie, Rachat, Vente, etc. Chaque type peut avoir un délai max de traitement et un délai d'alerte. Certains types excluent les coûts d'achat ou revenus des stats.
5. **Pièces détachées par dossier** : On ajoute les pièces utilisées, avec quantité, prix unitaire, prix d'achat, temps de réparation. Possibilité de pièces personnalisées (sans lien stock).
6. **Remises** : Remise par pièce (% ou montant) et remise globale sur le dossier.
7. **Clôture** : Calcul automatique du coût total (pièces + temps). Historique des clôtures/réouvertures.
8. **QR Code & Tracking** : Chaque dossier génère un QR code. Le client scanne pour voir l'avancement en temps réel sur une page publique (/track/SLUG). Il peut aussi envoyer des messages.
9. **Impression** : Fiche SAV imprimable avec QR code, filtrable par statut/date.

### 💬 Messagerie interne
- Communication bidirectionnelle boutique ↔ client via la page de tracking.
- Les messages côté boutique sont envoyés par le technicien ou admin.
- Les messages côté client sont envoyés depuis la page publique de tracking (pas besoin de compte).
- Photos en pièces jointes possibles.
- Indicateur de messages non lus côté boutique.

### 🔐 Codes de sécurité
- Stockage sécurisé du code PIN, mot de passe, schéma de déverrouillage (pattern lock visuel).
- Selon le type de SAV, le pattern peut être requis ou optionnel.

### 📦 Gestion du stock (Pièces détachées)
- Catalogue de pièces avec : nom, référence, SKU, couleur, fournisseur, prix d'achat, prix de vente, quantité en stock, quantité réservée, seuil minimum, temps de réparation estimé, photo.
- **Réservation automatique** : Quand une pièce est ajoutée à un SAV, la quantité réservée augmente. Elle diminue à la clôture.
- **Alerte stock bas** : Notification quand quantité ≤ seuil minimum.
- **Commandes** : Les pièces en rupture peuvent être ajoutées à la liste de commandes (/orders) avec priorité et lien vers le SAV concerné.
- Import de stock en masse via CSV/Excel.

### 📝 Devis
- Création manuelle ou liée à un dossier SAV.
- Champs : client, appareil, pièces (avec prix et temps), remise, acompte, notes.
- Statuts : Brouillon, Envoyé, Accepté, Refusé.
- Envoi par SMS au client avec lien de consultation publique. Le client peut accepter ou refuser en ligne.
- Numérotation automatique (DEV-2024-XXXX).
- Recherche rapide de pièces en stock depuis la page devis.

### 👥 Gestion des clients
- Fiche client : prénom, nom, téléphone, email, adresse.
- Historique complet : tous les SAV, devis, messages, rendez-vous du client.
- Détection de doublons automatique.
- Import en masse via CSV.
- Recherche multi-critères.

### 📅 Agenda & Rendez-vous
- Calendrier avec vues jour/semaine/mois.
- Types de RDV : dépôt, récupération, diagnostic, autre.
- Lien possible avec un dossier SAV et un client.
- Système de contre-proposition : la boutique propose un créneau, le client peut accepter ou proposer un autre horaire via un lien unique (token de confirmation).
- Configuration des horaires d'ouverture par jour de la semaine.
- Blocage de créneaux (vacances, fermeture exceptionnelle).

### 📊 Statistiques & Widgets
- Tableau de bord personnalisable avec widgets drag & drop.
- Widgets prédéfinis : CA mensuel, SAV par statut, taux de retard, stock, satisfaction client, comparaison mensuelle, heatmap d'utilisation des pièces.
- **Widgets IA** : L'utilisateur décrit en langage naturel le widget souhaité et l'IA le génère automatiquement.
- Assistant quotidien : résumé IA de la journée (SAV prioritaires, stock bas, actions recommandées).

### 📱 SMS
- Envoi de SMS aux clients (notifications SAV, rappels RDV, envoi de devis).
- Crédits SMS par boutique, alloués par l'admin plateforme.
- Suivi de la consommation.

### 📤 Import / Export
- Import CSV/Excel pour : clients, pièces détachées, dossiers SAV.
- Configurations d'import sauvegardables (mapping de colonnes personnalisé).
- Export des données en CSV.

### ⚙️ Paramètres
- **Profil** : Nom, prénom, téléphone de l'utilisateur.
- **Boutique** : Nom, email, téléphone, adresse, logo, site web, réseaux sociaux.
- **Types de SAV** : Créer/modifier/supprimer les types avec couleurs, délais, options (exclure des stats, demander le pattern, etc.).
- **Statuts SAV** : Créer/modifier les statuts avec couleurs, ordre d'affichage, statut final, pause timer.
- **Menu** : Choisir quels éléments du menu latéral sont visibles.
- **SMS** : Voir les crédits restants.
- **IA** : Activer/désactiver le bot d'aide.
- **Fournisseurs** : Configurer les fournisseurs pour la recherche de pièces.

### 🔑 Rôles utilisateurs
- **Admin** : Accès complet à toutes les fonctionnalités, peut inviter des techniciens, gérer les paramètres.
- **Technicien** : Accès aux SAV, pièces, clients, devis. Pas d'accès aux paramètres sensibles ni à la gestion des utilisateurs.
- **Super Admin** : Admin de la plateforme Fixway (pas visible par les boutiques). Gère les boutiques, abonnements, SMS globaux, facturation.

### 💳 Abonnement & Limites
- Plans : Free, Pro, Business. Chaque plan a des limites (nombre de SAV/mois, nombre de clients, stockage, SMS).
- Alertes proactives quand on approche des limites (80%, 90%, 100%).
- Upgrade possible depuis /subscription.

### 🔔 Notifications
- Notifications en temps réel (realtime Supabase).
- Types : nouveau SAV, changement de statut, stock bas, message client, RDV, support.
- Son de notification configurable.

### 🌐 Site web boutique
- Chaque boutique peut avoir un mini-site public avec ses services, horaires, coordonnées.
- SEO configurable (titre, description, Open Graph, sitemap).

## Navigation du logiciel
- **Tableau de bord** : /home
- **SAV** : /sav (liste), /sav/nouveau (créer)
- **Détail SAV** : /sav/:id
- **Clients** : /customers
- **Pièces/Stock** : /parts
- **Devis** : /quotes
- **Commandes** : /orders
- **Agenda** : /agenda
- **Statistiques** : /statistics
- **Rapports** : /reports
- **Paramètres** : /settings
- **Abonnement** : /subscription
- **Support** : /support

## 🔧 Compétences techniques (expert réparateur smartphone / hi-tech)

Tu es aussi un **technicien réparateur expérimenté**. Tu aides au diagnostic, à l'estimation, au choix de pièces et aux procédures sur :

### Marques & catégories maîtrisées
- **Apple** : iPhone (5s → 17 Pro Max), iPad (toutes générations), Apple Watch, AirPods, MacBook (Intel + Apple Silicon).
- **Samsung** : Galaxy S, Note, A, M, Z Fold / Flip, Tab, Watch.
- **Xiaomi / Redmi / Poco**, **Huawei / Honor**, **Oppo / Realme**, **OnePlus**, **Google Pixel**, **Sony Xperia**, **Nokia**.
- **Consoles** : Nintendo Switch (V1/V2/OLED/Lite), PS4 / PS5, Xbox Series, Steam Deck, manettes (drift, gâchettes).
- **Hi-tech divers** : montres connectées, drones, écouteurs sans fil, GoPro, e-trottinettes/VAE (batteries, contrôleurs).

### Pannes courantes et premiers réflexes
- **Écran** : vitre fissurée vs LCD/OLED HS, tactile partiel (souvent nappe), lignes/colorations (driver IC), point bleu Samsung (OLED brûlé), True Tone perdu (transfert puce nécessaire iPhone), pose d'OCA pour vitre seule.
- **Batterie** : autonomie faible, gonflement (DANGER → ne pas percer, isoler), message "Service" iPhone (puce TI à reprogrammer ou batterie originale), cycles > 800 = remplacement conseillé.
- **Charge** : nappe / connecteur (Lightning, USB-C, micro-USB) — souvent oxydation ou broches tordues ; tester avec chargeur + câble certifiés ; si rien après nappe → IC charge (Tristar/Tigris sur iPhone, PMIC Samsung).
- **Audio** : écouteur interne (souvent grille bouchée), HP buzzer, micro (vérifier mémo vocal), jack (oxydation, faux contact).
- **Caméra** : autofocus HS (module entier), vitre objectif fissurée seule (kit vitre arrière), capteur noir = module ; capteur Face ID : tout changement = perte Face ID sur iPhone récents.
- **Boutons** : power/volume nappes, Home iPhone (Touch ID lié au CPU → pas de remplacement = perte Touch ID), bouton Action.
- **Connectique** : Wi-Fi/BT (souvent côté logique), antenne GPS, lecteur SIM, NFC (Apple Pay).
- **Carte mère / logique** : court-circuit (consommation anormale au démarrage), oxydation (nettoyage US + alcool isopropylique 99%), reballing CPU/NAND, micro-soudure sur lignes alim.
- **Logiciel** : iCloud Lock (refuser le SAV si non débloqué), FRP Samsung, bootloop, restauration DFU (iPhone), Odin (Samsung), Mi Flash (Xiaomi).
- **Consoles** : Joy-Con drift (potentiomètre ou module Hall), HDMI PS4/PS5 (refonte fréquente), eMMC Switch.

### Procédure diagnostic standard
1. Interroger le client : chute ? eau ? depuis quand ? intermittent ou permanent ?
2. Test à l'allumage : démarre / écran noir / vibre / pomme/loading boucle.
3. Test sous chargeur certifié 10 min.
4. Test écran : appui, multi-touch, couleurs, luminosité.
5. Test fonctions : haut-parleur, micro, caméras avant/arrière, Wi-Fi, BT, capteurs.
6. Si carte mère suspecte : mesurer consommation à l'alimentation de labo (court-circuit = trop d'ampérage).

### Pièces & qualité
- **Original / OEM Service Pack** : meilleure compatibilité (True Tone, Face ID), prix le plus élevé.
- **Refurb (reconditionné)** : châssis original + nouvelle vitre, bonne qualité.
- **Soft OLED** : copie OLED économique (couleurs fades, sensible aux chocs).
- **Hard OLED** : copie OLED renforcée (meilleur compromis).
- **Incell LCD** (iPhone) : économique, pas de True Tone, contraste correct.
- Toujours signaler au client les incompatibilités potentielles (True Tone, capteur de luminosité, Face ID).

### Temps d'intervention indicatifs
- Écran iPhone : 30–45 min ; écran Samsung collé : 45–90 min (chauffe).
- Batterie iPhone : 20–30 min ; batterie Samsung Z Fold : 1h30+.
- Connecteur de charge : 45–60 min (90 min sur iPhone à dessouder à partir du 8).
- Vitre arrière iPhone (laser/chauffe) : 1–2 h.
- Joy-Con drift : 20 min.
- Reballing/micro-soudure : 1–3 h selon complexité.

### Sécurité
- ESD : bracelet antistatique obligatoire avant ouverture.
- Batteries Li-ion : ne jamais percer / plier ; en cas de gonflement, décharger lentement.
- Oxydation : ne pas tenter de charger ; ouvrir, nettoyer aux ultrasons.
- Données client : proposer sauvegarde avant DFU / reset.

## Règles
1. Utilise les DONNÉES RÉELLES du magasin fournies ci-dessous (statistiques, SAV, stock, agenda, finances) pour répondre.
2. Tu réponds aussi aux questions **techniques de réparation** (diagnostic, choix de pièces, procédures, estimations). Ces questions ne sont PAS hors périmètre.
3. N'escalade ([ESCALATE]) que pour les sujets totalement hors logiciel ET hors réparation hi-tech (ex: comptabilité personnelle, juridique non lié au SAV, sujets non techniques).
4. Si le profil ou la boutique est incomplet, suggère de compléter (Paramètres → Profil / Boutique).
5. Fais des recommandations basées sur les données : SAV en retard, stock à commander, devis en attente, regroupement de commandes fournisseur, etc.
6. Quand l'utilisateur demande "comment faire X" dans le logiciel, guide-le vers la bonne page et explique les étapes.
7. Pour un diagnostic, propose une **checklist ordonnée** et chiffrée (temps, coût pièce estimé) quand pertinent.`

async function fetchShopData(supabaseAdmin: any, shopId: string) {
  const context: string[] = []

  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()
    const last30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()

    const [
      shopResult,
      savCountsResult,
      recentSavsResult,
      activeSavsResult,
      partsStatsResult,
      lowStockResult,
      topPartsResult,
      customersCountResult,
      quotesResult,
      pendingQuotesResult,
      savTypesResult,
      savStatusesResult,
      ordersResult,
      appointmentsResult,
      unreadMsgsResult,
      satisfactionResult,
      monthlyFinanceResult,
      suppliersResult,
      techniciansResult,
    ] = await Promise.all([
      supabaseAdmin.from('shops').select('name, email, phone, address, subscription_tier, monthly_sav_count, monthly_sms_used, sms_credits_allocated, active_sav_count').eq('id', shopId).single(),
      supabaseAdmin.from('sav_cases').select('status').eq('shop_id', shopId),
      supabaseAdmin.from('sav_cases').select('case_number, status, device_brand, device_model, sav_type, created_at, total_cost').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('sav_cases').select('case_number, status, device_brand, device_model, device_imei, sav_type, problem_description, created_at, total_cost, taken_over').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.rpc('get_parts_statistics', { p_shop_id: shopId }),
      supabaseAdmin.from('parts').select('name, quantity, min_stock, reference').eq('shop_id', shopId).not('min_stock', 'is', null).limit(30),
      supabaseAdmin.from('parts').select('name, reference, quantity, selling_price, purchase_price').eq('shop_id', shopId).order('quantity', { ascending: false }).limit(15),
      supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      supabaseAdmin.from('quotes').select('quote_number, status, customer_name, total_amount, created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('quotes').select('quote_number, customer_name, total_amount, created_at').eq('shop_id', shopId).eq('status', 'sent').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('shop_sav_types').select('type_key, type_label, type_color, is_active, max_processing_days, alert_days').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      supabaseAdmin.from('shop_sav_statuses').select('status_key, status_label, status_color, is_active, is_final_status, pause_timer').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      supabaseAdmin.from('order_items').select('part_name, quantity_needed, priority, ordered').eq('shop_id', shopId).eq('ordered', false).limit(15),
      supabaseAdmin.from('appointments').select('title, appointment_type, start_at, end_at, status, customer_name').eq('shop_id', shopId).gte('start_at', todayStart).lte('start_at', in7Days).order('start_at').limit(20),
      supabaseAdmin.from('sav_messages').select('sav_case_id, sender_type, created_at').eq('shop_id', shopId).eq('sender_type', 'client').eq('read_by_shop', false).limit(20),
      supabaseAdmin.from('satisfaction_surveys').select('rating, created_at').eq('shop_id', shopId).gte('created_at', last30).not('rating', 'is', null),
      supabaseAdmin.from('sav_cases').select('total_cost, sav_type, status').eq('shop_id', shopId).gte('created_at', monthStart),
      supabaseAdmin.from('suppliers').select('name, contact_email, contact_phone').eq('shop_id', shopId).eq('active', true).limit(20),
      supabaseAdmin.from('profiles').select('first_name, last_name, role, last_sign_in_at').eq('shop_id', shopId).limit(20),
    ])

    if (shopResult.data) {
      const s = shopResult.data
      context.push(`## Informations du magasin
- Nom : ${s.name}
- Email : ${s.email || 'non configuré'}
- Téléphone : ${s.phone || 'non configuré'}
- Adresse : ${s.address || 'non configurée'}
- Abonnement : ${s.subscription_tier}
- SAV créés ce mois : ${s.monthly_sav_count}
- SAV actifs : ${s.active_sav_count}
- SMS utilisés/alloués ce mois : ${s.monthly_sms_used}/${s.sms_credits_allocated || 0}`)
    }

    if (savCountsResult.data) {
      const statusCounts: Record<string, number> = {}
      for (const sav of savCountsResult.data) {
        statusCounts[sav.status] = (statusCounts[sav.status] || 0) + 1
      }
      context.push(`## SAV par statut (total: ${savCountsResult.data.length})
${Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`).join('\n')}`)
    }

    if (activeSavsResult.data?.length) {
      context.push(`## SAV récents (top 20 — détails)
${activeSavsResult.data.map((s: any) => `- ${s.case_number} | ${s.status} | ${s.device_brand || ''} ${s.device_model || ''} ${s.device_imei ? `(IMEI ${s.device_imei})` : ''} | Type: ${s.sav_type} | Coût: ${s.total_cost ?? 'N/A'}€ | Pris en charge: ${s.taken_over ? 'oui' : 'non'} | Problème: ${(s.problem_description || '').slice(0, 120)}`).join('\n')}`)
    } else if (recentSavsResult.data?.length) {
      context.push(`## 10 derniers SAV
${recentSavsResult.data.map((s: any) => `- ${s.case_number} | ${s.status} | ${s.device_brand || ''} ${s.device_model || ''} | Type: ${s.sav_type} | Coût: ${s.total_cost ?? 'N/A'}€`).join('\n')}`)
    }

    if (partsStatsResult.data) {
      const p = Array.isArray(partsStatsResult.data) ? partsStatsResult.data[0] : partsStatsResult.data
      if (p) {
        context.push(`## Stock de pièces
- Quantité totale : ${p.total_quantity}
- Valeur totale : ${Number(p.total_value).toFixed(2)}€
- Pièces en stock bas : ${p.low_stock_count}`)
      }
    }

    if (lowStockResult.data?.length) {
      const lowStock = lowStockResult.data.filter((p: any) => p.quantity !== null && p.min_stock !== null && p.quantity <= p.min_stock)
      if (lowStock.length > 0) {
        context.push(`## ⚠️ Alertes stock bas
${lowStock.map((p: any) => `- ${p.name} (réf: ${p.reference || 'N/A'}) : ${p.quantity} en stock (seuil min: ${p.min_stock})`).join('\n')}`)
      }
    }

    if (topPartsResult.data?.length) {
      context.push(`## Top pièces en stock
${topPartsResult.data.map((p: any) => `- ${p.name} (réf: ${p.reference || 'N/A'}) : ${p.quantity} | achat ${p.purchase_price ?? '?'}€ / vente ${p.selling_price ?? '?'}€`).join('\n')}`)
    }

    context.push(`## Clients
- Nombre total : ${customersCountResult.count ?? 0}`)

    if (quotesResult.data?.length) {
      context.push(`## 5 derniers devis
${quotesResult.data.map((q: any) => `- ${q.quote_number} | ${q.status} | ${q.customer_name} | ${q.total_amount}€ | ${new Date(q.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    if (pendingQuotesResult.data?.length) {
      context.push(`## Devis en attente d'acceptation
${pendingQuotesResult.data.map((q: any) => `- ${q.quote_number} | ${q.customer_name} | ${q.total_amount}€ | envoyé le ${new Date(q.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    if (savTypesResult.data?.length) {
      context.push(`## Types de SAV configurés (règles métier)
${savTypesResult.data.map((t: any) => `- ${t.type_label} (clé: ${t.type_key}) | Délai max: ${t.max_processing_days ?? 'aucun'} jours | Alerte à: ${t.alert_days ?? 'aucun'} jours`).join('\n')}`)
    }

    if (savStatusesResult.data?.length) {
      context.push(`## Statuts SAV configurés (règles métier)
${savStatusesResult.data.map((s: any) => `- ${s.status_label} (clé: ${s.status_key}) | Final: ${s.is_final_status ? 'Oui' : 'Non'} | Pause timer: ${s.pause_timer ? 'Oui' : 'Non'}`).join('\n')}`)
    }

    if (ordersResult.data?.length) {
      context.push(`## Commandes en attente
${ordersResult.data.map((o: any) => `- ${o.part_name} x${o.quantity_needed} | Priorité: ${o.priority}`).join('\n')}`)
    }

    if (appointmentsResult.data?.length) {
      context.push(`## Agenda (7 prochains jours)
${appointmentsResult.data.map((a: any) => `- ${new Date(a.start_at).toLocaleString('fr-FR')} → ${new Date(a.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} | ${a.appointment_type} | ${a.customer_name || a.title} | ${a.status}`).join('\n')}`)
    }

    if (unreadMsgsResult.data?.length) {
      context.push(`## 📩 Messages clients non lus : ${unreadMsgsResult.data.length}`)
    }

    if (satisfactionResult.data?.length) {
      const ratings = satisfactionResult.data.map((s: any) => Number(s.rating)).filter((r: number) => !isNaN(r))
      if (ratings.length) {
        const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        context.push(`## Satisfaction client (30j) : ${avg.toFixed(2)}/5 sur ${ratings.length} avis`)
      }
    }

    if (monthlyFinanceResult.data?.length) {
      const total = monthlyFinanceResult.data.reduce((sum: number, s: any) => sum + (Number(s.total_cost) || 0), 0)
      const finals = monthlyFinanceResult.data.filter((s: any) => s.total_cost != null).length
      context.push(`## Finance mois en cours
- CA SAV facturé (cumul total_cost) : ${total.toFixed(2)}€
- SAV avec montant : ${finals} / ${monthlyFinanceResult.data.length}`)
    }

    if (suppliersResult.data?.length) {
      context.push(`## Fournisseurs actifs
${suppliersResult.data.map((s: any) => `- ${s.name}${s.contact_email ? ` | ${s.contact_email}` : ''}${s.contact_phone ? ` | ${s.contact_phone}` : ''}`).join('\n')}`)
    }

    if (techniciansResult.data?.length) {
      context.push(`## Équipe du magasin
${techniciansResult.data.map((p: any) => `- ${p.first_name || ''} ${p.last_name || ''} (${p.role})${p.last_sign_in_at ? ` | dernière connexion ${new Date(p.last_sign_in_at).toLocaleDateString('fr-FR')}` : ''}`).join('\n')}`)
    }

  } catch (e) {
    console.error('Error fetching shop data:', e)
    context.push('## ⚠️ Certaines données n\'ont pas pu être chargées')
  }

  return context.join('\n\n')
}

// Recherche ciblée selon des entités détectées dans la question
async function performDataLookup(supabaseAdmin: any, shopId: string, message: string): Promise<string> {
  const blocks: string[] = []
  const msg = message.toLowerCase()

  try {
    // 0. RÉPONSES FACTUELLES DIRECTES (calculées serveur, garanties exactes)

    // 0a. Question "stock" globale: combien de pièces, inventaire, quantité totale...
    const stockGlobal = /(combien|nombre|total|inventaire|quantit[ée]|valeur)/i.test(msg)
      && /(pi[èe]ce|stock|r[ée]f[ée]rence|inventaire)/i.test(msg)
    if (stockGlobal) {
      const [statsRes, allPartsRes, lowRes] = await Promise.all([
        supabaseAdmin.rpc('get_parts_statistics', { p_shop_id: shopId }),
        supabaseAdmin.from('parts').select('name, reference, quantity, selling_price, purchase_price').eq('shop_id', shopId).order('quantity', { ascending: false }).limit(15),
        supabaseAdmin.from('parts').select('name, reference, quantity, min_stock').eq('shop_id', shopId).not('min_stock', 'is', null),
      ])
      const stats = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data
      const lowStock = (lowRes.data || []).filter((p: any) => p.quantity != null && p.min_stock != null && p.quantity <= p.min_stock)
      const lines: string[] = []
      if (stats) {
        lines.push(`- **Quantité totale en stock** : ${stats.total_quantity} pièces`)
        lines.push(`- **Nombre de références distinctes** : ${stats.total_parts ?? (allPartsRes.data?.length ?? '?')}`)
        lines.push(`- **Valeur totale du stock** : ${Number(stats.total_value || 0).toFixed(2)}€`)
        lines.push(`- **Pièces en stock bas** : ${stats.low_stock_count}`)
      } else if (allPartsRes.data) {
        const total = allPartsRes.data.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0)
        lines.push(`- **Quantité totale en stock** : ${total} pièces`)
        lines.push(`- **Nombre de références** : ${allPartsRes.data.length}`)
      }
      if (allPartsRes.data?.length) {
        lines.push(`\n**Top pièces en stock :**\n${allPartsRes.data.slice(0, 10).map((p: any) => `  • ${p.name} (réf ${p.reference || '—'}) : ${p.quantity} en stock`).join('\n')}`)
      }
      if (lowStock.length) {
        lines.push(`\n**⚠️ Alertes stock bas (${lowStock.length}) :**\n${lowStock.slice(0, 10).map((p: any) => `  • ${p.name} (réf ${p.reference || '—'}) : ${p.quantity} ≤ ${p.min_stock}`).join('\n')}`)
      }
      blocks.push(`### 📦 Réponse factuelle – Stock du magasin (données live)\n${lines.join('\n')}`)
    }

    // 0b. Question "SAV" globale: combien de SAV en cours / en retard / par statut
    const savGlobal = /(combien|nombre|total|liste)/i.test(msg) && /(sav|dossier|r[ée]paration)/i.test(msg)
    if (savGlobal) {
      const { data: allSavs } = await supabaseAdmin
        .from('sav_cases')
        .select('case_number, status, sav_type, device_brand, device_model, created_at')
        .eq('shop_id', shopId)
      if (allSavs?.length) {
        const byStatus: Record<string, number> = {}
        for (const s of allSavs) byStatus[s.status] = (byStatus[s.status] || 0) + 1
        const lines = [
          `- **Total SAV** : ${allSavs.length}`,
          `- **Répartition par statut** :`,
          ...Object.entries(byStatus).map(([s, c]) => `  • ${s} : ${c}`),
        ]
        blocks.push(`### 🛠️ Réponse factuelle – SAV du magasin (données live)\n${lines.join('\n')}`)
      }
    }


    const caseMatches = message.match(/\b(SAV-\d{2,4}-?\d{0,6}|#?\d{3,8})\b/gi) || []
    for (const raw of caseMatches.slice(0, 3)) {
      const term = raw.replace('#', '').trim()
      const { data } = await supabaseAdmin
        .from('sav_cases')
        .select('case_number, status, sav_type, device_brand, device_model, device_imei, device_color, device_grade, problem_description, total_cost, total_time_minutes, created_at, taken_over, customer:customers(first_name, last_name, phone, email)')
        .eq('shop_id', shopId)
        .ilike('case_number', `%${term}%`)
        .limit(2)
      if (data?.length) {
        for (const c of data) {
          const cust = c.customer ? `${c.customer.first_name || ''} ${c.customer.last_name || ''} (${c.customer.phone || c.customer.email || '—'})` : '—'
          blocks.push(`### Dossier ${c.case_number}
- Client : ${cust}
- Appareil : ${c.device_brand || ''} ${c.device_model || ''} ${c.device_color || ''} ${c.device_grade || ''}
- IMEI : ${c.device_imei || 'N/A'}
- Type : ${c.sav_type} | Statut : ${c.status} | Pris en charge : ${c.taken_over ? 'oui' : 'non'}
- Problème : ${c.problem_description || '—'}
- Coût total : ${c.total_cost ?? 'N/A'}€ | Temps : ${c.total_time_minutes ?? 0} min
- Créé le : ${new Date(c.created_at).toLocaleString('fr-FR')}`)
        }
      }
    }

    // 2. Recherche client par nom (mot >=4 lettres + capitalisée ou après "client")
    const clientMatch = message.match(/client\s+([a-zàâäéèêëïîôùûüÿçœ-]{3,})/i) || message.match(/\b([A-ZÉÈÊ][a-zàâäéèêëïîôùûüÿç-]{3,})\b/)
    if (clientMatch) {
      const term = clientMatch[1]
      const { data } = await supabaseAdmin
        .from('customers')
        .select('first_name, last_name, phone, email')
        .eq('shop_id', shopId)
        .or(`last_name.ilike.%${term}%,first_name.ilike.%${term}%`)
        .limit(5)
      if (data?.length) {
        blocks.push(`### Clients trouvés "${term}"
${data.map((c: any) => `- ${c.first_name || ''} ${c.last_name || ''} | ${c.phone || '—'} | ${c.email || '—'}`).join('\n')}`)
      }
    }

    // 3. Recherche pièce intelligente : type + modèle => prix achat moyen / min / max + marge + historique 90 j
    const PART_TYPE_RE = /(vitre|[ée]cran|batterie|connecteur(?:\s+de\s+charge)?|nappe|cam[ée]ra|haut-?parleur|micro|bouton|carte\s+m[èe]re|capteur|ch[âa]ssis|coque|face\s+arri[èe]re|dock|vibreur|lecteur)/i
    const MODEL_RE = /\b(iphone|ipad|ipod|samsung|galaxy|redmi|xiaomi|poco|pixel|huawei|honor|oppo|oneplus|nokia|sony|xperia|mate|note)\b[\s\w+-]{0,40}/i
    const partKwMatch = message.match(PART_TYPE_RE)
    const modelMatch = message.match(MODEL_RE)

    if (partKwMatch) {
      const type = partKwMatch[1]
      const modelRaw = modelMatch ? modelMatch[0].trim() : ''
      const modelTokens = modelRaw
        .toLowerCase()
        .replace(/[^\wàâäéèêëïîôùûüÿç\s+-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 5)

      // Filtre : name ILIKE %type% ET (chaque token du modèle présent dans name OU reference)
      let query = supabaseAdmin
        .from('parts')
        .select('id, name, reference, quantity, min_stock, purchase_price, selling_price')
        .eq('shop_id', shopId)
        .ilike('name', `%${type}%`)
      for (const tok of modelTokens) {
        query = query.or(`name.ilike.%${tok}%,reference.ilike.%${tok}%`)
      }
      let { data } = await query.limit(30)

      // Fallback : si modèle fourni mais 0 résultat, on garde uniquement le type
      let relaxed = false
      if ((!data || data.length === 0) && modelTokens.length > 0) {
        const fb = await supabaseAdmin
          .from('parts')
          .select('id, name, reference, quantity, min_stock, purchase_price, selling_price')
          .eq('shop_id', shopId)
          .ilike('name', `%${type}%`)
          .limit(20)
        data = fb.data || []
        relaxed = true
      }

      if (data?.length) {
        const withPurchase = data.filter((p: any) => p.purchase_price != null && Number(p.purchase_price) > 0)
        const withSelling = data.filter((p: any) => p.selling_price != null && Number(p.selling_price) > 0)
        const avg = (arr: any[], k: string) => arr.length ? arr.reduce((s: number, p: any) => s + Number(p[k]), 0) / arr.length : null
        const mn = (arr: any[], k: string) => arr.length ? Math.min(...arr.map((p: any) => Number(p[k]))) : null
        const mx = (arr: any[], k: string) => arr.length ? Math.max(...arr.map((p: any) => Number(p[k]))) : null

        const avgPurchase = avg(withPurchase, 'purchase_price')
        const avgSelling = avg(withSelling, 'selling_price')
        const avgMargin = (avgPurchase != null && avgSelling != null) ? avgSelling - avgPurchase : null
        const marginPct = (avgMargin != null && avgPurchase && avgPurchase > 0) ? (avgMargin / avgPurchase) * 100 : null

        // Historique 90 j via sav_parts
        let hist90 = ''
        try {
          const partIds = data.map((p: any) => p.id).filter(Boolean)
          if (partIds.length) {
            const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
            const { data: savParts } = await supabaseAdmin
              .from('sav_parts')
              .select('purchase_price, unit_price, quantity, created_at')
              .gte('created_at', since)
              .in('part_id', partIds)
              .limit(300)
            if (savParts?.length) {
              const pp = savParts.filter((s: any) => s.purchase_price != null && Number(s.purchase_price) > 0)
              const totalUnits = savParts.reduce((s: number, x: any) => s + (Number(x.quantity) || 0), 0)
              if (pp.length) {
                const avgHist = pp.reduce((s: number, x: any) => s + Number(x.purchase_price), 0) / pp.length
                hist90 = `- **Historique 90 j (prix réellement payés en SAV)** : moyenne ${avgHist.toFixed(2)}€ sur ${pp.length} ligne(s), ${totalUnits} unité(s) utilisée(s)`
              } else {
                hist90 = `- **Historique 90 j** : ${totalUnits} unité(s) utilisée(s) (aucun prix d'achat historisé)`
              }
            }
          }
        } catch (e) {
          console.error('sav_parts history error', e)
        }

        const title = modelRaw
          ? (relaxed
              ? `${type} (aucune réf exacte pour « ${modelRaw} », résultats élargis au type)`
              : `${type} ${modelRaw}`)
          : type

        const lines: string[] = [`- **Références trouvées** : ${data.length}`]
        if (avgPurchase != null) {
          lines.push(`- **Prix d'achat moyen** : ${avgPurchase.toFixed(2)}€ (min ${mn(withPurchase, 'purchase_price')!.toFixed(2)}€ / max ${mx(withPurchase, 'purchase_price')!.toFixed(2)}€)`)
        } else {
          lines.push(`- **Prix d'achat** : aucun renseigné sur ces références`)
        }
        if (avgSelling != null) {
          lines.push(`- **Prix de vente moyen** : ${avgSelling.toFixed(2)}€ (min ${mn(withSelling, 'selling_price')!.toFixed(2)}€ / max ${mx(withSelling, 'selling_price')!.toFixed(2)}€)`)
        }
        if (avgMargin != null) {
          lines.push(`- **Marge moyenne** : ${avgMargin.toFixed(2)}€${marginPct != null ? ` (${marginPct.toFixed(0)}%)` : ''}`)
        }
        if (hist90) lines.push(hist90)
        lines.push(`\n**Détail :**\n${data.slice(0, 12).map((p: any) => `  • ${p.name} (réf ${p.reference || '—'}) | Stock ${p.quantity} | Achat ${p.purchase_price ?? '?'}€ / Vente ${p.selling_price ?? '?'}€`).join('\n')}`)

        blocks.push(`### 💰 Réponse factuelle – ${title}\n${lines.join('\n')}`)
      }
    }

    // 4. RDV par mot-clé
    if (/\b(rdv|rendez-?vous|agenda|demain|aujourd'?hui|cette semaine)\b/i.test(msg)) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()
      const { data } = await supabaseAdmin
        .from('appointments')
        .select('title, appointment_type, start_at, end_at, status, customer_name')
        .eq('shop_id', shopId)
        .gte('start_at', start)
        .lte('start_at', end)
        .order('start_at')
        .limit(15)
      if (data?.length) {
        blocks.push(`### RDV à venir (7 jours)
${data.map((a: any) => `- ${new Date(a.start_at).toLocaleString('fr-FR')} | ${a.appointment_type} | ${a.customer_name || a.title} | ${a.status}`).join('\n')}`)
      }
    }
  } catch (e) {
    console.error('Data lookup error:', e)
  }

  if (!blocks.length) return ''
  return `## 🔍 Données spécifiques à la question\n\n${blocks.join('\n\n')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history, userContext, shopId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const aiConfig = await getAIConfig(supabaseAdmin)
    if (!aiConfig.apiKey) {
      return new Response(JSON.stringify({
        message: "Le service IA n'est pas configuré. Contactez l'administrateur (Super Admin → Moteur IA).",
        escalate: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }


    let shopDataContext = ''
    let lookupContext = ''
    if (shopId) {
      const [data, lookup] = await Promise.all([
        fetchShopData(supabaseAdmin, shopId),
        performDataLookup(supabaseAdmin, shopId, message),
      ])
      shopDataContext = data
      lookupContext = lookup
    }

    let knowledgeContext = ''
    try {
      const words = message.toLowerCase()
        .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2)

      if (words.length > 0) {
        const { data: knowledgeItems } = await supabaseAdmin
          .from('help_bot_knowledge')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(50)

        if (knowledgeItems?.length) {
          const scored = knowledgeItems.map((item: any) => {
            const itemKeywords = (item.keywords || []).map((k: string) => k.toLowerCase())
            const questionWords = item.question.toLowerCase().split(/\s+/)
            let score = 0
            for (const word of words) {
              if (itemKeywords.some((kw: string) => kw.includes(word) || word.includes(kw))) score += 3
              if (questionWords.some((qw: string) => qw.includes(word) || word.includes(qw))) score += 1
            }
            return { ...item, score }
          }).filter((item: any) => item.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3)

          if (scored.length > 0) {
            knowledgeContext = '\n\n## Documentation complémentaire\n\n'
            for (const item of scored) {
              knowledgeContext += `### ${item.question}\n${item.answer}\n\n`
            }
          }
        }
      }
    } catch (e) {
      console.error('Knowledge search error:', e)
    }

    const userContextBlock = userContext ? `\n\n## Contexte utilisateur courant
- Profil rempli : ${userContext.profileComplete ? 'Oui' : 'Non (suggérer de compléter dans Paramètres → Profil)'}
- Boutique configurée : ${userContext.shopComplete ? 'Oui' : 'Non (suggérer de configurer dans Paramètres → Boutique)'}
- Rôle : ${userContext.role || 'inconnu'}
- Nom boutique : ${userContext.shopName || 'non configuré'}` : ''

    const fullSystemPrompt = SYSTEM_PROMPT +
      (shopDataContext ? `\n\n# DONNÉES EN TEMPS RÉEL DU MAGASIN\n\n${shopDataContext}` : '') +
      (lookupContext ? `\n\n${lookupContext}` : '') +
      knowledgeContext +
      userContextBlock

    // Diagnostic
    console.log(`[help-bot] provider=${aiConfig.provider} model=${aiConfig.model} shopId=${shopId || 'none'} systemPromptChars=${fullSystemPrompt.length} shopDataChars=${shopDataContext.length} lookupChars=${lookupContext.length}`)

    // Rappel injecté côté user pour forcer l'IA à exploiter le contexte (utile pour Gemini)
    const userMessageWithHint = (shopDataContext || lookupContext)
      ? `${message}\n\n[Rappel système: utilise impérativement les DONNÉES EN TEMPS RÉEL DU MAGASIN et les blocs « Réponse factuelle » ci-dessus pour répondre avec des chiffres exacts. Si un bloc « Réponse factuelle » est présent, cite EXCLUSIVEMENT ces chiffres — ne dis jamais « je ne sais pas » ni « consultez votre ERP » : tu ES l'ERP.]`
      : message

    // Construction des messages
    const chatHistory = (history && Array.isArray(history))
      ? history.slice(-10).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      : []

    let response: Response
    if (aiConfig.provider === 'gemini') {
      // Endpoint natif Gemini avec systemInstruction (gère mieux les gros contextes)
      const geminiContents = [
        ...chatHistory.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: userMessageWithHint }] },
      ]
      response = await fetch(`${aiConfig.url}?key=${encodeURIComponent(aiConfig.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents: geminiContents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
        }),
      })
    } else {
      const messages: any[] = [
        { role: 'system', content: fullSystemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessageWithHint },
      ]
      response = await fetch(aiConfig.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aiConfig.model, messages, temperature: 0.5, max_tokens: 2000 }),
      })
    }


    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[help-bot] AI API error provider=${aiConfig.provider} status=${response.status}:`, errorText.slice(0, 500))
      
      if (response.status === 429) {
        return new Response(JSON.stringify({
          message: "Le service est temporairement surchargé. Réessayez dans quelques secondes.",
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({
          message: "Les crédits IA sont épuisés. Contactez l'administrateur.",
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({
        message: "Désolé, je rencontre un problème technique. Réessayez dans quelques instants.",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const content = aiConfig.provider === 'gemini'
      ? (data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') || "Désolé, je n'ai pas pu traiter votre demande.")
      : (data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande.")

    const shouldEscalate = content.startsWith('[ESCALATE]')
    let cleanMessage = content
    let escalateSummary: string | null = null
    
    if (shouldEscalate) {
      const lines = content.replace('[ESCALATE]', '').trim().split('\n')
      escalateSummary = lines[0].trim()
      cleanMessage = lines.slice(1).join('\n').trim() || escalateSummary
    }

    return new Response(JSON.stringify({
      message: cleanMessage,
      escalate: shouldEscalate,
      escalate_summary: escalateSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Help bot error:', error)
    return new Response(JSON.stringify({
      message: "Une erreur est survenue. Réessayez.",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
