const API_URL = 'https://api.hypixel.net/skyblock/bazaar';

let interval;
let balance = parseFloat(localStorage.getItem('balance')) || 10000;  
let inventory = JSON.parse(localStorage.getItem('inventory')) || {};  
let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || []; 

const productSearchInput = document.getElementById('product-search');
const tableBody = document.querySelector('#bazaar-table tbody');
const balanceDisplay = document.getElementById('balance-display');
const inventoryDisplay = document.getElementById('inventory-display');
const buyQuantityInput = document.getElementById('buy-quantity');
const sellQuantityInput = document.getElementById('sell-quantity');
const buyButton = document.getElementById('buy-button');
const sellButton = document.getElementById('sell-button');
const historyList = document.getElementById('history-list');
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

    const buyPrice = productData.sell_summary?.[0]?.pricePerUnit || 'N/A';
    const sellPrice = productData.buy_summary?.[0]?.pricePerUnit || 'N/A';
    const buyVolume = productData.quick_status?.sellVolume || 'N/A';
    const sellVolume = productData.quick_status?.buyVolume || 'N/A';

    const timestamp = new Date().toLocaleString();

    tableBody.innerHTML = '';

    const analysis = analyzeGoodBuy(buyPrice, sellPrice, buyVolume, sellVolume);

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${buyPrice}</td>
        <td>${sellPrice}</td>
        <td>${buyVolume}</td>
        <td>${sellVolume}</td>
        <td>${analysis.isGoodBuy ? 'Yes' : 'No'}</td>
        <td>${analysis.reason}</td>
    `;
    tableBody.appendChild(row);

    document.getElementById('buy-sell-controls').style.display = 'block';  
}

function clearTable() {
    tableBody.innerHTML = '';
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

function analyzeGoodBuy(buyPrice, sellPrice, buyVolume, sellVolume) {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const buyVol = parseInt(buyVolume) || 0;
    const sellVol = parseInt(sellVolume) || 0;

    const profitpercent = buy * 100 / sell;
    const liquidity = Math.min(buyVol, sellVol);
    
    if (profitpercent > 800) {
        return { isGoodBuy: false, reason: 'Likely market manipulation' };
    } else if (profitpercent > 30 && liquidity > 100000) {
        return { isGoodBuy: true, reason: 'High profit percent and good liquidity.' };
    } else if (profitpercent > 30 && liquidity < 10000) {
        return { isGoodBuy: true, reason: 'High profit percent, but liquidity is low.' };
    } else if (profitpercent < 30 && profitpercent > 10 && liquidity < 10000) {
        return { isGoodBuy: false, reason: 'Profitable, but liquidity is low.' };
    } else if (profitpercent < 10 && liquidity > 10000) {
        return { isGoodBuy: true, reason: 'Good liquidity, but low profit percent.' };
    } else {
        return { isGoodBuy: false, reason: 'Low profit and low liquidity.' };
    }
}

function handleBuy() {
    const quantity = parseInt(buyQuantityInput.value);
    const buyPrice = parseFloat(document.querySelector('#bazaar-table tbody tr td:nth-child(2)').innerText);

    if (quantity <= 0 || isNaN(quantity)) return;  

    const totalPrice = buyPrice * quantity;

    if (balance >= totalPrice) {
        balance -= totalPrice;
        inventory[productSearchInput.value] = (inventory[productSearchInput.value] || 0) + quantity;
        updateBalanceDisplay();
        updateInventoryDisplay();
        saveData();  
        logTransaction('Buy', quantity, buyPrice);
    } else {
        alert("Not enough coins to buy this product.");
    }
}

function handleSell() {
    const quantity = parseInt(sellQuantityInput.value);
    const sellPrice = parseFloat(document.querySelector('#bazaar-table tbody tr td:nth-child(3)').innerText);

    if (quantity <= 0 || isNaN(quantity)) return;  

    if (inventory[productSearchInput.value] && inventory[productSearchInput.value] >= quantity) {
        inventory[productSearchInput.value] -= quantity;
        balance += sellPrice * quantity;
        updateBalanceDisplay();
        updateInventoryDisplay();
        saveData();  
        logTransaction('Sell', quantity, sellPrice);
    } else {
        alert("Not enough items in inventory to sell.");
    }
}

function updateBalanceDisplay() {
    balanceDisplay.innerText = `Balance: ${balance.toFixed(2)} coins`;
}

function updateInventoryDisplay() {
    inventoryDisplay.innerHTML = ''; 
    for (const [item, quantity] of Object.entries(inventory)) {
        const inventoryItem = document.createElement('div');
        inventoryItem.textContent = `${item}: ${quantity}`;
        if(quantity > 0) {
            inventoryDisplay.appendChild(inventoryItem);
        }
        
    }
}

function logTransaction(type, quantity, price) {
    const time = new Date().toLocaleString();
    const transaction = {
        type: type,
        quantity: quantity,
        price: price,
        total: quantity * price,
        time: time,
    };

    transactionHistory.push(transaction);
    updateTransactionHistory();
    saveData();  
}

function updateTransactionHistory() {
    historyList.innerHTML = ''; 
    transactionHistory.forEach(transaction => {
        const transactionItem = document.createElement('li');
        transactionItem.textContent = `${transaction.type} - ${transaction.quantity} units @ ${transaction.price} each (${transaction.total} total) at ${transaction.time}`;
        historyList.appendChild(transactionItem);
    });
}

function saveData() {
    localStorage.setItem('balance', balance);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory)); 
}

buyButton.addEventListener('click', handleBuy);
sellButton.addEventListener('click', handleSell);
productSearchInput.addEventListener('input', selectProductFromInput);
document.getElementById('interval-select').addEventListener('change', startAutoFetch);

startAutoFetch();
updateBalanceDisplay();
updateInventoryDisplay();
updateTransactionHistory();


const customBalanceInput = document.getElementById('custom-balance');
const setBalanceButton = document.getElementById('set-balance-button');


function handleSetCustomBalance() {
    const customBalance = parseFloat(customBalanceInput.value);

    if (isNaN(customBalance) || customBalance < 0) {
        alert("Please enter a valid balance.");
        return;
    }

    balance = customBalance;
    updateBalanceDisplay();
    saveData();  
}


setBalanceButton.addEventListener('click', handleSetCustomBalance);

function clearCookies() {
    localStorage.clear();
    location.reload();
}