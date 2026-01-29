// SAV Parts Search - Background Service Worker v1.1

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'search') {
    handleSearch(message.supplier, message.query)
      .then(products => sendResponse({ products }))
      .catch(error => {
        console.error('Search error:', error);
        sendResponse({ products: [], error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

async function handleSearch(supplier, query) {
  const urls = {
    mobilax: `https://www.mobilax.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
    utopya: `https://www.utopya.fr/catalogsearch/result/?q=${encodeURIComponent(query)}`
  };

  const url = urls[supplier];
  if (!url) {
    throw new Error(`Unknown supplier: ${supplier}`);
  }

  console.log(`Searching ${supplier} for: ${query}`);

  // Find existing tab for this supplier
  const tabs = await chrome.tabs.query({});
  let supplierTab = tabs.find(tab => 
    tab.url && (
      (supplier === 'mobilax' && tab.url.includes('mobilax.fr')) ||
      (supplier === 'utopya' && tab.url.includes('utopya.fr'))
    )
  );

  if (!supplierTab) {
    // Create a new tab for this supplier
    console.log(`Creating new tab for ${supplier}`);
    supplierTab = await chrome.tabs.create({ url, active: false });
    
    // Wait for the page to load
    await waitForTabLoad(supplierTab.id);
  } else {
    // Navigate existing tab to search URL
    console.log(`Using existing tab for ${supplier}, navigating to search`);
    await chrome.tabs.update(supplierTab.id, { url });
    
    // Wait for the page to load
    await waitForTabLoad(supplierTab.id);
  }

  // Give the page a moment to render
  await sleep(1500);

  // Extract products from the tab using content script
  try {
    const response = await chrome.tabs.sendMessage(supplierTab.id, { action: 'extractProducts' });
    console.log(`${supplier} returned ${response?.products?.length || 0} products`);
    return response?.products || [];
  } catch (error) {
    console.error(`Error extracting from ${supplier}:`, error);
    
    // Try injecting the content script manually
    try {
      const scriptFile = supplier === 'mobilax' ? 'content-mobilax.js' : 'content-utopya.js';
      await chrome.scripting.executeScript({
        target: { tabId: supplierTab.id },
        files: [scriptFile]
      });
      
      await sleep(500);
      
      const retryResponse = await chrome.tabs.sendMessage(supplierTab.id, { action: 'extractProducts' });
      console.log(`${supplier} retry returned ${retryResponse?.products?.length || 0} products`);
      return retryResponse?.products || [];
    } catch (retryError) {
      console.error(`Retry failed for ${supplier}:`, retryError);
      return [];
    }
  }
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 10000);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
