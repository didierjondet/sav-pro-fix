// Content script for Utopya - runs directly on the page

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProducts') {
    console.log('Utopya: Extracting products from page...');
    const products = extractUtopyaProducts();
    console.log('Utopya: Found', products.length, 'products');
    sendResponse({ products });
  }
  return true;
});

function extractUtopyaProducts() {
  const products = [];
  
  // Try multiple selectors for Magento
  const selectors = [
    '.product-item',
    '.product-item-info',
    '.products-grid .item',
    '.products.list .item',
    'li.product-item',
    '.product.photo'
  ];
  
  let productElements = [];
  for (const selector of selectors) {
    productElements = document.querySelectorAll(selector);
    if (productElements.length > 0) {
      console.log('Utopya: Using selector:', selector, 'found:', productElements.length);
      break;
    }
  }
  
  productElements.forEach(el => {
    try {
      // Get product name
      const nameEl = el.querySelector('.product-item-link') || 
                     el.querySelector('a.product-item-link') ||
                     el.querySelector('.product-name a') ||
                     el.querySelector('a[title]');
      
      const name = nameEl?.textContent?.trim() || nameEl?.getAttribute('title') || '';
      if (!name || name.length < 3) return;
      
      // Get price
      const priceEl = el.querySelector('[data-price-amount]') ||
                      el.querySelector('.price') ||
                      el.querySelector('.special-price .price');
      
      let price = 0;
      if (priceEl) {
        const priceAmount = priceEl.getAttribute('data-price-amount');
        if (priceAmount) {
          price = parseFloat(priceAmount);
        } else {
          const priceText = priceEl.textContent || '';
          const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
          if (priceMatch) {
            price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
          }
        }
      }
      
      if (price <= 0 || price > 5000) return;
      
      // Get reference/SKU
      const refEl = el.querySelector('[data-product-sku]') || el.querySelector('.sku');
      const reference = refEl?.getAttribute('data-product-sku') || refEl?.textContent?.trim() || '';
      
      // Get URL
      const linkEl = el.querySelector('a[href*="utopya"]') || el.querySelector('a[href]');
      const url = linkEl?.getAttribute('href') || '';
      
      // Get image
      const imgEl = el.querySelector('img.product-image-photo') || el.querySelector('img');
      const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const text = el.textContent.toLowerCase();
      const isOutOfStock = text.includes('rupture') || 
                          el.classList.contains('out-of-stock') ||
                          text.includes('indisponible');
      
      products.push({
        name,
        reference,
        supplier: 'Utopya',
        price,
        availability: isOutOfStock ? 'Rupture' : 'En stock',
        url,
        imageUrl
      });
    } catch (e) {
      console.error('Utopya: Error parsing product:', e);
    }
  });
  
  return products;
}
