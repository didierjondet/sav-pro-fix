// SAV Parts Search - Background Service Worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'search') {
    handleSearch(message.supplier, message.url, message.query)
      .then(products => sendResponse({ products }))
      .catch(error => {
        console.error('Search error:', error);
        sendResponse({ products: [] });
      });
    return true; // Keep the message channel open for async response
  }
});

async function handleSearch(supplier, url, query) {
  try {
    // Fetch the search page
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      console.error(`HTTP error ${response.status} for ${supplier}`);
      return [];
    }

    const html = await response.text();
    
    if (supplier === 'mobilax') {
      return parseMobilaxProducts(html, query);
    } else if (supplier === 'utopya') {
      return parseUtopyaProducts(html, query);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching ${supplier}:`, error);
    return [];
  }
}

function parseMobilaxProducts(html, query) {
  const products = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Mobilax uses PrestaShop - look for product containers
  const productElements = doc.querySelectorAll('.product-miniature, .product-container, article.product, .js-product-miniature');
  
  productElements.forEach(el => {
    try {
      // Get product name
      const nameEl = el.querySelector('.product-title a, h3.product-title a, .product-name, [itemprop="name"]');
      const name = nameEl?.textContent?.trim() || '';
      
      if (!name || name.length < 5) return;
      
      // Get price
      const priceEl = el.querySelector('.price, .product-price, [itemprop="price"]');
      const priceText = priceEl?.textContent || priceEl?.getAttribute('content') || '';
      const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
      const price = priceMatch ? parseFloat(`${priceMatch[1]}.${priceMatch[2]}`) : 0;
      
      if (price <= 0 || price > 2000) return;
      
      // Get reference
      const refEl = el.querySelector('.product-reference, [itemprop="sku"]');
      const reference = refEl?.textContent?.trim()?.replace(/^Réf\.\s*:?\s*/i, '') || '';
      
      // Get URL
      const linkEl = el.querySelector('a[href*="mobilax.fr"]') || nameEl;
      let url = linkEl?.getAttribute('href') || '';
      if (url && !url.startsWith('http')) {
        url = 'https://www.mobilax.fr' + url;
      }
      
      // Get image
      const imgEl = el.querySelector('img');
      const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const isOutOfStock = el.textContent.toLowerCase().includes('rupture') || 
                          el.textContent.toLowerCase().includes('indisponible');
      
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
      console.error('Error parsing Mobilax product:', e);
    }
  });
  
  // Fallback: search for price patterns in text
  if (products.length === 0) {
    const allText = html;
    const productBlocks = allText.split(/(?=<div[^>]*class="[^"]*product)/i);
    
    for (const block of productBlocks.slice(0, 30)) {
      const nameMatch = block.match(/title="([^"]+)"/i) || block.match(/>([^<]{10,100})<\/a>/);
      const priceMatch = block.match(/(\d+)[,.](\d{2})\s*€/);
      
      if (nameMatch && priceMatch) {
        const name = nameMatch[1].trim();
        const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
        
        if (name.length > 5 && price > 0 && price < 2000) {
          // Check if relevant to query
          const queryWords = query.toLowerCase().split(/\s+/);
          const nameLower = name.toLowerCase();
          const matches = queryWords.filter(w => nameLower.includes(w) || w.length < 3);
          
          if (matches.length >= queryWords.length * 0.5) {
            products.push({
              name,
              reference: '',
              supplier: 'Mobilax',
              price,
              availability: 'En stock',
              url: '',
              imageUrl: ''
            });
          }
        }
      }
    }
  }
  
  console.log(`Parsed ${products.length} products from Mobilax`);
  return products.slice(0, 20);
}

function parseUtopyaProducts(html, query) {
  const products = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Utopya uses Magento - look for product containers
  const productElements = doc.querySelectorAll('.product-item, .product-item-info, .item.product, .product');
  
  productElements.forEach(el => {
    try {
      // Get product name
      const nameEl = el.querySelector('.product-item-link, .product-name a, a.product-item-link, [data-product-name]');
      const name = nameEl?.textContent?.trim() || nameEl?.getAttribute('data-product-name') || '';
      
      if (!name || name.length < 5) return;
      
      // Get price
      const priceEl = el.querySelector('.price, .special-price .price, [data-price-amount]');
      const priceAttr = priceEl?.getAttribute('data-price-amount');
      let price = 0;
      
      if (priceAttr) {
        price = parseFloat(priceAttr);
      } else {
        const priceText = priceEl?.textContent || '';
        const priceMatch = priceText.match(/(\d+)[,.](\d{2})/);
        price = priceMatch ? parseFloat(`${priceMatch[1]}.${priceMatch[2]}`) : 0;
      }
      
      if (price <= 0 || price > 2000) return;
      
      // Get reference/SKU
      const refEl = el.querySelector('[data-product-sku], .sku');
      const reference = refEl?.getAttribute('data-product-sku') || refEl?.textContent?.trim() || '';
      
      // Get URL
      const linkEl = el.querySelector('a[href*="utopya.fr"]') || nameEl;
      let url = linkEl?.getAttribute('href') || '';
      
      // Get image
      const imgEl = el.querySelector('img.product-image-photo, img');
      const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      
      // Check availability
      const isOutOfStock = el.textContent.toLowerCase().includes('rupture') || 
                          el.classList.contains('out-of-stock');
      
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
      console.error('Error parsing Utopya product:', e);
    }
  });
  
  // Fallback regex parsing
  if (products.length === 0) {
    const allText = html;
    const pricePattern = /data-price-amount="(\d+(?:\.\d+)?)"/g;
    const namePattern = /data-product-name="([^"]+)"/g;
    
    let priceMatch;
    let nameMatch;
    const prices = [];
    const names = [];
    
    while ((priceMatch = pricePattern.exec(allText)) !== null) {
      prices.push(parseFloat(priceMatch[1]));
    }
    
    while ((nameMatch = namePattern.exec(allText)) !== null) {
      names.push(nameMatch[1]);
    }
    
    const count = Math.min(prices.length, names.length, 20);
    for (let i = 0; i < count; i++) {
      if (names[i] && prices[i] > 0 && prices[i] < 2000) {
        products.push({
          name: names[i],
          reference: '',
          supplier: 'Utopya',
          price: prices[i],
          availability: 'En stock',
          url: '',
          imageUrl: ''
        });
      }
    }
  }
  
  console.log(`Parsed ${products.length} products from Utopya`);
  return products.slice(0, 20);
}
