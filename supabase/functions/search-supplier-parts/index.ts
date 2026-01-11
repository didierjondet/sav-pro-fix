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

// Scrape supplier website
async function scrapeSupplier(
  searchUrl: string,
  supplierName: string,
  config: SupplierConfig,
  firecrawlApiKey: string
): Promise<SupplierPart[]> {
  console.log(`Scraping ${supplierName}:`, searchUrl);
  
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
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error(`Firecrawl error for ${supplierName}:`, JSON.stringify(data));
      return [];
    }

    const html = data.data?.html || '';
    const markdown = data.data?.markdown || '';
    
    console.log(`Got content for ${supplierName}: HTML=${html.length} chars, MD=${markdown.length} chars`);

    // Parse based on supplier
    if (supplierName === 'mobilax') {
      return parseMobilaxHtml(html, markdown, config);
    } else if (supplierName === 'utopya') {
      return parseUtopyaHtml(html, markdown, config);
    }
    
    return parseGenericContent(html, markdown, supplierName, config);
  } catch (error) {
    console.error(`Error scraping ${supplierName}:`, error);
    return [];
  }
}

// Parse Mobilax HTML - specific parsing for their product structure
function parseMobilaxHtml(html: string, markdown: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  // Try to find product blocks in HTML
  // Mobilax uses product cards with specific classes
  const productPatterns = [
    /<article[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*product-miniature[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  ];
  
  let products: string[] = [];
  for (const pattern of productPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      products = matches;
      console.log(`Found ${products.length} products with pattern in Mobilax HTML`);
      break;
    }
  }
  
  // Parse each product block
  for (const productHtml of products) {
    const part = extractProductFromHtml(productHtml, 'mobilax', config);
    if (part) {
      parts.push(part);
    }
  }
  
  // If HTML parsing didn't work, try markdown
  if (parts.length === 0) {
    console.log('No products found in HTML, trying markdown for Mobilax');
    return parseMarkdownProducts(markdown, 'mobilax', config);
  }
  
  console.log(`Parsed ${parts.length} products from Mobilax`);
  return parts.slice(0, 20);
}

// Parse Utopya HTML
function parseUtopyaHtml(html: string, markdown: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  // Utopya product patterns
  const productPatterns = [
    /<div[^>]*class="[^"]*product-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi,
    /<article[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*thumbnail-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
  ];
  
  let products: string[] = [];
  for (const pattern of productPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      products = matches;
      console.log(`Found ${products.length} products with pattern in Utopya HTML`);
      break;
    }
  }
  
  for (const productHtml of products) {
    const part = extractProductFromHtml(productHtml, 'utopya', config);
    if (part) {
      parts.push(part);
    }
  }
  
  if (parts.length === 0) {
    console.log('No products found in HTML, trying markdown for Utopya');
    return parseMarkdownProducts(markdown, 'utopya', config);
  }
  
  console.log(`Parsed ${parts.length} products from Utopya`);
  return parts.slice(0, 20);
}

// Extract product info from HTML block
function extractProductFromHtml(html: string, supplier: string, config: SupplierConfig): SupplierPart | null {
  // Extract product name
  const namePatterns = [
    /<h[1-6][^>]*class="[^"]*product-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    /<a[^>]*class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    /<span[^>]*class="[^"]*product-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i,
    /title="([^"]+)"/i,
    /alt="([^"]+)"/i,
  ];
  
  let name = '';
  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      name = match[1].replace(/<[^>]*>/g, '').trim();
      if (name.length > 5 && name.length < 200) break;
    }
  }
  
  if (!name || name.length < 5) return null;
  
  // Extract price
  const pricePatterns = [
    /class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+)[,.](\d{2})\s*€/i,
    /(\d+)[,.](\d{2})\s*€\s*TTC/i,
    /(\d+)[,.](\d{2})\s*€/g,
  ];
  
  let price = 0;
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 0 && price < 2000) break;
    }
  }
  
  if (price <= 0) return null;
  
  // Extract reference
  let reference = '';
  const refMatch = html.match(/(?:ref|référence|sku)[^>]*>?\s*:?\s*([A-Z0-9-]+)/i);
  if (refMatch) {
    reference = refMatch[1];
  }
  
  // Extract URL
  let url = '';
  const urlMatch = html.match(/href="(https?:\/\/[^"]+)"/i) || html.match(/href="(\/[^"]+)"/i);
  if (urlMatch) {
    url = urlMatch[1];
    if (url.startsWith('/')) {
      url = supplier === 'mobilax' ? `https://www.mobilax.fr${url}` : `https://www.utopya.fr${url}`;
    }
  }
  
  // Extract image
  let imageUrl = '';
  const imgMatch = html.match(/src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
  if (imgMatch) {
    imageUrl = imgMatch[1];
  }
  
  // Check availability
  const outOfStock = html.toLowerCase().includes('rupture') || 
                     html.toLowerCase().includes('indisponible') ||
                     html.toLowerCase().includes('out of stock');
  
  return {
    name: cleanProductName(name),
    reference,
    supplier,
    purchasePrice: price,
    publicPrice: roundPrice(price * config.price_coefficient),
    availability: outOfStock ? 'Rupture de stock' : 'En stock',
    imageUrl: imageUrl || undefined,
    url: url || undefined,
  };
}

// Clean product name
function cleanProductName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// Parse markdown as fallback
function parseMarkdownProducts(markdown: string, supplier: string, config: SupplierConfig): SupplierPart[] {
  const parts: SupplierPart[] = [];
  
  if (!markdown || markdown.length < 100) {
    console.log(`Markdown too short for ${supplier}: ${markdown.length} chars`);
    return parts;
  }
  
  // Split by lines and look for product patterns
  const lines = markdown.split('\n');
  let currentName = '';
  let currentPrice = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and navigation elements
    if (!line || line.length < 3) continue;
    if (line.includes('Menu') || line.includes('Panier') || line.includes('Connexion')) continue;
    if (line.includes('©') || line.includes('Cookie') || line.includes('newsletter')) continue;
    
    // Look for prices
    const priceMatch = line.match(/(\d+)[,.](\d{2})\s*€/);
    if (priceMatch) {
      currentPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
      
      // If we have both name and price, create product
      if (currentName && currentPrice > 0 && currentPrice < 2000) {
        // Check if it looks like a real product name (contains iPhone, Samsung, ecran, etc.)
        const lowerName = currentName.toLowerCase();
        const isProduct = lowerName.includes('iphone') || 
                         lowerName.includes('samsung') ||
                         lowerName.includes('écran') ||
                         lowerName.includes('ecran') ||
                         lowerName.includes('batterie') ||
                         lowerName.includes('vitre') ||
                         lowerName.includes('lcd') ||
                         lowerName.includes('oled') ||
                         lowerName.includes('apple') ||
                         lowerName.includes('huawei') ||
                         lowerName.includes('xiaomi');
        
        if (isProduct) {
          parts.push({
            name: cleanProductName(currentName),
            reference: '',
            supplier,
            purchasePrice: currentPrice,
            publicPrice: roundPrice(currentPrice * config.price_coefficient),
            availability: 'En stock',
          });
        }
        
        currentName = '';
        currentPrice = 0;
      }
    } else {
      // This might be a product name
      // Check if it's a header or bold text or a substantial line
      const isHeader = line.startsWith('#') || line.startsWith('**');
      const isSubstantial = line.length > 15 && line.length < 150;
      
      if (isHeader || isSubstantial) {
        const cleanedLine = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (cleanedLine.length > 10) {
          currentName = cleanedLine;
        }
      }
    }
  }
  
  console.log(`Parsed ${parts.length} products from markdown for ${supplier}`);
  return parts.slice(0, 20);
}

// Generic content parser
function parseGenericContent(html: string, markdown: string, supplier: string, config: SupplierConfig): SupplierPart[] {
  // Try HTML first, then markdown
  const htmlParts = parseMarkdownProducts(markdown, supplier, config);
  return htmlParts;
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
      searchPromises.push(scrapeSupplier(searchUrl, supplierName, config, firecrawlApiKey));
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