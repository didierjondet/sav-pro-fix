// Content script for Utopya - runs directly on the page (v1.1)

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
  
  // Utopya uses custom Magento theme with specific classes
  // Main product container: .item.product.product-item.listing-item
  const productElements = document.querySelectorAll('.item.product.product-item.listing-item, .product-item.listing-item');
  
  console.log('Utopya: Found', productElements.length, 'product elements');
  
  productElements.forEach((el, index) => {
    try {
      // Get SKU from data attribute
      const sku = el.getAttribute('data-sku') || '';
      
      // Get product name from .product-item-link.name
      const nameEl = el.querySelector('.product-item-link.name') || 
                     el.querySelector('a.product-item-link') ||
                     el.querySelector('.product-item-details a');
      
      // Clean up name (remove highlight spans)
      let name = '';
      if (nameEl) {
        // Get text content but handle highlight spans
        name = nameEl.textContent?.trim() || '';
        // Remove extra whitespace from spans
        name = name.replace(/\s+/g, ' ').trim();
      }
      
      if (!name || name.length < 3) {
        console.log('Utopya: Skipping product', index, '- no name');
        return;
      }
      
      // Get price - try multiple approaches
      let price = 0;
      
      // Method 1: Look for price with data-price-amount attribute
      const priceAttrEl = el.querySelector('[data-price-amount]');
      if (priceAttrEl) {
        const priceAmount = priceAttrEl.getAttribute('data-price-amount');
        if (priceAmount) {
          price = parseFloat(priceAmount);
        }
      }
      
      // Method 2: Look for .price element with text
      if (price <= 0) {
        const priceEl = el.querySelector('.price-wrapper .price') || 
                        el.querySelector('.price-box .price') ||
                        el.querySelector('.special-price .price') ||
                        el.querySelector('.price');
        if (priceEl) {
          const priceText = priceEl.textContent || '';
          const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
          if (priceMatch) {
            price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
          }
        }
      }
      
      // Note: If user is not logged in, price will be 0 (shows "S'identifier pour voir le prix")
      // We still add the product but with price 0
      
      // Get URL
      const linkEl = el.querySelector('a.product-item-link') || 
                     el.querySelector('a.product.photo') ||
                     el.querySelector('a[href*="utopya.fr"]');
      const url = linkEl?.getAttribute('href') || '';
      
      // Get image
      const imgEl = el.querySelector('img.product-image-photo') || el.querySelector('img');
      const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const text = el.textContent?.toLowerCase() || '';
      const isOutOfStock = text.includes('rupture') || 
                          text.includes('indisponible') ||
                          el.classList.contains('out-of-stock');
      
      // Check if price is hidden (need to login)
      const needsLogin = el.querySelector('.log-to-see-price') !== null;
      
      const product = {
        name,
        reference: sku,
        supplier: 'Utopya',
        price,
        availability: isOutOfStock ? 'Rupture' : (needsLogin ? 'Connectez-vous' : 'En stock'),
        url,
        imageUrl,
        needsLogin
      };
      
      console.log('Utopya: Product', index, ':', name, '- Price:', price, '- SKU:', sku);
      products.push(product);
      
    } catch (e) {
      console.error('Utopya: Error parsing product', index, ':', e);
    }
  });
  
  return products;
}
