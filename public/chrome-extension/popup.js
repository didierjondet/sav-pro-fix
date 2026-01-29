// SAV Parts Search - Chrome Extension Popup v1.2

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
  searchBtn.textContent = 'Recherche...';
  resultsDiv.innerHTML = '<div class="loading">🔍 Recherche en cours...<br><small>Cela peut prendre quelques secondes</small></div>';
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
  searchBtn.textContent = 'Rechercher';
  displayResults();
}

async function searchSupplier(supplier, query) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'search', supplier, query },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.error) {
          reject(new Error(response.error));
          return;
        }
        
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
    resultsDiv.innerHTML = `
      <div class="help-text">
        <p><strong>Conseils :</strong></p>
        <ul>
          <li>Ouvrez un onglet sur <a href="https://www.mobilax.fr" target="_blank">mobilax.fr</a> et/ou <a href="https://www.utopya.fr" target="_blank">utopya.fr</a></li>
          <li>Connectez-vous à votre compte</li>
          <li>Réessayez la recherche</li>
        </ul>
      </div>
    `;
    return;
  }

  // Sort by price (products with price first, then by price ascending)
  allResults.sort((a, b) => {
    if (a.price > 0 && b.price > 0) return a.price - b.price;
    if (a.price > 0) return -1;
    if (b.price > 0) return 1;
    return 0;
  });

  showStatus(`${allResults.length} produit(s) trouvé(s)`, 'success');
  
  resultsDiv.innerHTML = allResults.map((product, index) => `
    <div class="product">
      <div class="product-name">${escapeHtml(product.name)}</div>
      <div class="product-price">
        ${product.price > 0 ? `${product.price.toFixed(2)} €` : '<span class="no-price">Voir sur le site</span>'}
      </div>
      <div class="product-supplier">
        <span class="supplier-badge ${product.supplier.toLowerCase()}">${product.supplier}</span>
        ${product.reference ? `<span class="reference">Réf: ${escapeHtml(product.reference)}</span>` : ''}
        <span class="availability ${product.availability === 'En stock' ? 'in-stock' : 'out-stock'}">${product.availability}</span>
      </div>
      <div class="product-actions">
        <button class="btn-copy" onclick="copyToClipboard(${index})">📋 Copier</button>
        ${product.url ? `<a href="${product.url}" target="_blank"><button class="btn-view">🔗 Voir</button></a>` : ''}
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
  const priceText = product.price > 0 ? `${product.price.toFixed(2)} €` : 'Prix sur le site';
  const data = `${product.name}\nPrix: ${priceText}\nFournisseur: ${product.supplier}\n${product.reference ? `Réf: ${product.reference}\n` : ''}${product.url || ''}`;
  navigator.clipboard.writeText(data).then(() => {
    showStatus('✅ Données copiées !', 'success');
  });
};
