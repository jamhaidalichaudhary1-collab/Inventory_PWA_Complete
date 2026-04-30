let db;
const request = indexedDB.open("InventoryDB", 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("sales", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("purchases", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function(e) {
  db = e.target.result;
  loadProducts();
  updateDashboard();
  backupToLocalStorage();
};

function backupToLocalStorage() {
  getAll("products", products => {
    getAll("sales", sales => {
      getAll("purchases", purchases => {
        const backup = {
          products: products,
          sales: sales,
          purchases: purchases,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem("inventoryBackup", JSON.stringify(backup));
      });
    });
  });
}

function restoreFromLocalStorage() {
  const backup = localStorage.getItem("inventoryBackup");
  if (backup) {
    return JSON.parse(backup);
  }
  return null;
}

function addData(store, data) {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).add(data);
  tx.oncomplete = () => backupToLocalStorage();
}

function getAll(store, callback) {
  const tx = db.transaction(store, "readonly");
  const req = tx.objectStore(store).getAll();
  req.onsuccess = () => callback(req.result);
}

function updateData(store, data, callback) {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(data);
  if (callback) tx.oncomplete = () => {
    callback();
    backupToLocalStorage();
  };
  else tx.oncomplete = () => backupToLocalStorage();
}

function deleteData(store, id, callback) {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  if (callback) tx.oncomplete = () => {
    callback();
    backupToLocalStorage();
  };
  else tx.oncomplete = () => backupToLocalStorage();
}
