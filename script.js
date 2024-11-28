const API_URL = 'https://api.hypixel.net/skyblock/bazaar';

let interval;
const productSearchInput = document.getElementById('product-search');
const tableBody = document.querySelector('#bazaar-table tbody');
let allProducts = [];


async function fetchBazaarData() {
    const query = productSearchInput.value.trim().toUpperCase();  

    if (!query) return; 

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to fetch data from API');
            clearTable(); 
            return;
        }

        allProducts = Object.keys(data.products); 
        filterSuggestions(query); 
        processBazaarData(data, query);
    } catch (error) {
        console.error('Error fetching Bazaar data:', error);
        clearTable(); 
    }
}


function processBazaarData(bazaarData, targetProduct) {
    const products = bazaarData.products;

    if (!products[targetProduct]) {
        console.error(`Product ${targetProduct} not found in API data.`);
        clearTable();
        return;
    }

    const productData = products[targetProduct];

    const sellPrice = productData.sell_summary?.[0]?.pricePerUnit || 'N/A';
    const buyPrice = productData.buy_summary?.[0]?.pricePerUnit || 'N/A';
    const sellVolume = productData.quick_status?.sellVolume || 'N/A';
    const buyVolume = productData.quick_status?.buyVolume || 'N/A';

    const timestamp = new Date().toLocaleString();

    
    tableBody.innerHTML = '';

    
    const analysis = analyzeGoodBuy(sellPrice, buyPrice, sellVolume, buyVolume);

    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${sellPrice}</td>
        <td>${buyPrice}</td>
        <td>${sellVolume}</td>
        <td>${buyVolume}</td>
        <td>${analysis.isGoodBuy ? 'Yes' : 'No'}</td>
        <td>${analysis.reason}</td>
    `;
    tableBody.appendChild(row);
}


function clearTable() {
    tableBody.innerHTML = '';
    console.log("cleared"); 
}


function filterSuggestions(query) {
    if (!query) return; 

    const filteredProducts = allProducts.filter(product =>
        product.toLowerCase().includes(query.toLowerCase())
    );

    
    showInlineSuggestions(query, filteredProducts);
}


function showInlineSuggestions(query, filteredProducts) {
    const currentValue = productSearchInput.value;
    const matchingSuggestions = filteredProducts.filter(product =>
        product.toLowerCase().startsWith(query.toLowerCase())
    );

    if (matchingSuggestions.length > 0) {
        const suggestion = matchingSuggestions[0];
        const cursorPosition = productSearchInput.selectionStart;

        if (currentValue.length <= query.length) {
            productSearchInput.value = currentValue + suggestion.slice(query.length);
            productSearchInput.setSelectionRange(cursorPosition, cursorPosition + suggestion.length);
        }
    }
}


function selectProductFromInput() {
    const selectedProduct = productSearchInput.value.trim().toUpperCase();
    if (selectedProduct) fetchBazaarData();
}


function startAutoFetch() {
    const selectedInterval = document.getElementById('interval-select').value;
    const intervalTime = parseInt(selectedInterval);

    if (interval) clearInterval(interval);
    interval = setInterval(fetchBazaarData, intervalTime);
}


function analyzeGoodBuy(sellPrice, buyPrice, sellVolume, buyVolume) {
    const sell = parseFloat(sellPrice) || 0;
    const buy = parseFloat(buyPrice) || 0;
    const sellVol = parseInt(sellVolume) || 0;
    const buyVol = parseInt(buyVolume) || 0;

    const profitpercent = buy * 100/sell;
    const liquidity = Math.min(sellVol, buyVol);
    console.log(profitpercent);
    console.log(liquidity);
    if (profitpercent > 800) {
        return { isGoodBuy: false, reason: 'Likely market manipulation' };
    } else if (profitpercent > 30 && liquidity > 100000) {
        return { isGoodBuy: true, reason: 'High profit percent and good liquidity.' };
    } else if (profitpercent > 30 && liquidity < 10000) {
        return { isGoodBuy: true, reason: 'High profit percent, but liquidity is low.' };
    }else if (profitpercent < 30 && profitpercent>10 && liquidity < 10000) {
        return { isGoodBuy: false, reason: 'Profitable, but liquidity is low.' };
    } else if (profitpercent < 10 && liquidity > 10000) {
        return { isGoodBuy: true, reason: 'Good liquidity, but low profit percent.' };
    } else {
        return { isGoodBuy: false, reason: 'Low profit percent and low liquidity.' };
    }
}


window.onload = () => {
    productSearchInput.value = '';

    startAutoFetch();

    document.getElementById('interval-select').addEventListener('change', startAutoFetch);

    productSearchInput.addEventListener('input', () => {
        const query = productSearchInput.value.trim().toUpperCase();
        filterSuggestions(query);
    });

    productSearchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            selectProductFromInput();
        }

        if (event.key === 'Backspace') {
            productSearchInput.value = '';
        }
    });
};
