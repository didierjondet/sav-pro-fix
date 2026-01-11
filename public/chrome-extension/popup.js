// SAV Parts Search - Chrome Extension Popup

const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const mobilaxCheck = document.getElementById('mobilax');
const utopyaCheck = document.getElementById('utopya');

let allResults = [];

// Search on Enter key
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

searchBtn.addEventListener('click', performSearch);

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    showStatus('Veuillez entrer un terme de recherche', 'error');
    return;
  }

  const suppliers = [];
  if (mobilaxCheck.checked) suppliers.push('mobilax');
  if (utopyaCheck.checked) suppliers.push('utopya');

  if (suppliers.length === 0) {
    showStatus('Sélectionnez au moins un fournisseur', 'error');
    return;
  }

  searchBtn.disabled = true;
  resultsDiv.innerHTML = '<div class="loading">Recherche en cours...</div>';
  allResults = [];

  for (const supplier of suppliers) {
    showStatus(`Recherche sur ${supplier}...`, 'info');
    try {
      const results = await searchSupplier(supplier, query);
      allResults = allResults.concat(results);
    } catch (error) {
      console.error(`Error searching ${supplier}:`, error);
    }
  }

  searchBtn.disabled = false;
  displayResults();
}

async function searchSupplier(supplier, query) {
  const urls = {
    mobilax: `https://www.mobilax.fr/recherche?controller=search&s=${encodeURIComponent(query)}`,
    utopya: `https://www.utopya.fr/catalogsearch/result/?q=${encodeURIComponent(query)}`
  };

  return new Promise((resolve) => {
    // Send message to background script to search
    chrome.runtime.sendMessage(
      { action: 'search', supplier, url: urls[supplier], query },
      (response) => {
        if (response && response.products) {
          resolve(response.products);
        } else {
          resolve([]);
        }
      }
    );
  });
}

function displayResults() {
  if (allResults.length === 0) {
    showStatus('Aucun résultat trouvé', 'error');
    resultsDiv.innerHTML = '';
    return;
  }

  showStatus(`${allResults.length} produit(s) trouvé(s)`, 'success');
  
  resultsDiv.innerHTML = allResults.map((product, index) => `
    <div class="product">
      <div class="product-name">${escapeHtml(product.name)}</div>
      <div class="product-price">${product.price.toFixed(2)} €</div>
      <div class="product-supplier">${product.supplier} ${product.reference ? `- Réf: ${product.reference}` : ''}</div>
      <div class="product-actions">
        <button class="btn-copy" onclick="copyToClipboard(${index})">📋 Copier</button>
        ${product.url ? `<a href="${product.url}" target="_blank"><button>🔗 Voir</button></a>` : ''}
      </div>
    </div>
  `).join('');
}

function showStatus(message, type) {
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Copy product data to clipboard
window.copyToClipboard = function(index) {
  const product = allResults[index];
  const data = JSON.stringify(product, null, 2);
  navigator.clipboard.writeText(data).then(() => {
    showStatus('Données copiées !', 'success');
  });
};
