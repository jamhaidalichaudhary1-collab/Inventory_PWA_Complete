function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  
  // If Reports section is shown, load the sales data for the selected month
  if (id === 'reports') {
    loadSales();
  }
}

document.getElementById("darkToggle").onclick = () => {
  document.body.classList.toggle("dark");
};

// Get elements
const purchaseProduct = document.getElementById('purchaseProduct');
const saleProduct = document.getElementById('saleProduct');
const purchaseQty = document.getElementById('purchaseQty');
const saleQty = document.getElementById('saleQty');;

let currentPeriod = '1Y';
let salesPurchaseChart = null; // Store chart instance for proper destruction

// Monthly Reports Variables
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
let selectedMonth = new Date().getMonth(); // Default to current month

function setFilter(period) {
  currentPeriod = period;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active', 'active-highlight');
  });
  const btn = [...document.querySelectorAll('.filter-btn')].find(b => b.textContent.trim() === period);
  if (btn) {
    btn.classList.add('active');
    if (period === '1Y') btn.classList.add('active-highlight');
  }
  updateDashboard();
}

function addProduct() {
  const product = {
    name: document.getElementById('pName').value,   // Fixed ID
    cost: +document.getElementById('pCost').value,  // Fixed ID
    sell: +document.getElementById('pSell').value,  // Fixed ID (pSell in HTML)
    stock: +document.getElementById('pStock').value // Fixed ID
  };
  addData("products", product);
  loadProducts();
}

function loadProducts() {
  getAll("products", data => {
    const tbody = document.getElementById("productTable").querySelector("tbody");
    tbody.innerHTML = "";
    data.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.cost}</td>
          <td>${p.sell}</td>
          <td>${p.stock}</td>
          <td>
            <button onclick="showEditForm(${p.id}, '${p.name}', ${p.cost}, ${p.sell}, ${p.stock})">Edit</button>
            <button onclick="deleteData('products', ${p.id}); loadProducts();">Delete</button>
          </td>
        </tr>`;
    });
    populateDropdowns(data);
    updateDashboard();
  });
}

function showEditForm(id, name, cost, sell, stock) {
  document.getElementById('editProductId').value = id;
  document.getElementById('editPName').value = name;
  document.getElementById('editPCost').value = cost;
  document.getElementById('editPSell').value = sell;
  document.getElementById('editPStock').value = stock;
  document.getElementById('editSection').style.display = 'block';
}

function cancelEdit() {
  document.getElementById('editSection').style.display = 'none';
  document.getElementById('editPCost').value = '';
  document.getElementById('editPSell').value = '';
  document.getElementById('editPStock').value = '';
}

function saveProductEdit() {
  const id = +document.getElementById('editProductId').value;
  const newCost = +document.getElementById('editPCost').value;
  const newSell = +document.getElementById('editPSell').value;
  const newStock = +document.getElementById('editPStock').value;
  
  // Validate cost
  if (!newCost || newCost < 0) {
    return alert("Please enter a valid cost price (cannot be negative)!");
  }
  
  // Validate selling price
  if (!newSell || newSell < 0) {
    return alert("Please enter a valid selling price (cannot be negative)!");
  }
  
  // Validate stock - must be a valid non-negative number
  if (isNaN(newStock) || newStock < 0) {
    return alert("Stock cannot be negative! Please enter a valid stock quantity.");
  }
  
  if (!Number.isInteger(newStock)) {
    return alert("Stock must be a whole number (no decimals)!");
  }
  
  getAll("products", products => {
    const product = products.find(p => p.id === id);
    product.cost = newCost;
    product.sell = newSell;
    product.stock = newStock;
    updateData("products", product, () => {
      cancelEdit();
      loadProducts();
    });
  });
}

function addPurchase() {
  const id = +purchaseProduct.value;
  const qty = +purchaseQty.value;
  const purchasePrice = document.getElementById('purchasePrice').value;
  const newCost = purchasePrice ? +purchasePrice : null;
  
  getAll("products", products => {
    const product = products.find(p => p.id === id);
    product.stock += qty;
    
    // Update cost if new price is provided
    if (newCost) {
      product.cost = newCost;
    }
    
    updateData("products", product, () => {
      addData("purchases", { productId: id, qty, cost: newCost || product.cost, date: new Date() });
      // Clear inputs after purchase
      document.getElementById('purchasePrice').value = '';
      purchaseQty.value = '';
      loadProducts();
    });
  });
}

// Shopping Cart Array
let shoppingCart = [];

// Add product to shopping cart
function addToCart() {
  const id = +saleProduct.value;
  const qty = +saleQty.value;
  
  if (!id || !qty || qty <= 0) {
    return alert("Please select a product and enter a valid quantity!");
  }
  
  getAll("products", products => {
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return alert("Product not found!");
    }
    
    if (product.stock < qty) {
      return alert(`Low stock! Only ${product.stock} available.`);
    }
    
    // Check if product already in cart
    const existingItem = shoppingCart.find(item => item.id === id);
    
    if (existingItem) {
      // Check total quantity doesn't exceed stock
      if (existingItem.qty + qty > product.stock) {
        return alert(`Only ${product.stock} available in stock!`);
      }
      existingItem.qty += qty;
    } else {
      shoppingCart.push({
        id: id,
        name: product.name,
        cost: product.cost,
        sell: product.sell,
        qty: qty
      });
    }
    
    saleQty.value = '';
    saleProduct.value = '';
    renderCart();
  });
}

// Render shopping cart
function renderCart() {
  const cartTable = document.getElementById('cartTable');
  const cartItems = document.getElementById('cartItems');
  const emptyMsg = document.getElementById('emptyCartMsg');
  const cartSummary = document.getElementById('cartSummary');
  const checkoutButtons = document.getElementById('checkoutButtons');
  
  if (shoppingCart.length === 0) {
    cartTable.style.display = 'none';
    emptyMsg.style.display = 'block';
    cartSummary.style.display = 'none';
    checkoutButtons.style.display = 'none';
    return;
  }
  
  cartTable.style.display = 'table';
  emptyMsg.style.display = 'none';
  cartSummary.style.display = 'block';
  checkoutButtons.style.display = 'flex';
  
  cartItems.innerHTML = '';
  
  shoppingCart.forEach((item, index) => {
    const subtotal = item.sell * item.qty;
    cartItems.innerHTML += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${item.name}</td>
        <td style="text-align: center; padding: 10px;">
          <input type="number" value="${item.qty}" min="1" 
            style="width: 60px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"
            onchange="updateCartQuantity(${index}, this.value)">
        </td>
        <td style="text-align: right; padding: 10px;">${item.sell} PKR</td>
        <td style="text-align: right; padding: 10px;">${subtotal.toFixed(0)} PKR</td>
        <td style="text-align: center; padding: 10px;">
          <button onclick="removeFromCart(${index})" 
            style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
        </td>
      </tr>
    `;
  });
  
  updateCartTotal();
}

// Remove item from cart
function removeFromCart(index) {
  shoppingCart.splice(index, 1);
  renderCart();
}

// Update cart item quantity
function updateCartQuantity(index, newQty) {
  const qty = +newQty;
  
  if (qty <= 0) {
    alert("Quantity must be greater than 0!");
    renderCart();
    return;
  }
  
  getAll("products", products => {
    const product = products.find(p => p.id === shoppingCart[index].id);
    
    if (qty > product.stock) {
      alert(`Only ${product.stock} available in stock!`);
      renderCart();
      return;
    }
    
    shoppingCart[index].qty = qty;
    renderCart();
  });
}

// Update cart totals and display discount input
function updateCartTotal() {
  let subtotal = 0;
  
  shoppingCart.forEach(item => {
    subtotal += item.sell * item.qty;
  });
  
  const discountInput = document.getElementById('cartDiscount');
  const discount = +discountInput.value || 0;
  const total = subtotal - discount;
  
  document.getElementById('subtotal').innerText = subtotal.toFixed(0) + ' PKR';
  document.getElementById('totalAmount').innerText = (total < 0 ? 0 : total).toFixed(0) + ' PKR';
}

// Complete multi-product sale
function completeMultiSale() {
  if (shoppingCart.length === 0) {
    return alert("Cart is empty!");
  }
  
  const discountInput = document.getElementById('cartDiscount');
  const totalDiscount = +discountInput.value || 0;
  
  if (totalDiscount < 0) {
    return alert("Discount cannot be negative!");
  }
  
  getAll("products", products => {
    let isValid = true;
    let totalQty = 0;
    let totalProfit = 0;
    
    // Validate all items have sufficient stock
    shoppingCart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (!product || product.stock < item.qty) {
        isValid = false;
        return;
      }
      totalQty += item.qty;
    });
    
    if (!isValid) {
      return alert("Some items have insufficient stock!");
    }
    
    // Distribute discount proportionally
    let subtotal = 0;
    shoppingCart.forEach(item => {
      subtotal += item.sell * item.qty;
    });
    
    // Process each item in cart
    let processedCount = 0;
    shoppingCart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      
      // Calculate proportional discount for this item
      const itemSubtotal = item.sell * item.qty;
      const itemDiscount = (itemSubtotal / subtotal) * totalDiscount;
      const itemSalePrice = item.sell - (itemDiscount / item.qty);
      const profit = (itemSalePrice - item.cost) * item.qty;
      
      totalProfit += profit;
      
      product.stock -= item.qty;
      updateData("products", product, () => {
        addData("sales", { 
          productId: item.id, 
          qty: item.qty, 
          profit: profit, 
          salePrice: itemSalePrice, 
          date: new Date() 
        });
        
        processedCount++;
        if (processedCount === shoppingCart.length) {
          // All items processed
          showCelebrationMulti(totalQty, totalProfit);
          clearCart();
          loadProducts();
        }
      });
    });
  });
}

// Show celebration popup for multi-sale
function showCelebrationMulti(totalQty, totalProfit) {
  const popup = document.getElementById('celebrationPopup');
  const message = document.getElementById('saleMessage');
  message.innerText = `Sold ${totalQty} items total! Total Profit: PKR ${totalProfit.toFixed(0)} 🚀`;
  popup.classList.remove('hidden');
  popup.classList.add('show');
  setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
  }, 3000);
}

// Clear shopping cart
function clearCart() {
  shoppingCart = [];
  document.getElementById('cartDiscount').value = '';
  renderCart();
}

// Keep old addSale function for backward compatibility if needed
function addSale() {
  // Now uses shopping cart system
  addToCart();
}

function addReturn() {
  const returnProductVal = document.getElementById("returnProduct").value;
  const returnQtyVal = document.getElementById("returnQty").value;
  const id = +returnProductVal;
  const qty = +returnQtyVal;
  
  if (!returnProductVal || returnProductVal === "") {
    return alert("Please select a product");
  }
  if (!returnQtyVal || qty <= 0) {
    return alert("Please enter a valid quantity");
  }
  if (isNaN(id) || id <= 0) {
    return alert("Invalid product selection");
  }
  
  getAll("products", products => {
    const product = products.find(p => p.id === id);
    if (!product) {
      return alert("Product not found");
    }
    
    product.stock += qty;
    const lossFromReturn = (product.sell - product.cost) * qty;
    
    updateData("products", product, () => {
      // Add return record as negative sale
      addData("sales", { productId: id, qty: -qty, profit: -lossFromReturn, date: new Date(), isReturn: true });
      document.getElementById("returnProduct").value = "";
      document.getElementById("returnQty").value = "";
      alert("Return processed successfully!");
      loadProducts();
    });
  });
}

function showCelebration(productName, qty, profit) {
  const popup = document.getElementById('celebrationPopup');
  const message = document.getElementById('saleMessage');
  message.innerText = `Sold ${qty} units of "${productName}"! Profit: PKR ${profit.toFixed(0)} 🚀`;
  popup.classList.remove('hidden');
  popup.classList.add('show');
  setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
  }, 3000);
}

function updateDashboard() {
  getAll("products", products => {
    document.getElementById("totalProducts").innerText = products.length;
    const totalStock = products.reduce((a, b) => a + b.stock, 0);
    document.getElementById("totalSuppliers").innerText = totalStock;

    getAll("sales", sales => {
      // Product Inventory - calculate sold quantities
      const soldByProduct = {};
      sales.forEach(s => {
        soldByProduct[s.productId] = (soldByProduct[s.productId] || 0) + s.qty;
      });
      
      const restockList = document.getElementById("restockList");
      restockList.innerHTML = "";
      products.forEach(p => {
        const sold = soldByProduct[p.id] || 0;
        restockList.innerHTML += `<li>${p.name}: ${p.stock} remaining, ${sold} sold</li>`;
      });

      // Totals using actual product prices
      const totalPurchase = sales.reduce((a, b) => {
        const product = products.find(p => p.id === b.productId);
        return a + (b.qty * (product ? product.cost : 0));
      }, 0);
      document.getElementById("totalPurchase").innerText = totalPurchase.toFixed(0) + " PKR";

      const totalSalesAmount = sales.reduce((a, b) => {
        const product = products.find(p => p.id === b.productId);
        return a + (b.qty * (product ? product.sell : 0));
      }, 0);
      document.getElementById("totalSalesAmount").innerText = totalSalesAmount.toFixed(0) + " PKR";

      // Calculate Total Stock Cost (investment in current inventory)
      const totalStockCost = products.reduce((total, product) => {
        return total + (product.cost * product.stock);
      }, 0);
      document.getElementById("totalStockCost").innerText = totalStockCost.toFixed(0) + " PKR";

      // Calculate Total Profit (from all sales)
      const totalProfit = sales.reduce((a, b) => a + b.profit, 0);
      document.getElementById("totalProfit").innerText = totalProfit.toFixed(0) + " PKR";
      document.getElementById("totalProfitCard").innerText = totalProfit.toFixed(0) + " PKR";

      // Period filters
      const today = new Date();
      const todayKey = today.toDateString();
      const thisWeek = new Date(new Date().setDate(new Date().getDate() - 7));

      const todaySalesCount = sales.filter(s => new Date(s.date).toDateString() === todayKey).reduce((a, b) => a + b.qty, 0);
      document.getElementById("todaySales").innerText = todaySalesCount;

      const todaySalesAmount = sales.filter(s => new Date(s.date).toDateString() === todayKey).reduce((a, b) => {
        const product = products.find(p => p.id === b.productId);
        return a + (b.qty * (product ? product.sell : 0));
      }, 0);
      document.getElementById("todayEarnings").innerText = todaySalesAmount.toFixed(0) + " PKR";

      const weekSalesCount = sales.filter(s => new Date(s.date) >= thisWeek).reduce((a, b) => a + b.qty, 0);
      document.getElementById("weekSales").innerText = weekSalesCount;

      const weekSalesAmount = sales.filter(s => new Date(s.date) >= thisWeek).reduce((a, b) => {
        const product = products.find(p => p.id === b.productId);
        return a + (b.qty * (product ? product.sell : 0));
      }, 0);
      document.getElementById("weekEarnings").innerText = weekSalesAmount.toFixed(0) + " PKR";

      const monthlySalesCount = sales.filter(s => new Date(s.date).getMonth() === today.getMonth() && new Date(s.date).getFullYear() === today.getFullYear()).reduce((a, b) => a + b.qty, 0);
      document.getElementById("monthlySales").innerText = monthlySalesCount;

      const monthlySalesAmount = sales.filter(s => new Date(s.date).getMonth() === today.getMonth() && new Date(s.date).getFullYear() === today.getFullYear()).reduce((a, b) => {
        const product = products.find(p => p.id === b.productId);
        return a + (b.qty * (product ? product.sell : 0));
      }, 0);
      document.getElementById("monthEarnings").innerText = monthlySalesAmount.toFixed(0) + " PKR";

      drawChart(sales, currentPeriod);
      drawCustomersChart();
    });
  });
  loadSales();
}


function drawChart(sales, period) {
  const ctx = document.getElementById("salesPurchaseChart");
  if (!ctx) return;
  
  // Destroy old chart if it exists
  if (salesPurchaseChart) {
    salesPurchaseChart.destroy();
  }
  
  const now = new Date();
  let filteredSales = sales;
  let groupBy = 'month';
  let labels = [];
  
  // Filter sales based on period
  if (period === '1D') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filteredSales = sales.filter(s => new Date(s.date) >= start);
    groupBy = 'hour';
  } else if (period === '1W') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredSales = sales.filter(s => new Date(s.date) >= start);
    groupBy = 'day';
  } else if (period === '1M') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredSales = sales.filter(s => new Date(s.date) >= start);
    groupBy = 'day';
  } else if (period === '3M') {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    filteredSales = sales.filter(s => new Date(s.date) >= start);
    groupBy = 'week';
  } else if (period === '6M') {
    const start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    filteredSales = sales.filter(s => new Date(s.date) >= start);
    groupBy = 'month';
  } else { // 1Y
    groupBy = 'month';
  }
  
  // Group data
  const monthlyData = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  filteredSales.forEach(s => {
    const date = new Date(s.date);
    let key;
    if (groupBy === 'month') {
      key = months[date.getMonth()] + ' ' + date.getFullYear();
    } else if (groupBy === 'day') {
      key = date.toDateString();
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toDateString();
    } else if (groupBy === 'hour') {
      key = date.getHours() + ':00';
    }
    if (!monthlyData[key]) {
      monthlyData[key] = { purchase: 0, sales: 0 };
    }
    monthlyData[key].purchase += s.qty * 50;
    monthlyData[key].sales += s.qty * 30;
  });
  
  const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
    if (groupBy === 'month') {
      const aDate = new Date(a.split(' ')[1], months.indexOf(a.split(' ')[0]));
      const bDate = new Date(b.split(' ')[1], months.indexOf(b.split(' ')[0]));
      return aDate - bDate;
    } else {
      return new Date(a) - new Date(b);
    }
  });
  
  labels = sortedKeys;
  const purchaseData = sortedKeys.map(k => monthlyData[k].purchase / 1000);
  const salesData = sortedKeys.map(k => monthlyData[k].sales / 1000);
  
  salesPurchaseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Purchase',
        data: purchaseData,
        backgroundColor: '#ffc69e',
        borderRadius: 8
      }, {
        label: 'Sales',
        data: salesData,
        backgroundColor: '#ff6b35',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function checkAndAutoDownloadMonthlyReport() {
  const now = new Date();
  const lastCheckKey = 'lastMonthlyReportCheck';
  const lastCheck = localStorage.getItem(lastCheckKey);
  const currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
  
  // Check if we've already done this month's auto-download
  if (lastCheck !== currentMonth) {
    // Auto-download monthly report
    setTimeout(() => {
      exportCSV();
      localStorage.setItem(lastCheckKey, currentMonth);
    }, 1000);
  }
}

function drawCustomersChart() {
  const ctx = document.getElementById("customersChart");
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Inactive'],
      datasets: [{
        data: [5500, 3500],
        backgroundColor: ['#4CAF50', '#9CCC65'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function exportCSV() {
  getAll("products", products => {
    getAll("sales", sales => {
      let csv = "Product Name,Cost,Sell,Stock,Sale Date,Qty,Profit\n";
      products.forEach(p => {
        const productSales = sales.filter(s => s.productId === p.id);
        if (productSales.length > 0) {
          productSales.forEach(s => {
            csv += `${p.name},${p.cost},${p.sell},${p.stock},${new Date(s.date).toLocaleDateString()},${s.qty},${s.profit}\n`;
          });
        } else {
          csv += `${p.name},${p.cost},${p.sell},${p.stock},,,0\n`;
        }
      });
      const blob = new Blob([csv]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "inventory_sales.csv";
      a.click();
    });
  });
}

function searchProduct() {
  const query = document.getElementById('searchProduct').value.toLowerCase();
  const rows = document.querySelectorAll('#productList tr');
  rows.forEach(row => {
    const name = row.cells[0].textContent.toLowerCase();
    row.style.display = name.includes(query) ? '' : 'none';
  });
}

function loadSales() {
  getAll("sales", sales => {
    getAll("products", products => {
      const tbody = document.getElementById("salesTable").querySelector("tbody");
      tbody.innerHTML = "";
      
      // Filter sales by selected month
      const filteredSales = sales.filter(s => isInSelectedMonth(s.date));
      
      if (filteredSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">No sales recorded for ${monthNames[selectedMonth]}</td></tr>`;
        return;
      }
      
      filteredSales.forEach(s => {
        const product = products.find(p => p.id === s.productId);
        const productName = product ? product.name : 'Unknown';
        tbody.innerHTML += `<tr>
          <td>${new Date(s.date).toLocaleDateString()}</td>
          <td>${productName}</td>
          <td>${s.qty}</td>
          <td>${s.profit} PKR</td>
        </tr>`;
      });
    });
  });
}

function resetTotals() {
  if (confirm("Are you sure you want to reset all sales data? This action cannot be undone.")) {
    getAll("sales", sales => {
      let remaining = sales.length;
      if (remaining === 0) {
        updateDashboard();
        return;
      }
      sales.forEach(s => {
        deleteData("sales", s.id, () => {
          remaining--;
          if (remaining === 0) {
            updateDashboard();
          }
        });
      });
    });
  }
}

function populateDropdowns(products) {
  purchaseProduct.innerHTML = "";
  saleProduct.innerHTML = "";
  const returnProductElem = document.getElementById("returnProduct");
  if (returnProductElem) {
    returnProductElem.innerHTML = '<option value="">-- Select Product --</option>';
  }
  products.forEach(p => {
    purchaseProduct.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    saleProduct.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    if (returnProductElem) {
      returnProductElem.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    }
  });
}

// Event listeners for forms
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  addProduct();
  alert('Product saved!');
  this.reset();
});

document.getElementById('purchaseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  addPurchase();
  alert('Purchase added!');
  this.reset();
});

document.getElementById('saleForm').addEventListener('submit', function(e) {
  e.preventDefault();
  addSale();
  alert('Sale added!');
  this.reset();
});

// Initialize
loadProducts();
showSection('dashboard');
checkAndAutoDownloadMonthlyReport();

function downloadBackup() {
  const backup = localStorage.getItem("inventoryBackup");
  if (backup) {
    const blob = new Blob([backup], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  } else {
    alert("No backup available. Please add some data first.");
  }
}

function uploadBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (confirm("This will replace all your current data. Are you sure?")) {
        // Clear all stores
        const stores = ["products", "sales", "purchases"];
        let completed = 0;
        stores.forEach(store => {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).clear();
          tx.oncomplete = () => {
            completed++;
            if (completed === stores.length) {
              // Add all data back
              backup.products.forEach(p => addData("products", p));
              backup.sales.forEach(s => addData("sales", s));
              backup.purchases.forEach(p => addData("purchases", p));
              setTimeout(() => {
                loadProducts();
                updateDashboard();
                alert("Data restored successfully!");
              }, 500);
            }
          };
        });
      }
    } catch (error) {
      alert("Invalid backup file!");
    }
  };
  reader.readAsText(file);
}

function updateLastBackupTime() {
  const backup = localStorage.getItem("inventoryBackup");
  if (backup) {
    const data = JSON.parse(backup);
    const time = new Date(data.timestamp).toLocaleString();
    document.getElementById("lastBackupTime").innerText = time;
  }
}

// Update backup time on load
updateLastBackupTime();

// Auto-backup every 5 minutes
setInterval(() => {
  backupToLocalStorage();
  updateLastBackupTime();
}, 300000);

// ============ MONTHLY REPORTS FEATURE ============
// IMPORTANT: The monthly tabs ONLY FILTER the display of reports
// ALL your old sales history is preserved in the database
// No data is deleted, only filtered by month for viewing

function filterByMonth(monthIndex) {
  selectedMonth = monthIndex;
  
  // Update active tab styling
  const monthTabs = document.querySelectorAll('.month-tab');
  monthTabs.forEach((btn, index) => {
    btn.classList.remove('active');
    if (index === monthIndex) {
      btn.classList.add('active');
    }
  });
  
  // Update month display
  const selectedMonthElement = document.getElementById('selectedMonth');
  if (selectedMonthElement) {
    selectedMonthElement.innerText = monthNames[monthIndex];
  }
  
  // Reload sales table with new filter (data is NOT deleted, only filtered)
  loadSales();
}

function isInSelectedMonth(date) {
  const saleDate = new Date(date);
  const currentYear = new Date().getFullYear();
  return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === currentYear;
}



function exportCSVByMonth() {
  getAll("products", products => {
    getAll("sales", sales => {
      const monthSales = sales.filter(s => isInSelectedMonth(s.date));
      let csv = "Product Name,Cost,Sell,Stock,Sale Date,Qty,Profit\n";
      
      products.forEach(p => {
        const productSales = monthSales.filter(s => s.productId === p.id);
        if (productSales.length > 0) {
          productSales.forEach(s => {
            csv += `${p.name},${p.cost},${p.sell},${p.stock},${new Date(s.date).toLocaleDateString()},${s.qty},${s.profit}\n`;
          });
        }
      });

      // If no sales, still provide header
      if (monthSales.length === 0) {
        csv += "\n// No sales recorded for this month\n";
      }

      const blob = new Blob([csv]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `inventory_sales_${monthNames[selectedMonth]}_${new Date().getFullYear()}.csv`;
      a.click();
    });
  });
}

// Initialize monthly tabs on page load
document.addEventListener('DOMContentLoaded', function() {
  // Wait a brief moment to ensure all DOM elements are loaded
  setTimeout(function() {
    // Set the current month tab as active
    const currentMonth = new Date().getMonth();
    const monthTabs = document.querySelectorAll('.month-tab');
    
    if (monthTabs.length > 0) {
      // Remove active class from all tabs first
      monthTabs.forEach(tab => tab.classList.remove('active'));
      
      // Set current month as active
      if (monthTabs.length > currentMonth) {
        monthTabs[currentMonth].classList.add('active');
        selectedMonth = currentMonth;
        
        // Update the selected month display
        if (document.getElementById('selectedMonth')) {
          document.getElementById('selectedMonth').innerText = monthNames[currentMonth];
        }
      }
    }
  }, 100);
});
