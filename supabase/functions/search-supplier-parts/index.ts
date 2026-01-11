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

// Scrape Mobilax using Firecrawl
async function scrapeMobilax(
  query: string,
  config: SupplierConfig,
  firecrawlApiKey: string
): Promise<SupplierPart[]> {
  const searchUrl = `https://www.mobilax.fr/recherche?controller=search&s=${encodeURIComponent(query)}`;
  
  console.log('Scraping Mobilax:', searchUrl);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Firecrawl error for Mobilax:', data);
      return [];
    }

    // Parse the HTML/markdown to extract products
    const parts = parseMobilaxResults(data.data?.html || data.data?.markdown || '', config);
    return parts;
  } catch (error) {
    console.error('Error scraping Mobilax:', error);
    return [];
  }
}

// Parse Mobilax results from HTML
function parseMobilaxResults(content: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  // Simple regex-based extraction (adjust based on actual HTML structure)
  // This is a simplified approach - in production, you'd use a proper HTML parser
  const productPattern = /<div[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const pricePattern = /(\d+[.,]\d{2})\s*€/g;
  const titlePattern = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  
  // Extract products from content
  const products = content.match(productPattern) || [];
  
  // If no structured products found, try to extract from markdown
  if (products.length === 0) {
    // Parse markdown format
    const lines = content.split('\n');
    let currentProduct: Partial<SupplierPart> | null = null;
    
    for (const line of lines) {
      // Look for product names (usually headers or bold text)
      if (line.match(/^#+\s+(.+)/) || line.match(/\*\*(.+)\*\*/)) {
        if (currentProduct?.name && currentProduct?.purchasePrice) {
          parts.push(currentProduct as SupplierPart);
        }
        const name = line.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim();
        if (name && !name.includes('Résultat') && !name.includes('recherche')) {
          currentProduct = {
            name,
            reference: '',
            supplier: 'mobilax',
            purchasePrice: 0,
            publicPrice: 0,
            availability: 'En stock',
          };
        }
      }
      
      // Look for prices
      const priceMatch = line.match(/(\d+)[.,](\d{2})\s*€/);
      if (priceMatch && currentProduct) {
        const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
        if (!currentProduct.purchasePrice) {
          currentProduct.purchasePrice = price;
          currentProduct.publicPrice = roundPrice(price * config.price_coefficient);
        }
      }
      
      // Look for references
      const refMatch = line.match(/[Rr]éf(?:érence)?\.?\s*:?\s*([A-Z0-9-]+)/);
      if (refMatch && currentProduct) {
        currentProduct.reference = refMatch[1];
      }
    }
    
    if (currentProduct?.name && currentProduct?.purchasePrice) {
      parts.push(currentProduct as SupplierPart);
    }
  }
  
  return parts.slice(0, 10); // Limit to 10 results
}

// Scrape Utopya using Firecrawl
async function scrapeUtopya(
  query: string,
  config: SupplierConfig,
  firecrawlApiKey: string
): Promise<SupplierPart[]> {
  const searchUrl = `https://www.utopya.fr/recherche?controller=search&s=${encodeURIComponent(query)}`;
  
  console.log('Scraping Utopya:', searchUrl);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Firecrawl error for Utopya:', data);
      return [];
    }

    // Parse the HTML/markdown to extract products
    const parts = parseUtopyaResults(data.data?.html || data.data?.markdown || '', config);
    return parts;
  } catch (error) {
    console.error('Error scraping Utopya:', error);
    return [];
  }
}

// Parse Utopya results from HTML
function parseUtopyaResults(content: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  // Parse markdown format similar to Mobilax
  const lines = content.split('\n');
  let currentProduct: Partial<SupplierPart> | null = null;
  
  for (const line of lines) {
    // Look for product names
    if (line.match(/^#+\s+(.+)/) || line.match(/\*\*(.+)\*\*/)) {
      if (currentProduct?.name && currentProduct?.purchasePrice) {
        parts.push(currentProduct as SupplierPart);
      }
      const name = line.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim();
      if (name && !name.includes('Résultat') && !name.includes('recherche')) {
        currentProduct = {
          name,
          reference: '',
          supplier: 'utopya',
          purchasePrice: 0,
          publicPrice: 0,
          availability: 'En stock',
        };
      }
    }
    
    // Look for prices
    const priceMatch = line.match(/(\d+)[.,](\d{2})\s*€/);
    if (priceMatch && currentProduct) {
      const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
      if (!currentProduct.purchasePrice) {
        currentProduct.purchasePrice = price;
        currentProduct.publicPrice = roundPrice(price * config.price_coefficient);
      }
    }
    
    // Look for references
    const refMatch = line.match(/[Rr]éf(?:érence)?\.?\s*:?\s*([A-Z0-9-]+)/);
    if (refMatch && currentProduct) {
      currentProduct.reference = refMatch[1];
    }
  }
  
  if (currentProduct?.name && currentProduct?.purchasePrice) {
    parts.push(currentProduct as SupplierPart);
  }
  
  return parts.slice(0, 10); // Limit to 10 results
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

    // Search across suppliers
    const allParts: SupplierPart[] = [];

    for (const supplierName of suppliers) {
      const config = supplierConfigs?.find(c => c.supplier_name === supplierName) || {
        supplier_name: supplierName,
        price_coefficient: 1.5,
        is_enabled: true,
      } as SupplierConfig;

      if (!config.is_enabled) continue;

      let parts: SupplierPart[] = [];

      switch (supplierName) {
        case 'mobilax':
          parts = await scrapeMobilax(searchQuery, config, firecrawlApiKey);
          break;
        case 'utopya':
          parts = await scrapeUtopya(searchQuery, config, firecrawlApiKey);
          break;
        default:
          console.log(`Unknown supplier: ${supplierName}`);
      }

      allParts.push(...parts);
    }

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
