// Content script for Mobilax - runs directly on the page

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
  
  // Try multiple selectors for PrestaShop
  const selectors = [
    '.product-miniature',
    '.js-product-miniature', 
    'article.product-miniature',
    '.product-container',
    '[data-id-product]'
  ];
  
  let productElements = [];
  for (const selector of selectors) {
    productElements = document.querySelectorAll(selector);
    if (productElements.length > 0) {
      console.log('Mobilax: Using selector:', selector, 'found:', productElements.length);
      break;
    }
  }
  
  productElements.forEach(el => {
    try {
      // Get product name - try multiple selectors
      const nameEl = el.querySelector('.product-title a') || 
                     el.querySelector('h3.product-title a') ||
                     el.querySelector('.product-title') ||
                     el.querySelector('h2 a') ||
                     el.querySelector('a.product-name') ||
                     el.querySelector('[itemprop="name"]');
      
      const name = nameEl?.textContent?.trim() || '';
      if (!name || name.length < 3) return;
      
      // Get price - try multiple selectors
      const priceEl = el.querySelector('.product-price-and-shipping .price') ||
                      el.querySelector('.price') || 
                      el.querySelector('[itemprop="price"]') ||
                      el.querySelector('.product-price');
      
      let price = 0;
      if (priceEl) {
        const priceContent = priceEl.getAttribute('content');
        if (priceContent) {
          price = parseFloat(priceContent);
        } else {
          const priceText = priceEl.textContent || '';
          const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
          if (priceMatch) {
            price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
          }
        }
      }
      
      if (price <= 0 || price > 5000) return;
      
      // Get reference
      const refEl = el.querySelector('.product-reference') || 
                    el.querySelector('[itemprop="sku"]');
      const reference = refEl?.textContent?.trim()?.replace(/^Réf\.?\s*:?\s*/i, '') || '';
      
      // Get URL
      const linkEl = el.querySelector('a[href]');
      let url = linkEl?.getAttribute('href') || '';
      if (url && !url.startsWith('http')) {
        url = window.location.origin + url;
      }
      
      // Get image
      const imgEl = el.querySelector('img');
      const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const text = el.textContent.toLowerCase();
      const isOutOfStock = text.includes('rupture') || 
                          text.includes('indisponible') ||
                          text.includes('épuisé');
      
      products.push({
        name,
        reference,
        supplier: 'Mobilax',
        price,
        availability: isOutOfStock ? 'Rupture' : 'En stock',
        url,
        imageUrl
      });
    } catch (e) {
      console.error('Mobilax: Error parsing product:', e);
    }
  });
  
  return products;
}
