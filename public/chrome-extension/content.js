// SAV Parts Search - Content Script
// This script runs on supplier websites and can interact with the page

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProducts') {
    const products = extractProductsFromPage();
    sendResponse({ products });
  }
  return true;
});

function extractProductsFromPage() {
  const products = [];
  const hostname = window.location.hostname;
  
  if (hostname.includes('mobilax.fr')) {
    return extractMobilaxProducts();
  } else if (hostname.includes('utopya.fr')) {
    return extractUtopyaProducts();
  }
  
  return products;
}

function extractMobilaxProducts() {
  const products = [];
  const productElements = document.querySelectorAll('.product-miniature, .product-container, article.product');
  
  productElements.forEach(el => {
    try {
      const nameEl = el.querySelector('.product-title a, h3.product-title a, .product-name');
      const name = nameEl?.textContent?.trim() || '';
      
      const priceEl = el.querySelector('.price, .product-price');
      const priceText = priceEl?.textContent || '';
      const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
      const price = priceMatch ? parseFloat(`${priceMatch[1]}.${priceMatch[2]}`) : 0;
      
      if (name && price > 0) {
        const linkEl = el.querySelector('a');
        const imgEl = el.querySelector('img');
        
        products.push({
          name,
          price,
          supplier: 'Mobilax',
          url: linkEl?.href || '',
          imageUrl: imgEl?.src || '',
          availability: el.textContent.includes('rupture') ? 'Rupture' : 'En stock'
        });
      }
    } catch (e) {
      console.error('Error extracting product:', e);
    }
  });
  
  return products;
}

function extractUtopyaProducts() {
  const products = [];
  const productElements = document.querySelectorAll('.product-item, .product-item-info');
  
  productElements.forEach(el => {
    try {
      const nameEl = el.querySelector('.product-item-link, .product-name a');
      const name = nameEl?.textContent?.trim() || '';
      
      const priceEl = el.querySelector('.price, [data-price-amount]');
      let price = 0;
      
      if (priceEl?.hasAttribute('data-price-amount')) {
        price = parseFloat(priceEl.getAttribute('data-price-amount'));
      } else {
        const priceText = priceEl?.textContent || '';
        const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
        price = priceMatch ? parseFloat(`${priceMatch[1]}.${priceMatch[2]}`) : 0;
      }
      
      if (name && price > 0) {
        const linkEl = el.querySelector('a');
        const imgEl = el.querySelector('img');
        
        products.push({
          name,
          price,
          supplier: 'Utopya',
          url: linkEl?.href || '',
          imageUrl: imgEl?.src || '',
          availability: el.textContent.includes('rupture') ? 'Rupture' : 'En stock'
        });
      }
    } catch (e) {
      console.error('Error extracting product:', e);
    }
  });
  
  return products;
}
