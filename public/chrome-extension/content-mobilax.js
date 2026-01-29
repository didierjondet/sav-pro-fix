// Content script for Mobilax - runs directly on the page (v1.2)
// Mobilax uses Next.js with dynamic content

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProducts') {
    console.log('Mobilax: Extracting products from page...');
    const products = extractMobilaxProducts();
    console.log('Mobilax: Found', products.length, 'products');
    sendResponse({ products });
  }
  return true;
});

function extractMobilaxProducts() {
  const products = [];
  
  // Mobilax now uses a modern Next.js framework
  // Products are in cards with specific classes
  const selectors = [
    '[class*="product-card"]',
    '[class*="ProductCard"]',
    '.grid > div > a[href*="/produit"]',
    'a[href*="/produit"]',
    '[class*="card"]',
    '.relative.group'
  ];
  
  let productElements = [];
  
  // Try each selector
  for (const selector of selectors) {
    try {
      productElements = document.querySelectorAll(selector);
      if (productElements.length > 0) {
        console.log('Mobilax: Using selector:', selector, 'found:', productElements.length);
        break;
      }
    } catch (e) {
      console.log('Mobilax: Invalid selector:', selector);
    }
  }
  
  // If no products found with selectors, try to find product links
  if (productElements.length === 0) {
    productElements = document.querySelectorAll('a[href*="mobilax.fr"][href*="produit"], a[href^="/produit"]');
    console.log('Mobilax: Using link fallback, found:', productElements.length);
  }
  
  productElements.forEach((el, index) => {
    try {
      // Get the parent container if we selected a link
      const container = el.closest('[class*="card"], [class*="Card"], .relative.group') || el;
      
      // Get product name - look for headings or title text
      let name = '';
      const nameSelectors = ['h2', 'h3', 'h4', '[class*="title"]', '[class*="name"]', 'p.font-semibold', 'p.font-medium'];
      for (const sel of nameSelectors) {
        const nameEl = container.querySelector(sel);
        if (nameEl && nameEl.textContent.trim().length > 3) {
          name = nameEl.textContent.trim();
          break;
        }
      }
      
      // If still no name, try the link title or text
      if (!name) {
        name = el.getAttribute('title') || el.textContent?.trim()?.split('\n')[0] || '';
      }
      
      if (!name || name.length < 3) {
        console.log('Mobilax: Skipping element', index, '- no name found');
        return;
      }
      
      // Get price
      let price = 0;
      const priceEl = container.querySelector('[class*="price"], [class*="Price"], .text-orange-600, .text-green-600, .font-bold');
      if (priceEl) {
        const priceText = priceEl.textContent || '';
        // Match prices like "12,99 €" or "12.99€" or "12,99"
        const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
        if (priceMatch) {
          price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
        }
      }
      
      // Get URL
      let url = '';
      const linkEl = container.tagName === 'A' ? container : container.querySelector('a');
      if (linkEl) {
        url = linkEl.getAttribute('href') || '';
        if (url && !url.startsWith('http')) {
          url = 'https://www.mobilax.fr' + url;
        }
      }
      
      // Get reference if available
      let reference = '';
      const refEl = container.querySelector('[class*="ref"], [class*="sku"], .text-gray-500');
      if (refEl) {
        const refText = refEl.textContent || '';
        const refMatch = refText.match(/[A-Z0-9-]+/);
        if (refMatch) {
          reference = refMatch[0];
        }
      }
      
      // Get image
      const imgEl = container.querySelector('img');
      const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const text = container.textContent?.toLowerCase() || '';
      const isOutOfStock = text.includes('rupture') || 
                          text.includes('indisponible') ||
                          text.includes('épuisé');
      
      // Only add if we have at least a name
      if (name.length >= 3) {
        const product = {
          name: name.substring(0, 150), // Limit name length
          reference,
          supplier: 'Mobilax',
          price,
          availability: isOutOfStock ? 'Rupture' : 'En stock',
          url,
          imageUrl
        };
        
        console.log('Mobilax: Product', index, ':', name.substring(0, 50), '- Price:', price);
        products.push(product);
      }
    } catch (e) {
      console.error('Mobilax: Error parsing product', index, ':', e);
    }
  });
  
  // Deduplicate by name
  const uniqueProducts = [];
  const seenNames = new Set();
  for (const product of products) {
    const key = product.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueProducts.push(product);
    }
  }
  
  return uniqueProducts;
}
