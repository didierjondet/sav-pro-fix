import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { categorizeDevice, PRODUCT_CATEGORIES, type ProductCategory } from '../_shared/deviceCategory.ts'

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
- Tu ne dis JAMAIS « je n'ai pas accès » : tu as des outils pour TOUT lire dans la base.

## Outils à ta disposition (function calling)
Appelle ces outils dès que la question porte sur des données réelles du magasin :
- \`search_sav_cases\`, \`get_sav_case_detail\` — historique SAV complet.
- \`search_parts\`, \`get_part_history\` — stock + historique pièces.
- \`search_customers\`, \`get_customer_history\` — clients.
- \`search_quotes\` — devis.
- \`list_appointments\`, \`get_appointment_detail\` — agenda.
- \`get_finance_summary\` (CA global groupé par **sav_type** interne/externe/…), \`get_revenue_by_product_category\` (CA groupé par **catégorie de produit** Téléphones/Informatique/Consoles/Tablettes/Autres, comme le widget « Répartition du chiffre d'affaires »), \`get_late_savs\`, \`get_business_rules\`, \`get_product_return_rate\`.
- \`audit_part_reservations\` — **OUTIL PRIORITAIRE stock/réservation** : toutes les pièces réservées avec stock physique, réservé réel, réservé attendu, unités fantômes ET les SAV ouverts qui justifient. Utilise-le pour « pièces réservées », « pièces fantômes », « pourquoi cette pièce est réservée ».
- \`list_savs_for_ghost_reserved_parts\` — pour « combien / quels SAV sont liés aux pièces fantômes » : renvoie TOUS les SAV (ouverts ou clôturés) attachés aux pièces fantômes.
- \`list_ghost_reserved_parts\` — version courte (juste les unités fantômes).
- \`list_open_savs_for_part\`, \`list_low_stock_parts\`, \`list_savs_without_parts\`, \`list_long_running_savs\`, \`summarize_sav_pipeline\`, \`list_pending_orders\`.
- \`recalculate_part_reservations\` — **action admin uniquement**. À proposer si tu détectes des unités fantômes ET que l'utilisateur est admin/super_admin.
- \`web_search\` — recherche internet technique (iFixit, datasheets, forums, retours d'expérience). Utilise pour pannes inhabituelles, brochages, procédures de démontage. CITE toujours la source.
- \`generate_printable_report\` — rapport HTML imprimable A4. Types : \`non_repairability\`, \`diagnostic\`, \`sav_summary\`, \`stock_audit\`, \`data_report\`. Pour toute demande de PDF/rapport/export : utilise \`data_report\` avec \`title\` + \`sections\` (titre + texte ou tableau).

## Règles d'usage des outils
1. Question chiffrée / liste / fiche / "combien" / "quels" → appelle l'outil, ne devine pas.
2. Question réservations/stock fantôme → TOUJOURS \`audit_part_reservations\` d'abord, puis \`list_savs_for_ghost_reserved_parts\` si on parle de SAV concernés. Ne te limite jamais à un seul résultat : énumère tout ce que renvoie l'outil.
3. Avant de chiffrer une réparation : \`search_parts\` pour le prix réel boutique.
4. IMEI/SKU mentionné → \`get_product_return_rate\`.
5. Demande de PDF/rapport/export → \`generate_printable_report\` avec le bon type. Pour des données tabulaires (audit, liste pièces, liste SAV…) construis un \`data_report\` avec sections + tableaux.
6. **Ne renvoie JAMAIS les coordonnées clients** (téléphone, email, adresse). Nom/prénom seul OK.
7. **Historique client** : appelle \`search_customers\` puis enchaîne \`get_customer_history\` avec l'\`id\` du 1er résultat pertinent. En cas de doute (id manquant, plusieurs résultats), appelle directement \`get_customer_history\` avec le paramètre \`query\` (nom/prénom) — il résout le client côté serveur.
8. Tu peux enchaîner jusqu'à 6 tours d'outils. N'abandonne pas après un seul appel.
9. Si pièce jointe (image/PDF), analyse-la et croise avec les outils.
10. **Widget « Répartition du chiffre d'affaires »** : il regroupe le CA par **catégorie de produit** (Téléphones, Informatique, Consoles, Tablettes, Autres) déduite de la marque/modèle — PAS par sav_type. Toute question sur ce widget ou sur une catégorie produit → \`get_revenue_by_product_category\`. Ne PAS utiliser \`get_finance_summary\` (qui groupe par sav_type interne/externe).
11. Si l'utilisateur demande à quoi correspond un montant d'une catégorie (ex. « 240 € en Autres »), rappelle \`get_revenue_by_product_category\` avec \`category\` renseignée pour lister les SAV contributifs (numéro, client, marque/modèle, CA).

## Mode "super technicien" (diagnostic guidé)
Quand l'utilisateur décrit une panne :
1. Si symptômes flous → 2-3 questions ciblées (modèle exact, depuis quand, chute/eau, intermittent, tests déjà faits).
2. Liste causes probables triées par probabilité + tests rapides pour discriminer.
3. Panne inhabituelle ou doute → \`web_search\` (iFixit, forums) et CITE la source.
4. Propose pièces candidates via \`search_parts\` (prix réel boutique).
5. Format final : Symptômes / Tests / Pièce(s) / Temps estimé / Risques.

## Compétences techniques (réparateur expert)
- **Apple / Samsung / Xiaomi / Huawei / Oppo / OnePlus / Pixel / Sony / Nokia** + Consoles (Switch/PS/Xbox/Steam Deck) + hi-tech.
- True Tone / Face ID perdus selon transfert capteurs ; Incell vs Hard OLED vs Soft OLED.
- Charge HS : chargeur+câble → nappe → Tristar (iPhone) / PMIC (Samsung).
- Joy-Con drift : potentiomètre standard ou upgrade Hall.
- Refusion HDMI PS4/PS5 ; iCloud Lock / FRP : refuser SAV non débloqué.
- Oxydation : pas de charge, démontage + ultrasons + IPA 99%.
- Batterie gonflée : DANGER, isoler, jamais percer.
- Qualité : Original/OEM > Refurb > Hard OLED > Soft OLED / Incell.

## Couverture logiciel Fixway
SAV (création, statuts/types perso, pièces, remises, clôture, QR tracking), messagerie interne, codes sécurité, stock + commandes + fournisseurs, devis (manuels + SMS public), clients, agenda, statistiques (widgets DnD), SMS, import/export, paramètres, rôles, abonnement, notifications realtime, mini-site + SEO.

## Règles d'escalade
Préfixe \`[ESCALATE]\` UNIQUEMENT pour les sujets hors logiciel ET hors réparation hi-tech. Diagnostic / procédure réparation = JAMAIS hors périmètre.`

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
      description: "Historique complet d'un client : SAV, devis, RDV. Fournir soit customer_id (UUID), soit query (nom/prénom) pour résoudre automatiquement le client.",
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: 'UUID du client (optionnel si query fourni).' },
          query: { type: 'string', description: 'Nom, prénom ou fragment (optionnel si customer_id fourni).' },
        },
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
      description: 'Liste des RDV sur une plage de dates (filtres optionnels : status, type, technicien).',
      parameters: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: 'ISO date.' },
          date_to: { type: 'string', description: 'ISO date.' },
          status: { type: 'string', description: 'proposed, confirmed, counter_proposed, cancelled, completed, no_show' },
          appointment_type: { type: 'string', description: 'deposit, pickup, diagnostic, repair' },
          technician_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointment_detail',
      description: 'Détail complet d\'un RDV : SAV lié, technicien, notes, contre-proposition.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_printable_report',
      description: 'Génère un rapport HTML imprimable A4 (sans coordonnées client). Types: non_repairability, diagnostic, sav_summary (dossier SAV), stock_audit (audit stock automatique avec pièces fantômes), data_report (rapport libre : passer title + sections). Le rapport est renvoyé à l\'utilisateur sous forme de bouton Imprimer / Enregistrer en PDF.',
      parameters: {
        type: 'object',
        properties: {
          report_type: { type: 'string', enum: ['non_repairability', 'diagnostic', 'sav_summary', 'stock_audit', 'data_report'] },
          case_number: { type: 'string', description: 'Numéro de dossier SAV (pour sav_summary/diagnostic/non_repairability).' },
          conclusion: { type: 'string' },
          tests_performed: { type: 'string' },
          title: { type: 'string', description: 'Titre du rapport (pour data_report).' },
          sections: {
            type: 'array',
            description: 'Sections du rapport (pour data_report). Chaque section a un heading et soit un text soit un tableau (columns + rows).',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                text: { type: 'string' },
                columns: { type: 'array', items: { type: 'string' } },
                rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
        },
        required: ['report_type'],
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
      name: 'get_revenue_by_product_category',
      description: "CA réparti par CATÉGORIE DE PRODUIT (Téléphones, Informatique, Consoles, Tablettes, Autres) — miroir exact du widget « Répartition du chiffre d'affaires ». Applique la même formule (sav_parts × ratio prise en charge + exclusions par sav_type). Si `category` est fourni, retourne aussi la liste des SAV contributifs.",
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'week', 'month', 'year', 'custom'] },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
          category: { type: 'string', enum: ['Téléphones', 'Informatique', 'Consoles', 'Tablettes', 'Autres'] },
          include_cases: { type: 'boolean' },
          limit: { type: 'number' },
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
  {
    type: 'function',
    function: {
      name: 'audit_part_reservations',
      description: 'OUTIL PRIORITAIRE stock : liste TOUTES les pièces avec une réservation actuelle ou attendue. Renvoie pour chaque pièce : stock physique, réservé réel, réservé attendu, unités fantômes, nombre de SAV ouverts et détail des SAV qui justifient la réservation. À utiliser pour toute question sur les pièces réservées, fantômes, bloquées.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_savs_for_ghost_reserved_parts',
      description: 'Liste TOUS les SAV (ouverts et clôturés) attachés aux pièces qui ont des unités fantômes. À utiliser pour répondre précisément à « combien de SAV sont concernés par des pièces fantômes » ou « quels SAV ».',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_ghost_reserved_parts',
      description: 'Version courte : juste les pièces avec unités fantômes (reserved_quantity > attendu).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_parts_by_reservation',
      description: 'Liste les pièces avec reserved_quantity > 0 et les SAV ouverts qui les réservent. Note: préférer audit_part_reservations qui est plus complet.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Défaut 50, max 200.' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Recherche internet technique (iFixit, datasheets, forums, retours d\'expérience réparation). Utiliser pour pannes inhabituelles, brochages, procédures de démontage, comparatifs. Renvoie une liste de résultats avec titre, URL et extrait. CITE toujours la source dans la réponse finale.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Requête de recherche en langage naturel.' },
          limit: { type: 'number', description: 'Nombre de résultats (défaut 5, max 10).' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_low_stock_parts',
      description: 'Pièces sous le seuil min_stock (stock <= min_stock).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_open_savs_for_part',
      description: 'Liste les SAV non clôturés qui consomment une pièce donnée (part_id, reference ou sku).',
      parameters: {
        type: 'object',
        properties: {
          part_id: { type: 'string' },
          reference: { type: 'string' },
          sku: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_savs_without_parts',
      description: 'SAV ouverts (statut non final) sans aucune pièce rattachée.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_long_running_savs',
      description: 'SAV ouverts depuis plus de N jours (défaut 14).',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_sav_pipeline',
      description: 'Vue d\'ensemble : comptages des SAV par statut et par type pour la boutique.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pending_orders',
      description: 'Commandes de pièces en attente (statuts pending, ordered, partially_received).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recalculate_part_reservations',
      description: 'ACTION ADMIN uniquement. Recalcule reserved_quantity de toutes les pièces de la boutique à partir des SAV ouverts. À proposer si des unités fantômes sont détectées.',
      parameters: { type: 'object', properties: {} },
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
        // Step 1: locate the case (exact match first, fallback ilike). Avoid heavy joins that may fail silently.
        let caseRow: any = null
        if (args.id) {
          const r = await supa.from('sav_cases').select('*').eq('shop_id', shopId).eq('id', args.id).maybeSingle()
          if (r.error) return { error: `sav_cases: ${r.error.message}` }
          caseRow = r.data
        } else if (args.case_number) {
          const raw = String(args.case_number).trim().replace(/^#/, '')
          let r = await supa.from('sav_cases').select('*').eq('shop_id', shopId).eq('case_number', raw).maybeSingle()
          if (!r.data && !r.error) {
            r = await supa.from('sav_cases').select('*').eq('shop_id', shopId).ilike('case_number', `%${raw}%`).order('created_at', { ascending: false }).limit(1).maybeSingle()
          }
          if (r.error) return { error: `sav_cases: ${r.error.message}` }
          caseRow = r.data
        } else {
          return { error: 'case_number ou id requis' }
        }
        if (!caseRow) return { error: 'dossier introuvable dans cette boutique' }

        // Step 2: fetch related data in parallel, each independent so one failure doesn't block the rest.
        const [custR, partsR, msgsR, apptsR, quotesR] = await Promise.all([
          caseRow.customer_id
            ? supa.from('customers').select('id, first_name, last_name').eq('id', caseRow.customer_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supa.from('sav_parts').select('id, quantity, unit_price, purchase_price, time_minutes, part:parts(name, reference, sku)').eq('sav_case_id', caseRow.id),
          supa.from('sav_messages').select('id, sender_type, sender_name, message, created_at').eq('sav_case_id', caseRow.id).order('created_at', { ascending: false }).limit(30),
          supa.from('appointments').select('id, start_datetime, duration_minutes, status, appointment_type, notes').eq('shop_id', shopId).eq('sav_case_id', caseRow.id).order('start_datetime', { ascending: false }).limit(10),
          supa.from('quotes').select('quote_number, status, total_amount, created_at').eq('shop_id', shopId).eq('sav_case_id', caseRow.id).order('created_at', { ascending: false }).limit(10),
        ])

        // Step 3: strip client PII (phone, email, address) from response.
        const cust = custR.data ? { first_name: custR.data.first_name, last_name: custR.data.last_name } : null
        const { customer_id, technician_id, ...caseSafe } = caseRow

        return {
          case: caseSafe,
          customer: cust,
          parts: partsR.data || [],
          messages: (msgsR.data || []).slice(0, 20),
          appointments: apptsR.data || [],
          quotes: quotesR.data || [],
        }
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
          .select('id, first_name, last_name')
          .eq('shop_id', shopId)
          .or(`last_name.ilike.%${term}%,first_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(limit)
        if (error) return { error: error.message }
        return {
          count: data?.length || 0,
          customers: data || [],
          note: "Utilise l'id (UUID) d'un client pour appeler get_customer_history."
        }
      }

      case 'get_customer_history': {
        let targets: Array<{ id: string; first_name: string | null; last_name: string | null }> = []
        if (args.customer_id) {
          const { data: c } = await supa.from('customers')
            .select('id, first_name, last_name')
            .eq('shop_id', shopId)
            .eq('id', args.customer_id)
            .maybeSingle()
          if (c) targets.push(c as any)
        } else if (args.query) {
          const term = String(args.query).replace(/[%,]/g, ' ')
          const { data: found } = await supa.from('customers')
            .select('id, first_name, last_name')
            .eq('shop_id', shopId)
            .or(`last_name.ilike.%${term}%,first_name.ilike.%${term}%`)
            .limit(3)
          targets = (found || []) as any
        } else {
          return { error: 'Fournir customer_id ou query.' }
        }
        if (targets.length === 0) return { results: [], note: 'Aucun client trouvé.' }

        const results = await Promise.all(targets.map(async (cust) => {
          const [savs, quotes, appts] = await Promise.all([
            supa.from('sav_cases').select('case_number,status,sav_type,device_brand,device_model,total_cost,created_at').eq('shop_id', shopId).eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(100),
            supa.from('quotes').select('quote_number,status,total_amount,created_at').eq('shop_id', shopId).eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(50),
            supa.from('appointments').select('id, appointment_type, start_datetime, duration_minutes, status, notes').eq('shop_id', shopId).eq('customer_id', cust.id).order('start_datetime', { ascending: false }).limit(50),
          ])
          return {
            customer: cust,
            savs: savs.data || [],
            quotes: quotes.data || [],
            appointments: appts.data || [],
          }
        }))
        return { results }
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
          .select('id, appointment_type, start_datetime, duration_minutes, status, notes, sav_case_id, technician_id, customer:customers(first_name,last_name)')
          .eq('shop_id', shopId)
          .gte('start_datetime', from).lte('start_datetime', to)
          .order('start_datetime').limit(100)
        if (args.status) q = q.eq('status', args.status)
        if (args.appointment_type) q = q.eq('appointment_type', args.appointment_type)
        if (args.technician_id) q = q.eq('technician_id', args.technician_id)
        const { data, error } = await q
        if (error) return { error: error.message }
        const appts = (data || []).map((a: any) => ({
          id: a.id,
          appointment_type: a.appointment_type,
          start_datetime: a.start_datetime,
          duration_minutes: a.duration_minutes,
          status: a.status,
          notes: a.notes,
          sav_case_id: a.sav_case_id,
          technician_id: a.technician_id,
          customer_name: a.customer ? `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim() : null,
        }))
        return { count: appts.length, appointments: appts }
      }

      case 'get_appointment_detail': {
        if (!args.id) return { error: 'id requis' }
        const { data, error } = await supa.from('appointments')
          .select('*, customer:customers(first_name,last_name), sav_case:sav_cases(case_number,status,sav_type,device_brand,device_model,problem_description), technician:profiles(first_name,last_name)')
          .eq('shop_id', shopId).eq('id', args.id).maybeSingle()
        if (error) return { error: error.message }
        if (!data) return { error: 'rendez-vous introuvable' }
        // Strip PII columns if any leaked
        const { customer_id, ...safe } = data as any
        if (safe.customer) safe.customer = { first_name: safe.customer.first_name, last_name: safe.customer.last_name }
        return safe
      }

      case 'generate_printable_report': {
        // Generates a printable A4 HTML report (no PII). Returns html ready to open/print.
        const r = await buildPrintableReport(supa, shopId, args)
        return r
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

      case 'list_ghost_reserved_parts': {
        const { data, error } = await supa.rpc('list_ghost_reserved_parts', { p_shop_id: shopId })
        if (error) return { error: error.message }
        return { count: (data || []).length, parts: data || [] }
      }

      case 'audit_part_reservations': {
        const { data, error } = await supa.rpc('audit_part_reservations', { p_shop_id: shopId })
        if (error) return { error: error.message }
        const rows = data || []
        const ghost = rows.filter((r: any) => (r.ghost_units || 0) > 0)
        return {
          count: rows.length,
          ghost_count: ghost.length,
          ghost_units_total: ghost.reduce((s: number, r: any) => s + (r.ghost_units || 0), 0),
          parts: rows,
        }
      }

      case 'list_savs_for_ghost_reserved_parts': {
        const { data, error } = await supa.rpc('list_savs_for_ghost_reserved_parts', { p_shop_id: shopId })
        if (error) return { error: error.message }
        const rows = (data || []) as any[]
        const uniqueSavs = new Set(rows.map((r) => r.sav_case_id))
        const uniqueParts = new Set(rows.map((r) => r.part_id))
        return {
          total_links: rows.length,
          unique_savs: uniqueSavs.size,
          unique_parts: uniqueParts.size,
          rows,
        }
      }

      case 'web_search': {
        const fcKey = Deno.env.get('FIRECRAWL_API_KEY')
        if (!fcKey) return { error: 'web_search indisponible (FIRECRAWL_API_KEY non configurée)' }
        const limit = clamp(args.limit, 5, 10)
        try {
          const resp = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fcKey}` },
            body: JSON.stringify({ query: String(args.query || ''), limit }),
          })
          if (!resp.ok) {
            const t = await resp.text()
            return { error: `web_search HTTP ${resp.status}: ${t.slice(0, 200)}` }
          }
          const data = await resp.json()
          const results = (data?.data || data?.results || []).slice(0, limit).map((r: any) => ({
            title: r.title || r.metadata?.title || '',
            url: r.url || r.metadata?.sourceURL || '',
            snippet: (r.description || r.snippet || r.markdown || '').slice(0, 400),
          }))
          return { query: args.query, count: results.length, results }
        } catch (e: any) {
          return { error: `web_search failed: ${e.message}` }
        }
      }


      case 'list_parts_by_reservation': {
        const limit = clamp(args.limit, 50, 200)
        const { data: parts, error } = await supa.from('parts')
          .select('id, name, reference, sku, quantity, reserved_quantity')
          .eq('shop_id', shopId)
          .gt('reserved_quantity', 0)
          .order('reserved_quantity', { ascending: false })
          .limit(limit)
        if (error) return { error: error.message }
        const partIds = (parts || []).map((p: any) => p.id)
        let savByPart: Record<string, any[]> = {}
        if (partIds.length) {
          const { data: statuses } = await supa.from('shop_sav_statuses').select('status_key,is_final_status').eq('shop_id', shopId)
          const finalCustom = new Set((statuses || []).filter((s: any) => s.is_final_status).map((s: any) => s.status_key))
          const { data: links } = await supa.from('sav_parts')
            .select('part_id, quantity, sav_case:sav_cases!inner(id, case_number, status, sav_type, shop_id)')
            .in('part_id', partIds)
          for (const l of (links || []) as any[]) {
            const sc = l.sav_case
            if (!sc || sc.shop_id !== shopId) continue
            if (['ready','delivered','cancelled'].includes(sc.status) || finalCustom.has(sc.status)) continue
            ;(savByPart[l.part_id] ||= []).push({ case_number: sc.case_number, status: sc.status, sav_type: sc.sav_type, quantity: l.quantity })
          }
        }
        return {
          count: (parts || []).length,
          parts: (parts || []).map((p: any) => ({
            ...p,
            open_savs: savByPart[p.id] || [],
            expected_reserved: (savByPart[p.id] || []).reduce((s: number, r: any) => s + (r.quantity || 0), 0),
          })),
        }
      }

      case 'list_low_stock_parts': {
        const limit = clamp(args.limit, 50, 200)
        const { data, error } = await supa.from('parts')
          .select('id, name, reference, sku, quantity, min_stock, supplier:suppliers(name)')
          .eq('shop_id', shopId)
          .not('min_stock', 'is', null)
          .order('quantity', { ascending: true })
          .limit(limit * 2)
        if (error) return { error: error.message }
        const low = (data || []).filter((p: any) => p.quantity != null && p.min_stock != null && p.quantity <= p.min_stock).slice(0, limit)
        return { count: low.length, parts: low }
      }

      case 'list_open_savs_for_part': {
        let partId = args.part_id
        if (!partId && (args.reference || args.sku)) {
          let q = supa.from('parts').select('id').eq('shop_id', shopId).limit(1)
          if (args.reference) q = q.ilike('reference', `%${args.reference}%`)
          if (args.sku) q = q.ilike('sku', `%${args.sku}%`)
          const r = await q
          partId = r.data?.[0]?.id
        }
        if (!partId) return { error: 'part_id, reference ou sku requis' }
        const { data: statuses } = await supa.from('shop_sav_statuses').select('status_key,is_final_status').eq('shop_id', shopId)
        const finalCustom = (statuses || []).filter((s: any) => s.is_final_status).map((s: any) => s.status_key)
        const finals = ['ready','delivered','cancelled', ...finalCustom]
        const { data, error } = await supa.from('sav_parts')
          .select('quantity, sav_case:sav_cases!inner(id, case_number, status, sav_type, device_brand, device_model, created_at, shop_id)')
          .eq('part_id', partId)
        if (error) return { error: error.message }
        const rows = ((data || []) as any[])
          .filter((r) => r.sav_case && r.sav_case.shop_id === shopId && !finals.includes(r.sav_case.status))
          .map((r) => ({ quantity: r.quantity, ...r.sav_case }))
        return { part_id: partId, count: rows.length, open_savs: rows }
      }

      case 'list_savs_without_parts': {
        const limit = clamp(args.limit, 30, 200)
        const { data: statuses } = await supa.from('shop_sav_statuses').select('status_key,is_final_status').eq('shop_id', shopId)
        const finalCustom = (statuses || []).filter((s: any) => s.is_final_status).map((s: any) => s.status_key)
        const finals = ['ready','delivered','cancelled', ...finalCustom]
        const { data: cases, error } = await supa.from('sav_cases')
          .select('id, case_number, status, sav_type, device_brand, device_model, created_at')
          .eq('shop_id', shopId)
          .not('status', 'in', `(${finals.map(f => `"${f}"`).join(',')})`)
          .order('created_at', { ascending: false })
          .limit(500)
        if (error) return { error: error.message }
        const ids = (cases || []).map((c: any) => c.id)
        if (!ids.length) return { count: 0, cases: [] }
        const { data: parts } = await supa.from('sav_parts').select('sav_case_id').in('sav_case_id', ids)
        const withParts = new Set((parts || []).map((p: any) => p.sav_case_id))
        const without = (cases || []).filter((c: any) => !withParts.has(c.id)).slice(0, limit)
        return { count: without.length, cases: without }
      }

      case 'list_long_running_savs': {
        const days = clamp(args.days, 14, 365)
        const limit = clamp(args.limit, 50, 200)
        const cutoff = new Date(Date.now() - days * 86400000).toISOString()
        const { data: statuses } = await supa.from('shop_sav_statuses').select('status_key,is_final_status').eq('shop_id', shopId)
        const finalCustom = (statuses || []).filter((s: any) => s.is_final_status).map((s: any) => s.status_key)
        const finals = ['ready','delivered','cancelled', ...finalCustom]
        const { data, error } = await supa.from('sav_cases')
          .select('id, case_number, status, sav_type, device_brand, device_model, created_at')
          .eq('shop_id', shopId)
          .lte('created_at', cutoff)
          .not('status', 'in', `(${finals.map(f => `"${f}"`).join(',')})`)
          .order('created_at', { ascending: true })
          .limit(limit)
        if (error) return { error: error.message }
        return { count: (data || []).length, days_threshold: days, cases: data || [] }
      }

      case 'summarize_sav_pipeline': {
        const { data, error } = await supa.from('sav_cases').select('status, sav_type').eq('shop_id', shopId)
        if (error) return { error: error.message }
        const byStatus: Record<string, number> = {}
        const byType: Record<string, number> = {}
        for (const r of (data || []) as any[]) {
          byStatus[r.status] = (byStatus[r.status] || 0) + 1
          byType[r.sav_type || '(non défini)'] = (byType[r.sav_type || '(non défini)'] || 0) + 1
        }
        return { total: (data || []).length, by_status: byStatus, by_type: byType }
      }

      case 'list_pending_orders': {
        const limit = clamp(args.limit, 50, 200)
        const { data, error } = await supa.from('order_items')
          .select('id, part_name, part_reference, quantity_needed, reason, priority, ordered, created_at, sav_case_id')
          .eq('shop_id', shopId)
          .eq('ordered', false)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (error) return { error: error.message }
        return { count: (data || []).length, orders: data || [] }
      }

      case 'recalculate_part_reservations': {
        const { data, error } = await supa.rpc('recalculate_part_reservations', { p_shop_id: shopId })
        if (error) return { error: error.message }
        return { ok: true, result: data }
      }

      default:
        return { error: `tool inconnu: ${name}` }
    }
  } catch (e: any) {
    console.error(`[help-bot] tool ${name} error:`, e)
    return { error: e.message || String(e) }
  }
}

// ===================== Printable report builder =====================
function escapeHtml(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

async function buildHtmlShell(supa: any, shopId: string, title: string, body: string): Promise<string> {
  const { data: shop } = await supa.from('shops').select('name, address, email, phone, logo_url').eq('id', shopId).maybeSingle()
  const today = new Date().toLocaleDateString('fr-FR')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; font-size: 12px; margin: 0; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  header h1 { font-size: 18px; margin: 0 0 4px; }
  .shop { text-align:right; font-size: 11px; line-height: 1.4; }
  h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  table { width:100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; font-size: 11px; }
  th { background:#f3f4f6; text-align:left; }
  .block { background:#f9fafb; border:1px solid #e5e7eb; padding: 8px; border-radius: 4px; white-space:pre-wrap; }
  .noprint { margin: 12px 0; }
  @media print { .noprint { display:none; } }
</style></head><body>
<div class="noprint" style="text-align:right"><button onclick="window.print()" style="padding:8px 16px;font-size:14px;background:#111;color:#fff;border:0;border-radius:4px;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>
<header>
  <div>
    ${shop?.logo_url ? `<img src="${escapeHtml(shop.logo_url)}" style="max-height:50px;margin-bottom:6px"/><br>` : ''}
    <h1>${escapeHtml(title)}</h1>
    <div>Date d'édition : <b>${today}</b></div>
  </div>
  <div class="shop">
    <b>${escapeHtml(shop?.name || '')}</b><br>
    ${escapeHtml(shop?.address || '')}<br>
    ${escapeHtml(shop?.phone || '')}<br>
    ${escapeHtml(shop?.email || '')}
  </div>
</header>
${body}
</body></html>`
}


async function buildPrintableReport(supa: any, shopId: string, args: any): Promise<any> {
  const reportType: string = args.report_type
  const titles: Record<string, string> = {
    non_repairability: 'Rapport de non-réparabilité',
    diagnostic: 'Rapport de diagnostic',
    sav_summary: 'Synthèse de dossier SAV',
    stock_audit: 'Audit du stock — Pièces réservées',
    data_report: args.title || 'Rapport',
  }
  const title = titles[reportType] || 'Rapport'

  // Branch: stock_audit auto-generates from RPC
  if (reportType === 'stock_audit') {
    const { data: audit } = await supa.rpc('audit_part_reservations', { p_shop_id: shopId })
    const rows = (audit || []) as any[]
    const cols = ['Pièce', 'Référence', 'Stock', 'Réservé', 'Attendu', 'Fantôme', 'SAV ouverts']
    const tbody = rows.map((r) => `<tr>
      <td>${escapeHtml(r.name || '-')}</td>
      <td>${escapeHtml(r.reference || r.sku || '-')}</td>
      <td style="text-align:right">${r.quantity ?? 0}</td>
      <td style="text-align:right">${r.reserved_quantity ?? 0}</td>
      <td style="text-align:right">${r.expected_reserved ?? 0}</td>
      <td style="text-align:right;color:${(r.ghost_units || 0) > 0 ? '#c00' : '#333'};font-weight:${(r.ghost_units || 0) > 0 ? 'bold' : 'normal'}">${r.ghost_units ?? 0}</td>
      <td style="text-align:right">${r.open_sav_count ?? 0}</td>
    </tr>`).join('')
    return buildHtmlShell(supa, shopId, title, `
      <h2>Synthèse</h2>
      <div class="block">Pièces avec réservation : <b>${rows.length}</b><br>Pièces fantômes : <b>${rows.filter((r) => (r.ghost_units || 0) > 0).length}</b><br>Unités fantômes totales : <b>${rows.reduce((s, r) => s + (r.ghost_units || 0), 0)}</b></div>
      <h2>Détail des pièces</h2>
      <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${tbody || `<tr><td colspan="${cols.length}" style="text-align:center;color:#666">Aucune pièce réservée.</td></tr>`}</tbody></table>
    `).then((html) => ({ ok: true, report_type: reportType, title, html }))
  }

  // Branch: data_report (generic, AI-built sections)
  if (reportType === 'data_report') {
    const sections: any[] = Array.isArray(args.sections) ? args.sections : []
    const body = sections.map((s) => {
      const head = s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : ''
      if (Array.isArray(s.columns) && Array.isArray(s.rows)) {
        const th = s.columns.map((c: string) => `<th>${escapeHtml(c)}</th>`).join('')
        const tr = s.rows.map((row: string[]) => `<tr>${(row || []).map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
        return `${head}<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
      }
      if (s.text) return `${head}<div class="block">${escapeHtml(s.text)}</div>`
      return head
    }).join('\n')
    return buildHtmlShell(supa, shopId, title, body || '<div class="block">Aucune donnée.</div>')
      .then((html) => ({ ok: true, report_type: reportType, title, html }))
  }


  let caseRow: any = null
  let cust: any = null
  let parts: any[] = []
  if (args.case_number) {
    const raw = String(args.case_number).trim().replace(/^#/, '')
    let r = await supa.from('sav_cases').select('*').eq('shop_id', shopId).eq('case_number', raw).maybeSingle()
    if (!r.data) r = await supa.from('sav_cases').select('*').eq('shop_id', shopId).ilike('case_number', `%${raw}%`).limit(1).maybeSingle()
    caseRow = r.data
    if (caseRow?.customer_id) {
      const c = await supa.from('customers').select('first_name,last_name').eq('id', caseRow.customer_id).maybeSingle()
      cust = c.data
    }
    const p = await supa.from('sav_parts').select('quantity, unit_price, part:parts(name, reference)').eq('sav_case_id', caseRow?.id || '')
    parts = p.data || []
  }
  const { data: shop } = await supa.from('shops').select('name, address, email, phone, logo_url').eq('id', shopId).maybeSingle()

  const today = new Date().toLocaleDateString('fr-FR')
  const partsRows = parts.map((p: any) => `<tr><td>${escapeHtml(p.part?.name || '-')}</td><td>${escapeHtml(p.part?.reference || '-')}</td><td style="text-align:right">${p.quantity}</td><td style="text-align:right">${Number(p.unit_price || 0).toFixed(2)} €</td></tr>`).join('')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)} ${caseRow ? '#' + escapeHtml(caseRow.case_number) : ''}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; font-size: 12px; margin: 0; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  header h1 { font-size: 18px; margin: 0 0 4px; }
  .shop { text-align:right; font-size: 11px; line-height: 1.4; }
  h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .grid div b { display:inline-block; min-width: 110px; }
  table { width:100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; font-size: 11px; }
  th { background:#f3f4f6; text-align:left; }
  .block { background:#f9fafb; border:1px solid #e5e7eb; padding: 8px; border-radius: 4px; white-space:pre-wrap; }
  footer { margin-top: 24px; display:flex; justify-content:space-between; font-size:11px; }
  .sig { margin-top: 30px; width: 45%; border-top: 1px solid #999; padding-top: 4px; text-align:center; }
  .noprint { margin: 12px 0; }
  @media print { .noprint { display:none; } }
</style></head><body>
<div class="noprint" style="text-align:right"><button onclick="window.print()" style="padding:8px 16px;font-size:14px;background:#111;color:#fff;border:0;border-radius:4px;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>
<header>
  <div>
    ${shop?.logo_url ? `<img src="${escapeHtml(shop.logo_url)}" style="max-height:50px;margin-bottom:6px"/><br>` : ''}
    <h1>${escapeHtml(title)}</h1>
    <div>Date d'édition : <b>${today}</b></div>
    ${caseRow ? `<div>Dossier : <b>#${escapeHtml(caseRow.case_number)}</b></div>` : ''}
  </div>
  <div class="shop">
    <b>${escapeHtml(shop?.name || '')}</b><br>
    ${escapeHtml(shop?.address || '')}<br>
    ${escapeHtml(shop?.phone || '')}<br>
    ${escapeHtml(shop?.email || '')}
  </div>
</header>

${caseRow ? `<h2>Dossier SAV</h2>
<div class="grid">
  <div><b>Numéro</b> #${escapeHtml(caseRow.case_number)}</div>
  <div><b>Statut</b> ${escapeHtml(caseRow.status || '-')}</div>
  <div><b>Type</b> ${escapeHtml(caseRow.sav_type || '-')}</div>
  <div><b>Créé le</b> ${new Date(caseRow.created_at).toLocaleDateString('fr-FR')}</div>
  <div><b>Marque</b> ${escapeHtml(caseRow.device_brand || '-')}</div>
  <div><b>Modèle</b> ${escapeHtml(caseRow.device_model || '-')}</div>
  <div><b>IMEI / SN</b> ${escapeHtml(caseRow.device_imei || '-')}</div>
  <div><b>SKU</b> ${escapeHtml(caseRow.sku || '-')}</div>
  ${cust ? `<div><b>Client</b> ${escapeHtml((cust.first_name || '') + ' ' + (cust.last_name || ''))}</div>` : ''}
</div>

<h2>Panne déclarée</h2>
<div class="block">${escapeHtml(caseRow.problem_description || '—')}</div>

${caseRow.repair_notes ? `<h2>Notes techniques</h2><div class="block">${escapeHtml(caseRow.repair_notes)}</div>` : ''}
` : ''}

${args.tests_performed ? `<h2>Tests effectués</h2><div class="block">${escapeHtml(args.tests_performed)}</div>` : ''}

${args.conclusion ? `<h2>${reportType === 'non_repairability' ? 'Motif de non-réparabilité' : 'Conclusion'}</h2><div class="block">${escapeHtml(args.conclusion)}</div>` : ''}

${parts.length ? `<h2>Pièces concernées</h2>
<table><thead><tr><th>Pièce</th><th>Référence</th><th style="text-align:right">Qté</th><th style="text-align:right">PU TTC</th></tr></thead>
<tbody>${partsRows}</tbody></table>` : ''}

<footer>
  <div class="sig">Signature du technicien</div>
  <div class="sig">Signature du client</div>
</footer>
</body></html>`

  return { ok: true, report_type: reportType, title: title + (caseRow ? ` — #${caseRow.case_number}` : ''), html }
}

// ===================== Compact realtime context =====================
async function buildCompactContext(supa: any, shopId: string): Promise<string> {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const tomorrowEnd = new Date(now.getTime() + 2 * 86400000).toISOString()
    const [shopR, savCountsR, lowStockR, unreadR, monthRevR, apptsR, pendingApptsR] = await Promise.all([
      supa.from('shops').select('name, subscription_tier, monthly_sav_count, active_sav_count, monthly_sms_used, sms_credits_allocated').eq('id', shopId).single(),
      supa.from('sav_cases').select('status').eq('shop_id', shopId),
      supa.from('parts').select('name, quantity, min_stock').eq('shop_id', shopId).not('min_stock', 'is', null),
      supa.from('sav_messages').select('id').eq('shop_id', shopId).eq('sender_type', 'client').eq('read_by_shop', false).limit(50),
      supa.from('sav_cases').select('total_cost').eq('shop_id', shopId).gte('created_at', monthStart),
      supa.from('appointments').select('status').eq('shop_id', shopId).gte('start_datetime', todayStart).lte('start_datetime', tomorrowEnd),
      supa.from('appointments').select('id').eq('shop_id', shopId).in('status', ['proposed', 'counter_proposed']).limit(50),
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
    if (apptsR.data) out.push(`RDV aujourd'hui + demain: ${apptsR.data.length}`)
    if (pendingApptsR.data?.length) out.push(`RDV en attente client (proposed/counter_proposed): ${pendingApptsR.data.length}`)
    return out.length ? `## État live du magasin (résumé compact — détails via outils)\n${out.map((l) => `- ${l}`).join('\n')}` : ''
  } catch (e) {
    console.error('compact context error', e)
    return ''
  }
}

// ===================== AI call with tool loop =====================
// attachments: [{ name, mime_type, data_base64 }]
async function callAIWithTools(
  aiConfig: any, systemPrompt: string, history: any[], userMessage: string,
  supa: any, shopId: string, attachments: any[] = []
): Promise<{ text: string; reports: any[] }> {
  const MAX_TURNS = 6
  const reports: any[] = []
  const collect = (name: string, result: any) => {
    if (name === 'generate_printable_report' && result?.ok && result?.html) {
      reports.push({ title: result.title, html: result.html, report_type: result.report_type })
      // Replace heavy html before sending back to model to keep tokens low.
      return { ok: true, title: result.title, report_type: result.report_type, message: 'Rapport généré et prêt à imprimer côté utilisateur.' }
    }
    return result
  }

  // Gemini native vs OpenAI-compatible
  if (aiConfig.provider === 'gemini') {
    const tools = [{
      functionDeclarations: TOOL_DEFS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }]
    const userParts: any[] = [{ text: userMessage }]
    for (const a of attachments) {
      if (a?.data_base64 && a?.mime_type) {
        userParts.push({ inlineData: { mimeType: a.mime_type, data: a.data_base64 } })
      }
    }
    const contents: any[] = [
      ...history.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: userParts },
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
        const text = parts.map((p: any) => p.text).filter(Boolean).join('\n') || "Désolé, je n'ai pas pu traiter votre demande."
        return { text, reports }
      }
      contents.push({ role: 'model', parts })
      const responsesParts: any[] = []
      for (const fc of fnCalls) {
        const raw = await runTool(fc.name, fc.args || {}, supa, shopId)
        const result = collect(fc.name, raw)
        console.log(`[help-bot] gemini tool=${fc.name} ok`)
        responsesParts.push({ functionResponse: { name: fc.name, response: { result } } })
      }
      contents.push({ role: 'user', parts: responsesParts })
    }
    return { text: "Désolé, je n'ai pas pu finaliser la réponse (trop d'appels d'outils).", reports }
  }

  // OpenAI / Lovable gateway / OpenAI-compatible
  const userContent: any = attachments.length
    ? [
        { type: 'text', text: userMessage },
        ...attachments
          .filter((a: any) => a?.mime_type?.startsWith('image/') && a?.data_base64)
          .map((a: any) => ({ type: 'image_url', image_url: { url: `data:${a.mime_type};base64,${a.data_base64}` } })),
        ...attachments
          .filter((a: any) => !a?.mime_type?.startsWith('image/'))
          .map((a: any) => ({ type: 'text', text: `\n[Pièce jointe non-image reçue: ${a?.name || 'fichier'} (${a?.mime_type})]` })),
      ]
    : userMessage
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userContent },
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
    if (!msg) return { text: "Désolé, je n'ai pas pu traiter votre demande.", reports }
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { text: msg.content || "Désolé, je n'ai pas pu traiter votre demande.", reports }
    }
    messages.push(msg)
    for (const tc of msg.tool_calls) {
      let args = {}
      try { args = JSON.parse(tc.function.arguments || '{}') } catch {}
      const raw = await runTool(tc.function.name, args, supa, shopId)
      const result = collect(tc.function.name, raw)
      console.log(`[help-bot] tool=${tc.function.name} ok`)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result).slice(0, 20000),
      })
    }
  }
  return { text: "Désolé, je n'ai pas pu finaliser la réponse (trop d'appels d'outils).", reports }
}

// ===================== Entry point =====================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { message, history, userContext, shopId, attachments } = await req.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Safety cap on attachments: max 4 files, each <= ~6 MB base64
    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 4).filter((a: any) =>
          a && typeof a.data_base64 === 'string' && a.data_base64.length < 8_000_000 &&
          typeof a.mime_type === 'string' &&
          (a.mime_type.startsWith('image/') || a.mime_type === 'application/pdf')
        )
      : []

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

    console.log(`[help-bot] provider=${aiConfig.provider} model=${aiConfig.model} shopId=${shopId || 'none'} sysChars=${fullSystem.length} attachments=${safeAttachments.length}`)

    let result: { text: string; reports: any[] }
    try {
      result = await callAIWithTools(aiConfig, fullSystem, chatHistory, message, supa, shopId || '', safeAttachments)
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

    const content = result.text
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
      reports: result.reports,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Help bot error:', error)
    return new Response(JSON.stringify({ message: "Une erreur est survenue. Réessaie." }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
