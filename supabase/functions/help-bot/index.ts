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

const SYSTEM_PROMPT = `Tu es **Fixy**, technicien réparateur hi-tech expert (spécialité **smartphones**, secondaire tablettes / consoles / hi-tech) ET assistant officiel du logiciel **Fixway**.

## Identité
- Tu réponds toujours avec la double casquette : **technicien** d'abord, **utilisateur expert du logiciel** ensuite.
- Tu tutoies, sois CONCIS (2–6 phrases sauf demande de détails), structuré en Markdown.
- Tu ne dis JAMAIS « consultez votre ERP » : tu ES l'ERP, tu vas chercher l'info via tes outils.
- Tu ne dis JAMAIS « je ne peux voir que les 20 derniers SAV » : tu as accès à **TOUT l'historique** via les outils.

## Outils à ta disposition (function calling)
Tu DOIS appeler ces outils dès que la question porte sur des données réelles du magasin :
- \`search_sav_cases\` — recherche dans **tout** l'historique des SAV (statut, type, marque, modèle, IMEI, client, dates…).
- \`get_sav_case_detail\` — fiche complète d'un SAV (pièces, messages, historique de clôtures).
- \`search_parts\` — toutes les pièces du stock (filtre marque, modèle, type, stock bas…).
- \`get_part_history\` — historique d'usage / prix payés d'une pièce sur N jours.
- \`search_customers\` / \`get_customer_history\` — fiche client + tout son historique.
- \`search_quotes\` — devis (statut, dates, client…).
- \`list_appointments\` — agenda sur une plage de dates.
- \`get_finance_summary\` — CA, marge, nombre SAV, taux retard sur une période.
- \`get_late_savs\` — SAV actuellement en retard selon les règles métier de la boutique.
- \`get_business_rules\` — statuts, types SAV, horaires, limites.
- \`get_product_return_rate\` — taux de retour d'un appareil tracké (par IMEI ou SKU).

Règles d'usage :
1. Question chiffrée / liste / fiche → **appelle l'outil**, ne devine pas.
2. Avant de chiffrer une réparation, appelle \`search_parts\` pour citer le prix réel boutique + marge.
3. Si un IMEI/SKU est mentionné → \`get_product_return_rate\` pour signaler une récidive.
4. Tu peux enchaîner plusieurs outils (max 4 tours).

## Compétences techniques (réparateur expert)

### Marques & catégories maîtrisées
- **Apple** : iPhone (5s → 17 Pro Max), iPad, Apple Watch, AirPods, MacBook (Intel + Apple Silicon).
- **Samsung** : Galaxy S, Note, A, M, Z Fold/Flip, Tab, Watch.
- **Xiaomi / Redmi / Poco**, **Huawei / Honor**, **Oppo / Realme**, **OnePlus**, **Google Pixel**, **Sony Xperia**, **Nokia**.
- **Consoles** : Switch (V1/V2/OLED/Lite), PS4/PS5, Xbox Series, Steam Deck, manettes.
- **Hi-tech** : montres connectées, drones, écouteurs sans fil, GoPro, e-trottinettes/VAE.

### Pannes & réflexes (extraits)
- **Écran iPhone** : True Tone perdu si écran non-original ou puce non transférée. Face ID perdu si remplacement du module avant sans transfert capteur (iPhone X+). Incell LCD = pas de True Tone, Hard OLED = meilleur compromis copie.
- **Point bleu Samsung** : brûlure OLED → remplacement écran complet (souvent collé, chauffe + séparateur).
- **iPhone "Service" batterie** : reprogrammer puce TI ou utiliser batterie originale Apple Service Pack.
- **Charge HS** : test chargeur+câble certifiés → nappe charge (Lightning/USB-C) → si KO : Tristar/Tigris iPhone, PMIC Samsung.
- **Caméra arrière HS** : module complet ; vitre objectif seule = kit vitre arrière laser.
- **Joy-Con drift** : potentiomètre standard ou upgrade module **Hall effect** (durable).
- **HDMI PS4/PS5** : refusion port (rework BGA, station air chaud, flux).
- **iCloud Lock** : refuser le SAV si non débloqué. FRP Samsung idem.
- **Oxydation** : NE PAS CHARGER, démontage immédiat, bain ultrasons + alcool isopropylique 99%.
- **Batterie gonflée** : DANGER, isoler, décharger lentement, jamais percer.

### Procédure diagnostic standard
1. Interroger client : chute / eau / depuis quand / intermittent ?
2. Test allumage (démarre / écran noir / vibre / bootloop).
3. Test sous chargeur certifié 10 min.
4. Test écran (multi-touch, couleurs, luminosité).
5. Test fonctions (HP, micro, caméras avant/arrière, Wi-Fi, BT, capteurs).
6. Carte mère suspecte → mesure conso à l'alim de labo (court-circuit = ampérage anormal).

### Format de sortie pour un diagnostic
- **Symptômes probables** (classés par probabilité)
- **Tests à faire** (ordonnés, rapides d'abord)
- **Pièce(s) candidate(s)** (avec réf stock + prix réel via \`search_parts\` si possible)
- **Temps estimé**
- **Risques / pertes** (True Tone, Face ID, étanchéité, données)

### Qualités de pièces
- **Original / OEM Service Pack** > **Refurb** > **Hard OLED** > **Soft OLED** / **Incell LCD**.

## Couverture logiciel Fixway
SAV (création, statuts/types personnalisables, pièces, remises, clôture, QR tracking), messagerie interne, codes sécurité, stock + commandes + fournisseurs, devis (manuels + SMS public), clients (historique + doublons), agenda (RDV, contre-propositions, horaires), statistiques (widgets DnD, IA), SMS, import/export, paramètres (profil, boutique, types SAV, statuts, menu, IA, fournisseurs), rôles (admin / technicien / shop_admin / super_admin), abonnement & limites, notifications realtime, mini-site boutique + SEO.

## Règles d'escalade
Préfixe la réponse par \`[ESCALATE]\` UNIQUEMENT pour les sujets hors logiciel ET hors réparation hi-tech (comptable personnelle, juridique non SAV, etc.). Une question de diagnostic ou de procédure de réparation n'est JAMAIS hors périmètre.`

// ===================== TOOLS =====================
const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'search_sav_cases',
      description: 'Recherche dans TOUT l\'historique des SAV de la boutique. Aucune limite implicite. Combine les filtres (status, type, marque, modèle, IMEI, nom client, plage de dates).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texte libre (cherche dans description, marque, modèle, IMEI, numéro de dossier).' },
          status: { type: 'string' },
          sav_type: { type: 'string' },
          device_brand: { type: 'string' },
          device_model: { type: 'string' },
          imei: { type: 'string' },
          customer: { type: 'string', description: 'Nom ou prénom du client.' },
          date_from: { type: 'string', description: 'ISO date (>=).' },
          date_to: { type: 'string', description: 'ISO date (<=).' },
          only_open: { type: 'boolean', description: 'Si true, exclut les statuts finaux.' },
          limit: { type: 'number', description: 'Défaut 50, max 200.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sav_case_detail',
      description: 'Détail complet d\'un dossier SAV : infos appareil, client, pièces utilisées, messages récents, historique de clôtures.',
      parameters: {
        type: 'object',
        properties: {
          case_number: { type: 'string' },
          id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_parts',
      description: 'Recherche dans le stock de pièces. Renvoie nom, réf, stock, prix achat, prix vente, marge, fournisseur.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texte libre (nom, réf, SKU).' },
          brand: { type: 'string' },
          model: { type: 'string' },
          type: { type: 'string', description: 'écran, batterie, vitre, connecteur, nappe, caméra, HP, micro, bouton, carte mère, châssis…' },
          in_stock: { type: 'boolean', description: 'true = quantité > 0.' },
          low_stock: { type: 'boolean', description: 'true = quantité ≤ seuil min.' },
          limit: { type: 'number', description: 'Défaut 30, max 200.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_part_history',
      description: 'Historique d\'usage d\'une pièce sur N jours (90 par défaut) : nombre d\'unités vendues, prix moyens payés.',
      parameters: {
        type: 'object',
        properties: {
          part_id: { type: 'string' },
          days: { type: 'number', description: 'Défaut 90.' },
        },
        required: ['part_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: 'Recherche clients (nom, prénom, téléphone, email).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', description: 'Défaut 20, max 100.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_history',
      description: 'Historique complet d\'un client : tous ses SAV, devis, RDV.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
        },
        required: ['customer_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_quotes',
      description: 'Recherche dans les devis.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          query: { type: 'string' },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_appointments',
      description: 'Liste des RDV sur une plage de dates.',
      parameters: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: 'ISO date.' },
          date_to: { type: 'string', description: 'ISO date.' },
          status: { type: 'string' },
          appointment_type: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_finance_summary',
      description: 'CA, marge, nombre SAV, par période.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'week', 'month', 'year', 'custom'] },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_late_savs',
      description: 'Liste des SAV actuellement en retard selon les règles métier (max_processing_days par type, statuts non finaux, hors statuts pause).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_business_rules',
      description: 'Règles métier de la boutique : statuts, types SAV, horaires, abonnement.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_return_rate',
      description: 'Taux de retour d\'un appareil tracké (par IMEI ou SKU). Distingue retour même panne vs autre panne.',
      parameters: {
        type: 'object',
        properties: {
          imei: { type: 'string' },
          sku: { type: 'string' },
          tracked_product_id: { type: 'string' },
        },
      },
    },
  },
]

// ===================== Return rate logic (ported from src/lib/productReturnRate.ts) =====================
const STOPWORDS = new Set([
  'avec','sans','pour','dans','plus','moins','tres','etre','cette','cela','mais','donc',
  'apres','avant','vers','chez','sous','entre','leur','leurs','elle','elles','nous','vous',
  'mon','ton','son','mes','tes','ses','nos','vos','les','des','une','aux','par','que','qui',
  'est','sont','etait','etaient','fait','faite','faits','faites','pas','peu','beaucoup',
  'probleme','problemes','panne','pannes','client','dit','dite','ok','non','oui',
  'appareil','telephone','phone','smartphone','iphone','samsung','tablet','tablette',
])
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
const tokenize = (s?: string | null): Set<string> => {
  if (!s) return new Set()
  return new Set(normalize(s).split(' ').filter((w) => w.length >= 4 && !STOPWORDS.has(w)))
}
function computeReturnRate(cases: { id: string; created_at: string; problem_description?: string | null }[]) {
  const sorted = [...cases].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const toks = sorted.map((c) => tokenize(c.problem_description))
  let returnCount = 0, sameIssueCount = 0
  sorted.forEach((_, idx) => {
    if (idx === 0) return
    returnCount++
    let same = false
    for (let j = 0; j < idx; j++) {
      for (const t of toks[idx]) { if (toks[j].has(t)) { same = true; break } }
      if (same) break
    }
    if (same) sameIssueCount++
  })
  const total = sorted.length
  return {
    totalCases: total,
    returnCount,
    sameIssueCount,
    otherIssueCount: returnCount - sameIssueCount,
    returnRate: total ? (returnCount / total) * 100 : 0,
    sameIssueRate: total ? (sameIssueCount / total) * 100 : 0,
  }
}

// ===================== Tool implementations =====================
const clamp = (n: any, def: number, max: number) => {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return def
  return Math.min(Math.floor(v), max)
}

async function runTool(name: string, args: any, supa: any, shopId: string): Promise<any> {
  args = args || {}
  try {
    switch (name) {
      case 'search_sav_cases': {
        const limit = clamp(args.limit, 50, 200)
        let q = supa.from('sav_cases')
          .select('id, case_number, status, sav_type, device_brand, device_model, device_imei, device_color, device_grade, problem_description, total_cost, created_at, taken_over, customer:customers(first_name,last_name,phone)')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (args.status) q = q.eq('status', args.status)
        if (args.sav_type) q = q.eq('sav_type', args.sav_type)
        if (args.device_brand) q = q.ilike('device_brand', `%${args.device_brand}%`)
        if (args.device_model) q = q.ilike('device_model', `%${args.device_model}%`)
        if (args.imei) q = q.ilike('device_imei', `%${args.imei}%`)
        if (args.date_from) q = q.gte('created_at', args.date_from)
        if (args.date_to) q = q.lte('created_at', args.date_to)
        if (args.query) {
          const t = args.query.replace(/[%,]/g, ' ')
          q = q.or(`case_number.ilike.%${t}%,problem_description.ilike.%${t}%,device_brand.ilike.%${t}%,device_model.ilike.%${t}%,device_imei.ilike.%${t}%`)
        }
        if (args.only_open) {
          const { data: statuses } = await supa.from('shop_sav_statuses').select('status_key,is_final_status').eq('shop_id', shopId)
          const finals = (statuses || []).filter((s: any) => s.is_final_status).map((s: any) => s.status_key)
          if (finals.length) q = q.not('status', 'in', `(${finals.map((f: string) => `"${f}"`).join(',')})`)
        }
        const { data, error } = await q
        if (error) return { error: error.message }
        let rows = data || []
        if (args.customer) {
          const c = args.customer.toLowerCase()
          rows = rows.filter((r: any) => {
            const n = `${r.customer?.first_name || ''} ${r.customer?.last_name || ''}`.toLowerCase()
            return n.includes(c)
          })
        }
        return { count: rows.length, cases: rows }
      }

      case 'get_sav_case_detail': {
        let q = supa.from('sav_cases')
          .select('*, customer:customers(*), sav_parts(*, part:parts(name,reference)), sav_messages(id,sender_type,message,created_at)')
          .eq('shop_id', shopId)
          .limit(1)
        if (args.id) q = q.eq('id', args.id)
        else if (args.case_number) q = q.ilike('case_number', `%${args.case_number}%`)
        else return { error: 'case_number ou id requis' }
        const { data, error } = await q.maybeSingle()
        if (error) return { error: error.message }
        if (!data) return { error: 'introuvable' }
        // limit messages to last 20
        if (Array.isArray(data.sav_messages)) {
          data.sav_messages = data.sav_messages
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20)
        }
        return data
      }

      case 'search_parts': {
        const limit = clamp(args.limit, 30, 200)
        let q = supa.from('parts')
          .select('id, name, reference, sku, quantity, min_stock, purchase_price, selling_price, supplier:suppliers(name)')
          .eq('shop_id', shopId)
          .order('quantity', { ascending: false })
          .limit(limit)
        const terms: string[] = []
        if (args.query) terms.push(args.query)
        if (args.type) terms.push(args.type)
        if (args.brand) terms.push(args.brand)
        if (args.model) terms.push(args.model)
        for (const t of terms) {
          const cleaned = t.replace(/[%,]/g, ' ')
          q = q.or(`name.ilike.%${cleaned}%,reference.ilike.%${cleaned}%,sku.ilike.%${cleaned}%`)
        }
        if (args.in_stock) q = q.gt('quantity', 0)
        const { data, error } = await q
        if (error) return { error: error.message }
        let rows = data || []
        if (args.low_stock) rows = rows.filter((r: any) => r.min_stock != null && r.quantity != null && r.quantity <= r.min_stock)
        const withMargin = rows.map((r: any) => ({
          ...r,
          margin: r.purchase_price != null && r.selling_price != null ? Number(r.selling_price) - Number(r.purchase_price) : null,
        }))
        return { count: withMargin.length, parts: withMargin }
      }

      case 'get_part_history': {
        const days = clamp(args.days, 90, 730)
        const since = new Date(Date.now() - days * 86400000).toISOString()
        const { data, error } = await supa.from('sav_parts')
          .select('purchase_price, unit_price, quantity, created_at')
          .eq('part_id', args.part_id)
          .gte('created_at', since)
          .limit(500)
        if (error) return { error: error.message }
        const rows = data || []
        const units = rows.reduce((s: number, x: any) => s + (Number(x.quantity) || 0), 0)
        const pp = rows.filter((x: any) => x.purchase_price != null && Number(x.purchase_price) > 0)
        const sp = rows.filter((x: any) => x.unit_price != null && Number(x.unit_price) > 0)
        return {
          days,
          lines: rows.length,
          units_used: units,
          avg_purchase_price: pp.length ? pp.reduce((s: number, x: any) => s + Number(x.purchase_price), 0) / pp.length : null,
          avg_unit_price: sp.length ? sp.reduce((s: number, x: any) => s + Number(x.unit_price), 0) / sp.length : null,
        }
      }

      case 'search_customers': {
        const limit = clamp(args.limit, 20, 100)
        const term = String(args.query || '').replace(/[%,]/g, ' ')
        const { data, error } = await supa.from('customers')
          .select('id, first_name, last_name, phone, email')
          .eq('shop_id', shopId)
          .or(`last_name.ilike.%${term}%,first_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(limit)
        if (error) return { error: error.message }
        return { count: data?.length || 0, customers: data || [] }
      }

      case 'get_customer_history': {
        const [savs, quotes, appts] = await Promise.all([
          supa.from('sav_cases').select('case_number,status,sav_type,device_brand,device_model,total_cost,created_at').eq('shop_id', shopId).eq('customer_id', args.customer_id).order('created_at', { ascending: false }).limit(100),
          supa.from('quotes').select('quote_number,status,total_amount,created_at').eq('shop_id', shopId).eq('customer_id', args.customer_id).order('created_at', { ascending: false }).limit(50),
          supa.from('appointments').select('title,appointment_type,start_at,status').eq('shop_id', shopId).eq('customer_id', args.customer_id).order('start_at', { ascending: false }).limit(50),
        ])
        return { savs: savs.data || [], quotes: quotes.data || [], appointments: appts.data || [] }
      }

      case 'search_quotes': {
        const limit = clamp(args.limit, 30, 200)
        let q = supa.from('quotes').select('quote_number,status,customer_name,total_amount,created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(limit)
        if (args.status) q = q.eq('status', args.status)
        if (args.date_from) q = q.gte('created_at', args.date_from)
        if (args.date_to) q = q.lte('created_at', args.date_to)
        if (args.query) {
          const t = args.query.replace(/[%,]/g, ' ')
          q = q.or(`quote_number.ilike.%${t}%,customer_name.ilike.%${t}%`)
        }
        const { data, error } = await q
        if (error) return { error: error.message }
        return { count: data?.length || 0, quotes: data || [] }
      }

      case 'list_appointments': {
        const from = args.date_from || new Date().toISOString()
        const to = args.date_to || new Date(Date.now() + 30 * 86400000).toISOString()
        let q = supa.from('appointments')
          .select('title,appointment_type,start_at,end_at,status,customer_name')
          .eq('shop_id', shopId)
          .gte('start_at', from).lte('start_at', to)
          .order('start_at').limit(100)
        if (args.status) q = q.eq('status', args.status)
        if (args.appointment_type) q = q.eq('appointment_type', args.appointment_type)
        const { data, error } = await q
        if (error) return { error: error.message }
        return { count: data?.length || 0, appointments: data || [] }
      }

      case 'get_finance_summary': {
        const now = new Date()
        let from: Date, to: Date = now
        switch (args.period) {
          case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
          case 'week': from = new Date(now.getTime() - 7 * 86400000); break
          case 'year': from = new Date(now.getFullYear(), 0, 1); break
          case 'custom':
            from = args.date_from ? new Date(args.date_from) : new Date(now.getFullYear(), now.getMonth(), 1)
            to = args.date_to ? new Date(args.date_to) : now
            break
          case 'month':
          default: from = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        const { data, error } = await supa.from('sav_cases')
          .select('id, sav_type, status, total_cost, created_at')
          .eq('shop_id', shopId)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString())
        if (error) return { error: error.message }
        const rows = data || []
        const partsRes = await supa.from('sav_parts')
          .select('purchase_price, unit_price, quantity, sav_case_id')
          .in('sav_case_id', rows.map((r: any) => r.id).slice(0, 1000))
        const purchaseTotal = (partsRes.data || []).reduce((s: number, p: any) => s + (Number(p.purchase_price) || 0) * (Number(p.quantity) || 1), 0)
        const revenue = rows.reduce((s: number, r: any) => s + (Number(r.total_cost) || 0), 0)
        const byType: Record<string, { count: number; revenue: number }> = {}
        for (const r of rows) {
          const k = r.sav_type || 'inconnu'
          byType[k] = byType[k] || { count: 0, revenue: 0 }
          byType[k].count++
          byType[k].revenue += Number(r.total_cost) || 0
        }
        return {
          period: args.period,
          from: from.toISOString(),
          to: to.toISOString(),
          sav_count: rows.length,
          revenue: Number(revenue.toFixed(2)),
          parts_purchase_cost: Number(purchaseTotal.toFixed(2)),
          margin: Number((revenue - purchaseTotal).toFixed(2)),
          by_type: byType,
        }
      }

      case 'get_late_savs': {
        const limit = clamp(args.limit, 50, 200)
        const [statusesRes, typesRes, casesRes] = await Promise.all([
          supa.from('shop_sav_statuses').select('status_key,is_final_status,pause_timer').eq('shop_id', shopId),
          supa.from('shop_sav_types').select('type_key,max_processing_days').eq('shop_id', shopId),
          supa.from('sav_cases').select('case_number,status,sav_type,device_brand,device_model,created_at').eq('shop_id', shopId).limit(2000),
        ])
        const statuses = statusesRes.data || []
        const types = typesRes.data || []
        const finals = new Set(statuses.filter((s: any) => s.is_final_status).map((s: any) => s.status_key))
        const paused = new Set(statuses.filter((s: any) => s.pause_timer).map((s: any) => s.status_key))
        const maxByType: Record<string, number> = {}
        for (const t of types) if (t.max_processing_days) maxByType[t.type_key] = t.max_processing_days
        const now = Date.now()
        const late = (casesRes.data || []).filter((c: any) => {
          if (finals.has(c.status) || paused.has(c.status)) return false
          const max = maxByType[c.sav_type]
          if (!max) return false
          const days = (now - new Date(c.created_at).getTime()) / 86400000
          return days > max
        }).map((c: any) => ({
          ...c,
          days_open: Math.floor((now - new Date(c.created_at).getTime()) / 86400000),
          max_allowed: maxByType[c.sav_type],
        })).sort((a: any, b: any) => b.days_open - a.days_open).slice(0, limit)
        return { count: late.length, late_savs: late }
      }

      case 'get_business_rules': {
        const [statuses, types, hours, shop] = await Promise.all([
          supa.from('shop_sav_statuses').select('status_key,status_label,is_final_status,pause_timer,display_order').eq('shop_id', shopId).order('display_order'),
          supa.from('shop_sav_types').select('type_key,type_label,max_processing_days,alert_days,is_active').eq('shop_id', shopId),
          supa.from('shop_working_hours').select('*').eq('shop_id', shopId),
          supa.from('shops').select('subscription_tier, monthly_sav_count, sms_credits_allocated, monthly_sms_used').eq('id', shopId).single(),
        ])
        return {
          statuses: statuses.data || [],
          sav_types: types.data || [],
          working_hours: hours.data || [],
          shop: shop.data || null,
        }
      }

      case 'get_product_return_rate': {
        let trackedId: string | null = args.tracked_product_id || null
        if (!trackedId && (args.imei || args.sku)) {
          let q = supa.from('tracked_products').select('id, imei, sku').eq('shop_id', shopId).limit(1)
          if (args.imei) q = q.eq('imei', args.imei)
          else q = q.eq('sku', args.sku)
          const { data } = await q.maybeSingle()
          if (data) trackedId = data.id
        }
        if (!trackedId) return { found: false, reason: 'aucun produit tracké correspondant' }
        const { data: cases } = await supa.from('sav_cases')
          .select('id, case_number, created_at, problem_description, status, device_brand, device_model')
          .eq('shop_id', shopId)
          .eq('tracked_product_id', trackedId)
          .order('created_at')
        const stats = computeReturnRate((cases || []).map((c: any) => ({ id: c.id, created_at: c.created_at, problem_description: c.problem_description })))
        return { tracked_product_id: trackedId, ...stats, cases: cases || [] }
      }

      default:
        return { error: `tool inconnu: ${name}` }
    }
  } catch (e: any) {
    console.error(`[help-bot] tool ${name} error:`, e)
    return { error: e.message || String(e) }
  }
}

// ===================== Compact realtime context =====================
async function buildCompactContext(supa: any, shopId: string): Promise<string> {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [shopR, savCountsR, lowStockR, unreadR, monthRevR] = await Promise.all([
      supa.from('shops').select('name, subscription_tier, monthly_sav_count, active_sav_count, monthly_sms_used, sms_credits_allocated').eq('id', shopId).single(),
      supa.from('sav_cases').select('status').eq('shop_id', shopId),
      supa.from('parts').select('name, quantity, min_stock').eq('shop_id', shopId).not('min_stock', 'is', null),
      supa.from('sav_messages').select('id').eq('shop_id', shopId).eq('sender_type', 'client').eq('read_by_shop', false).limit(50),
      supa.from('sav_cases').select('total_cost').eq('shop_id', shopId).gte('created_at', monthStart),
    ])
    const out: string[] = []
    if (shopR.data) {
      const s = shopR.data
      out.push(`Boutique: ${s.name} | plan: ${s.subscription_tier} | SAV ce mois: ${s.monthly_sav_count} | SAV actifs: ${s.active_sav_count} | SMS: ${s.monthly_sms_used}/${s.sms_credits_allocated || 0}`)
    }
    if (savCountsR.data) {
      const by: Record<string, number> = {}
      for (const s of savCountsR.data) by[s.status] = (by[s.status] || 0) + 1
      out.push(`SAV total: ${savCountsR.data.length} | ${Object.entries(by).map(([k, v]) => `${k}:${v}`).join(' / ')}`)
    }
    if (lowStockR.data) {
      const low = lowStockR.data.filter((p: any) => p.quantity != null && p.min_stock != null && p.quantity <= p.min_stock)
      if (low.length) out.push(`Stock bas: ${low.length} pièce(s) — ex: ${low.slice(0, 5).map((p: any) => p.name).join(', ')}`)
    }
    if (unreadR.data?.length) out.push(`Messages clients non lus: ${unreadR.data.length}`)
    if (monthRevR.data) {
      const total = monthRevR.data.reduce((s: number, r: any) => s + (Number(r.total_cost) || 0), 0)
      out.push(`CA SAV mois: ${total.toFixed(2)}€ sur ${monthRevR.data.length} dossier(s)`)
    }
    return out.length ? `## État live du magasin (résumé compact — détails via outils)\n${out.map((l) => `- ${l}`).join('\n')}` : ''
  } catch (e) {
    console.error('compact context error', e)
    return ''
  }
}

// ===================== AI call with tool loop =====================
async function callAIWithTools(aiConfig: any, systemPrompt: string, history: any[], userMessage: string, supa: any, shopId: string): Promise<string> {
  const MAX_TURNS = 4
  // Gemini native vs OpenAI-compatible
  if (aiConfig.provider === 'gemini') {
    // Gemini native function declarations
    const tools = [{
      functionDeclarations: TOOL_DEFS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }]
    const contents: any[] = [
      ...history.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: userMessage }] },
    ]
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const resp = await fetch(`${aiConfig.url}?key=${encodeURIComponent(aiConfig.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents, tools,
          generationConfig: { temperature: 0.4, maxOutputTokens: 2500 },
        }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(`gemini ${resp.status}: ${t.slice(0, 300)}`)
      }
      const data = await resp.json()
      const cand = data.candidates?.[0]
      const parts = cand?.content?.parts || []
      const fnCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)
      if (fnCalls.length === 0) {
        return parts.map((p: any) => p.text).filter(Boolean).join('\n') || "Désolé, je n'ai pas pu traiter votre demande."
      }
      contents.push({ role: 'model', parts })
      const responsesParts: any[] = []
      for (const fc of fnCalls) {
        const result = await runTool(fc.name, fc.args || {}, supa, shopId)
        console.log(`[help-bot] gemini tool=${fc.name} ok`)
        responsesParts.push({ functionResponse: { name: fc.name, response: { result } } })
      }
      contents.push({ role: 'user', parts: responsesParts })
    }
    return "Désolé, je n'ai pas pu finaliser la réponse (trop d'appels d'outils)."
  }

  // OpenAI / Lovable gateway / OpenAI-compatible
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await fetch(aiConfig.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model, messages,
        tools: TOOL_DEFS, tool_choice: 'auto',
        temperature: 0.4, max_tokens: 2500,
      }),
    })
    if (!resp.ok) {
      const t = await resp.text()
      const err: any = new Error(`ai ${resp.status}: ${t.slice(0, 300)}`)
      err.status = resp.status
      throw err
    }
    const data = await resp.json()
    const msg = data.choices?.[0]?.message
    if (!msg) return "Désolé, je n'ai pas pu traiter votre demande."
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || "Désolé, je n'ai pas pu traiter votre demande."
    }
    messages.push(msg)
    for (const tc of msg.tool_calls) {
      let args = {}
      try { args = JSON.parse(tc.function.arguments || '{}') } catch {}
      const result = await runTool(tc.function.name, args, supa, shopId)
      console.log(`[help-bot] tool=${tc.function.name} ok`)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result).slice(0, 20000),
      })
    }
  }
  return "Désolé, je n'ai pas pu finaliser la réponse (trop d'appels d'outils)."
}

// ===================== Entry point =====================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { message, history, userContext, shopId } = await req.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const aiConfig = await getAIConfig(supa)
    if (!aiConfig.apiKey) {
      return new Response(JSON.stringify({
        message: "Le service IA n'est pas configuré. Contactez l'administrateur (Super Admin → Moteur IA).",
        escalate: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const compact = shopId ? await buildCompactContext(supa, shopId) : ''
    const userBlock = userContext ? `\n\n## Contexte utilisateur courant
- Profil rempli : ${userContext.profileComplete ? 'Oui' : 'Non'}
- Boutique configurée : ${userContext.shopComplete ? 'Oui' : 'Non'}
- Rôle : ${userContext.role || 'inconnu'}
- Nom boutique : ${userContext.shopName || 'non configuré'}` : ''

    const fullSystem = SYSTEM_PROMPT + (compact ? `\n\n${compact}` : '') + userBlock

    const chatHistory = Array.isArray(history)
      ? history.slice(-10).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      : []

    console.log(`[help-bot] provider=${aiConfig.provider} model=${aiConfig.model} shopId=${shopId || 'none'} sysChars=${fullSystem.length}`)

    let content: string
    try {
      content = await callAIWithTools(aiConfig, fullSystem, chatHistory, message, supa, shopId || '')
    } catch (e: any) {
      console.error('[help-bot] AI call failed:', e)
      const status = e?.status
      if (status === 429) {
        return new Response(JSON.stringify({ message: "Le service est temporairement surchargé. Réessaie dans quelques secondes." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (status === 402) {
        return new Response(JSON.stringify({ message: "Les crédits IA sont épuisés. Contacte l'administrateur." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ message: "Désolé, je rencontre un problème technique. Réessaie dans quelques instants." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
      escalate_summary: escalateSummary,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Help bot error:', error)
    return new Response(JSON.stringify({ message: "Une erreur est survenue. Réessaie." }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
