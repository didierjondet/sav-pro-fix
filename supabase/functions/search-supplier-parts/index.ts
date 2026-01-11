import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplierConfig {
  id: string;
  supplier_name: string;
  supplier_url: string;
  username: string | null;
  password_encrypted: string | null;
  price_coefficient: number;
  is_enabled: boolean;
}

interface SupplierPart {
  name: string;
  reference: string;
  supplier: string;
  purchasePrice: number;
  publicPrice: number;
  availability: string;
  imageUrl?: string;
  url?: string;
}

// Round price intelligently
function roundPrice(price: number): number {
  if (price < 10) return Math.ceil(price);
  if (price < 50) return Math.ceil(price / 5) * 5;
  if (price < 100) return Math.ceil(price / 10) * 10;
  return Math.ceil(price / 10) * 10;
}

// Extract products from scraped content using LLM-style extraction via JSON format
async function scrapeWithJsonExtraction(
  searchUrl: string,
  supplierName: string,
  config: SupplierConfig,
  firecrawlApiKey: string
): Promise<SupplierPart[]> {
  console.log(`Scraping ${supplierName}:`, searchUrl);
  
  try {
    // Use Firecrawl with JSON extraction for structured data
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: [
          'markdown',
          {
            type: 'json',
            prompt: `Extract all products from this page. For each product, extract:
- name: the product name/title
- price: the price in euros (as a number, without € symbol)
- reference: the product reference/SKU if available
- availability: whether it's in stock or not
- imageUrl: the product image URL if available
- url: the product page URL if available

Return an array of products. Include ALL products visible on the page, even partial matches.`
          }
        ],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error(`Firecrawl error for ${supplierName}:`, data);
      // Fallback to markdown parsing
      return parseMarkdownResults(data.data?.markdown || '', supplierName, config);
    }

    // Try to use JSON extraction first
    const jsonData = data.data?.json;
    if (jsonData) {
      console.log(`JSON extraction successful for ${supplierName}:`, JSON.stringify(jsonData).substring(0, 500));
      return parseJsonResults(jsonData, supplierName, config);
    }

    // Fallback to markdown parsing
    console.log(`Falling back to markdown parsing for ${supplierName}`);
    return parseMarkdownResults(data.data?.markdown || '', supplierName, config);
  } catch (error) {
    console.error(`Error scraping ${supplierName}:`, error);
    return [];
  }
}

// Parse JSON extraction results
function parseJsonResults(jsonData: any, supplierName: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  // Handle various JSON structures
  let products: any[] = [];
  
  if (Array.isArray(jsonData)) {
    products = jsonData;
  } else if (jsonData?.products && Array.isArray(jsonData.products)) {
    products = jsonData.products;
  } else if (jsonData?.items && Array.isArray(jsonData.items)) {
    products = jsonData.items;
  } else if (typeof jsonData === 'object') {
    // Try to find an array in the object
    for (const key of Object.keys(jsonData)) {
      if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
        products = jsonData[key];
        break;
      }
    }
  }
  
  for (const product of products) {
    if (!product || typeof product !== 'object') continue;
    
    const name = product.name || product.title || product.productName || '';
    if (!name) continue;
    
    // Parse price from various formats
    let price = 0;
    const rawPrice = product.price || product.prix || product.cost || 0;
    if (typeof rawPrice === 'number') {
      price = rawPrice;
    } else if (typeof rawPrice === 'string') {
      const priceMatch = rawPrice.match(/(\d+)[.,]?(\d*)/);
      if (priceMatch) {
        price = parseFloat(`${priceMatch[1]}.${priceMatch[2] || '00'}`);
      }
    }
    
    if (price <= 0) continue; // Skip products without valid price
    
    parts.push({
      name: name.trim(),
      reference: (product.reference || product.ref || product.sku || '').toString(),
      supplier: supplierName,
      purchasePrice: price,
      publicPrice: roundPrice(price * config.price_coefficient),
      availability: product.availability || product.stock || 'En stock',
      imageUrl: product.imageUrl || product.image || undefined,
      url: product.url || product.link || undefined,
    });
  }
  
  return parts.slice(0, 20);
}

// Parse markdown results (fallback method)
function parseMarkdownResults(content: string, supplierName: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  if (!content || content.trim() === '') {
    console.log(`No markdown content for ${supplierName}`);
    return parts;
  }
  
  console.log(`Parsing markdown for ${supplierName}, content length: ${content.length}`);
  
  // Split content into potential product blocks
  const blocks = content.split(/\n{2,}/);
  
  for (const block of blocks) {
    // Skip navigation, headers, footers
    if (block.includes('Menu') || block.includes('Panier') || block.includes('Connexion') ||
        block.includes('©') || block.includes('Cookie') || block.includes('newsletter')) {
      continue;
    }
    
    // Look for price pattern
    const priceMatches = block.match(/(\d+)[.,](\d{2})\s*€/g);
    if (!priceMatches || priceMatches.length === 0) continue;
    
    // Extract price
    const priceMatch = priceMatches[0].match(/(\d+)[.,](\d{2})/);
    if (!priceMatch) continue;
    
    const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
    if (price <= 0 || price > 2000) continue; // Sanity check
    
    // Extract product name - look for bold text, headers, or first significant line
    let name = '';
    
    // Try to find product name from headers or bold
    const headerMatch = block.match(/^#+\s*(.+)/m);
    const boldMatch = block.match(/\*\*([^*]+)\*\*/);
    const linkMatch = block.match(/\[([^\]]+)\]/);
    
    if (headerMatch) {
      name = headerMatch[1].trim();
    } else if (boldMatch) {
      name = boldMatch[1].trim();
    } else if (linkMatch) {
      name = linkMatch[1].trim();
    } else {
      // Take first line that looks like a product name
      const lines = block.split('\n');
      for (const line of lines) {
        const cleanLine = line.replace(/[#*\[\]]/g, '').trim();
        if (cleanLine.length > 10 && cleanLine.length < 200 && 
            !cleanLine.includes('€') && !cleanLine.match(/^\d+$/)) {
          name = cleanLine;
          break;
        }
      }
    }
    
    if (!name || name.length < 5) continue;
    
    // Clean up name
    name = name.replace(/\s+/g, ' ').trim();
    
    // Skip if it looks like navigation or generic text
    if (name.toLowerCase().includes('résultat') || 
        name.toLowerCase().includes('recherche') ||
        name.toLowerCase().includes('ajouter') ||
        name.toLowerCase().includes('voir plus')) {
      continue;
    }
    
    // Extract reference if present
    let reference = '';
    const refMatch = block.match(/[Rr]éf(?:érence)?\.?\s*:?\s*([A-Z0-9-]+)/i);
    if (refMatch) {
      reference = refMatch[1];
    }
    
    parts.push({
      name,
      reference,
      supplier: supplierName,
      purchasePrice: price,
      publicPrice: roundPrice(price * config.price_coefficient),
      availability: block.toLowerCase().includes('rupture') ? 'Rupture de stock' : 'En stock',
    });
  }
  
  console.log(`Found ${parts.length} products from markdown for ${supplierName}`);
  return parts.slice(0, 20);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopId, suppliers, searchQuery, testConnection } = await req.json();

    if (!shopId || !suppliers || !searchQuery) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service de recherche non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch supplier configs
    const { data: supplierConfigs, error: configError } = await supabase
      .from('shop_suppliers')
      .select('*')
      .eq('shop_id', shopId)
      .in('supplier_name', suppliers);

    if (configError) {
      console.error('Error fetching supplier configs:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur de configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection mode
    if (testConnection) {
      return new Response(
        JSON.stringify({ success: true, message: 'Connection test successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search across suppliers in parallel
    const searchPromises: Promise<SupplierPart[]>[] = [];
    
    const supplierUrls: Record<string, string> = {
      mobilax: 'https://www.mobilax.fr/recherche?controller=search&s=',
      utopya: 'https://www.utopya.fr/recherche?controller=search&s=',
    };

    for (const supplierName of suppliers) {
      const config = supplierConfigs?.find(c => c.supplier_name === supplierName) || {
        id: '',
        supplier_name: supplierName,
        supplier_url: supplierUrls[supplierName] || '',
        username: null,
        password_encrypted: null,
        price_coefficient: 1.5,
        is_enabled: true,
      } as SupplierConfig;

      if (!config.is_enabled) continue;

      const searchUrl = `${supplierUrls[supplierName]}${encodeURIComponent(searchQuery)}`;
      searchPromises.push(scrapeWithJsonExtraction(searchUrl, supplierName, config, firecrawlApiKey));
    }

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);
    const allParts = results.flat();

    console.log(`Found ${allParts.length} parts for query: ${searchQuery}`);

    return new Response(
      JSON.stringify({ success: true, parts: allParts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-supplier-parts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});