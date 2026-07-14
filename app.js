/*
 * Niwasa Constructions ERP - Advanced Logic with Delete, CSV & History
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
// Added deleteDoc
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtpKSpZi-0IOB_yBdPRt_CKQ_0-7McBss",
    authDomain: "niwasa-cost-analitics.firebaseapp.com",
    projectId: "niwasa-cost-analitics",
    storageBucket: "niwasa-cost-analitics.firebasestorage.app",
    messagingSenderId: "708635197914",
    appId: "1:708635197914:web:36e6e47ccad0707451c0e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const IMGBB_API_KEY = "4d99a2396623c2d301a6e8233f352ba7";

let allExpenses = []; 
let allSites = [];

// ==========================================
// AUTHENTICATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('currentUserEmail').innerText = user.email;
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        e.target.reset();
    } catch (error) {
        const err = document.getElementById('loginError');
        err.innerText = "Invalid credentials."; err.classList.remove('hidden');
    } finally { btn.innerHTML = '<span>Sign In</span>'; }
});
document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));


// ==========================================
// COMMON DELETE FUNCTION
// ==========================================
window.deleteDocument = async function(collectionName, docId) {
    if(confirm("Are you sure you want to permanently delete this record? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, collectionName, docId));
        } catch (error) {
            alert("Error deleting record. You might not have permission.");
        }
    }
};


// ==========================================
// SITES MANAGEMENT
// ==========================================
const expSiteSelect = document.getElementById('expSite');
const reportSiteSelect = document.getElementById('reportSiteSelect');

document.getElementById('siteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "sites"), {
        name: document.getElementById('siteName').value,
        location: document.getElementById('siteLocation').value,
        startDate: document.getElementById('siteStartDate').value,
        status: 'Active', createdAt: serverTimestamp()
    });
    e.target.reset(); document.getElementById('siteStartDate').valueAsDate = new Date();
});

onSnapshot(query(collection(db, "sites"), orderBy("createdAt", "desc")), (snapshot) => {
    const tbody = document.getElementById('sitesTableBody');
    tbody.innerHTML = '';
    expSiteSelect.innerHTML = '<option value="" disabled selected>Select Site</option>';
    reportSiteSelect.innerHTML = '<option value="" disabled selected>Select a Site...</option>'; 
    let activeCount = 0;
    allSites = []; 

    snapshot.forEach((docRef) => {
        const data = docRef.data();
        allSites.push(data.name); 

        reportSiteSelect.innerHTML += `<option value="${data.name}">${data.name} (${data.status})</option>`;
        if (data.status === 'Active') {
            activeCount++;
            expSiteSelect.innerHTML += `<option value="${data.name}">${data.name} (${data.location})</option>`;
        }
        
        const actionBtns = `
            <div class="flex justify-center items-center space-x-2">
                ${data.status === 'Active' ? `<button onclick="markSiteCompleted('${docRef.id}')" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded">Mark Completed</button>` : `<span class="text-xs text-gray-400">Done</span>`}
                <button onclick="deleteDocument('sites', '${docRef.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-medium text-gray-900">${data.name}</td>
                <td class="p-3 text-gray-600">${data.location}</td>
                <td class="p-3">${data.startDate}</td>
                <td class="p-3">${data.status === 'Active' ? `<span class="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded">Active</span>` : `<span class="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded">Completed</span>`}</td>
                <td class="p-3 text-center">${actionBtns}</td>
            </tr>
        `;
    });
    document.getElementById('active-sites-lbl').innerText = activeCount;
});
window.markSiteCompleted = async (id) => { if(confirm("Mark site as Completed?")) await updateDoc(doc(db, "sites", id), { status: "Completed" }); };


// ==========================================
// EXPENSES MANAGEMENT
// ==========================================
const expSubmitBtn = document.getElementById('expSubmitBtn');
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    expSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...'; expSubmitBtn.disabled = true;
    try {
        let category = document.getElementById('expCategory').value;
        if (category === 'Other') category = document.getElementById('expCustomCategory').value;
        let receiptUrl = null;
        const fileInput = document.getElementById('expReceipt');
        if (fileInput.files.length > 0) {
            const formData = new FormData(); formData.append("image", fileInput.files[0]);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const imgbbData = await res.json(); if(imgbbData.success) receiptUrl = imgbbData.data.display_url;
        }
        await addDoc(collection(db, "expenses"), {
            siteName: document.getElementById('expSite').value, date: document.getElementById('expDate').value,
            category: category, amount: parseFloat(document.getElementById('expAmount').value),
            description: document.getElementById('expDesc').value, receiptUrl: receiptUrl, createdAt: serverTimestamp()
        });
        e.target.reset(); document.getElementById('expDate').valueAsDate = new Date(); document.getElementById('customCategoryDiv').style.display = 'none';
    } catch (error) { alert('Error adding expense.'); } finally { expSubmitBtn.innerHTML = '<span>Save Expense</span>'; expSubmitBtn.disabled = false; }
});

onSnapshot(query(collection(db, "expenses"), orderBy("createdAt", "desc")), (snapshot) => {
    const tbody = document.getElementById('expensesTableBody'); tbody.innerHTML = '';
    let total = 0;
    allExpenses = []; 

    snapshot.forEach((docRef) => {
        const data = docRef.data();
        allExpenses.push(data); 
        total += data.amount || 0;
        
        const receiptBtn = data.receiptUrl ? `<a href="${data.receiptUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm font-semibold"><i class="fas fa-file-image mr-1"></i> View</a>` : `<span class="text-xs text-gray-400">-</span>`;
        
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 text-gray-600 whitespace-nowrap">${data.date}</td>
                <td class="p-3"><div class="font-medium text-gray-900">${data.siteName}</div><div class="text-xs text-gray-500"><span class="bg-blue-100 text-blue-800 text-xs px-1 rounded mr-1">${data.category}</span>${data.description}</div></td>
                <td class="p-3 text-right font-bold text-gray-800">Rs. ${data.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="p-3 text-center">${receiptBtn}</td>
                <td class="p-3 text-center"><button onclick="deleteDocument('expenses', '${docRef.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash-alt"></i></button></td>
            </tr>
        `;
    });
    document.getElementById('total-expenses-lbl').innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
});


// ==========================================
// REPORTS & CSV GENERATION
// ==========================================
window.generateReport = function() {
    const selectedSite = document.getElementById('reportSiteSelect').value;
    if (!selectedSite) return alert("Please select a site first.");

    const siteExpenses = allExpenses.filter(exp => exp.siteName === selectedSite);
    let totalCost = 0;
    let categorySummary = {};

    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';

    siteExpenses.forEach(exp => {
        totalCost += exp.amount;
        if (categorySummary[exp.category]) categorySummary[exp.category] += exp.amount;
        else categorySummary[exp.category] = exp.amount;

        tableBody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 text-gray-600">${exp.date}</td>
                <td class="p-3 font-semibold text-gray-700">${exp.category}</td>
                <td class="p-3 text-gray-500">${exp.description || '-'}</td>
                <td class="p-3 text-right font-medium text-gray-900">${exp.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });

    document.getElementById('reportEmptyState').classList.add('hidden');
    document.getElementById('reportContent').classList.remove('hidden');
    document.getElementById('printBtn').classList.remove('hidden');
    document.getElementById('csvBtn').classList.remove('hidden');
    
    document.getElementById('reportSiteName').innerText = selectedSite;
    document.getElementById('reportGenDate').innerText = new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString();
    document.getElementById('reportTotalCost').innerText = totalCost.toLocaleString(undefined, {minimumFractionDigits: 2});

    const summaryList = document.getElementById('reportSummaryList');
    summaryList.innerHTML = '';
    
    if (Object.keys(categorySummary).length === 0) {
        summaryList.innerHTML = '<li class="text-gray-400">No expenses recorded yet.</li>';
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-400">No data available</td></tr>';
    } else {
        const sortedCats = Object.entries(categorySummary).sort((a, b) => b[1] - a[1]);
        sortedCats.forEach(([cat, amount]) => {
            const percentage = ((amount / totalCost) * 100).toFixed(1);
            summaryList.innerHTML += `
                <li class="flex justify-between items-center">
                    <span><i class="fas fa-tag text-gray-400 mr-2 text-xs"></i>${cat}</span>
                    <div class="text-right">
                        <span class="font-bold text-gray-800">Rs. ${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        <span class="text-xs text-gray-500 ml-1">(${percentage}%)</span>
                    </div>
                </li>
            `;
        });
    }
};

window.downloadCSV = function() {
    const selectedSite = document.getElementById('reportSiteSelect').value;
    if (!selectedSite) return;
    const siteExpenses = allExpenses.filter(exp => exp.siteName === selectedSite);
    
    let csv = "Date,Category,Description,Amount (Rs.)\n";
    siteExpenses.forEach(exp => {
        // Replace commas in description to avoid CSV breaking
        const safeDesc = exp.description ? exp.description.replace(/,/g, ' ') : '';
        csv += `${exp.date},${exp.category},${safeDesc},${exp.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedSite.replace(/\s+/g, '_')}_Expenses.csv`);
    a.click();
};


// ==========================================
// MASTER ITEM CATEGORIES
// ==========================================
let globalCategories = [];
document.getElementById('masterItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "itemCategories"), {
        name: document.getElementById('masterItemName').value,
        prefix: document.getElementById('masterItemPrefix').value.toUpperCase(),
        createdAt: serverTimestamp()
    });
    e.target.reset();
});

onSnapshot(query(collection(db, "itemCategories"), orderBy("name", "asc")), (snapshot) => {
    const tbody = document.getElementById('masterItemsTableBody'); tbody.innerHTML = '';
    const select = document.getElementById('itemTypeSelect'); select.innerHTML = '<option value="" disabled selected>Select Item Category</option>';
    globalCategories = [];
    snapshot.forEach((docRef) => {
        const data = docRef.data(); globalCategories.push(data);
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-medium text-gray-800">${data.name}</td>
                <td class="p-3"><span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold">${data.prefix}</span></td>
                <td class="p-3 text-center"><button onclick="deleteDocument('itemCategories', '${docRef.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash-alt"></i></button></td>
            </tr>`;
        select.innerHTML += `<option value="${data.prefix}">${data.name} (${data.prefix})</option>`;
    });
});


// ==========================================
// INVENTORY & MOVEMENT HISTORY LOGIC
// ==========================================
async function generateItemID(prefix) {
    const qCount = query(collection(db, "inventory"), where("prefix", "==", prefix));
    const snapshot = await getDocs(qCount); return `${prefix}-${(snapshot.size + 1).toString().padStart(3, '0')}`;
}

document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prefix = document.getElementById('itemTypeSelect').value;
    const cat = globalCategories.find(c => c.prefix === prefix);
    if(!cat) return;
    
    const initialLocation = document.getElementById('itemLocation').value;
    const itemID = await generateItemID(prefix);

    const newItemRef = await addDoc(collection(db, "inventory"), {
        itemID: itemID, prefix: prefix, name: cat.name,
        purchasedDate: document.getElementById('itemDate').value,
        location: initialLocation,
        status: 'Active', createdAt: serverTimestamp()
    });

    // Record initial location in history
    await addDoc(collection(db, "inventoryHistory"), {
        itemID: itemID,
        from: "New Purchase",
        to: initialLocation,
        movedAt: serverTimestamp(),
        date: new Date().toLocaleDateString()
    });

    e.target.reset(); document.getElementById('itemDate').valueAsDate = new Date();
});

onSnapshot(query(collection(db, "inventory"), orderBy("createdAt", "desc")), (snapshot) => {
    const tbody = document.getElementById('inventoryTableBody'); tbody.innerHTML = '';
    let activeItemsCount = 0;
    snapshot.forEach((docRef) => {
        const data = docRef.data();
        if(data.status !== 'Removed') activeItemsCount++;
        
        let statusBadge = '';
        if(data.status === 'Active') statusBadge = `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded"><i class="fas fa-check-circle mr-1"></i>Active</span>`;
        else if(data.status === 'Repair') statusBadge = `<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded"><i class="fas fa-wrench mr-1"></i>In Repair</span>`;
        else if(data.status === 'Removed') statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded"><i class="fas fa-trash mr-1"></i>Removed</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-bold text-gray-800">${data.itemID}</td>
                <td class="p-3">${data.name}</td>
                <td class="p-3 font-semibold text-blue-700">${data.status === 'Removed' ? '-' : data.location}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-center space-x-1 flex justify-center items-center">
                    <button onclick="viewHistory('${data.itemID}')" title="View History" class="text-blue-500 hover:text-blue-700 p-1 mr-1"><i class="fas fa-history"></i></button>
                    <button onclick="updateLocation('${docRef.id}', '${data.location}', '${data.itemID}')" title="Move Site/Location" class="bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded transition ${data.status === 'Removed' ? 'hidden':''}">
                        <i class="fas fa-truck"></i> Move
                    </button>
                    <select onchange="changeItemStatus('${docRef.id}', this.value)" class="text-xs border p-1 rounded bg-white cursor-pointer ml-1">
                        <option value="" disabled selected>Status...</option>
                        <option value="Active">Active</option>
                        <option value="Repair">Send to Repair</option>
                        <option value="Removed">Remove/Discard</option>
                    </select>
                    <button onclick="deleteDocument('inventory', '${docRef.id}')" class="text-red-500 hover:text-red-700 p-1 ml-2"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById('total-items-lbl').innerText = activeItemsCount;
});

// Location Update logic - Saves History
window.updateLocation = async function(docId, currentLocation, itemID) {
    const newLocation = prompt(`Current Location: ${currentLocation}\n\nEnter new assigned Site or Office:`, currentLocation);
    if (newLocation && newLocation.trim() !== "" && newLocation !== currentLocation) {
        
        // Update main item document
        await updateDoc(doc(db, "inventory", docId), { location: newLocation, updatedAt: serverTimestamp() });
        
        // Add record to history collection
        await addDoc(collection(db, "inventoryHistory"), {
            itemID: itemID,
            from: currentLocation,
            to: newLocation,
            movedAt: serverTimestamp(),
            date: new Date().toLocaleDateString()
        });
    }
};

window.changeItemStatus = async function(docId, newStatus) {
    if(newStatus && confirm(`Change item status to ${newStatus}?`)) {
        await updateDoc(doc(db, "inventory", docId), { status: newStatus, updatedAt: serverTimestamp() });
    }
};

// View History Logic
window.viewHistory = async function(itemID) {
    document.getElementById('historyItemName').innerText = `Item: ${itemID}`;
    const list = document.getElementById('historyList');
    list.innerHTML = '<li class="text-center text-gray-500"><i class="fas fa-spinner fa-spin"></i> Loading...</li>';
    document.getElementById('historyEmpty').classList.add('hidden');
    document.getElementById('historyModal').classList.remove('hidden');

    const q = query(collection(db, "inventoryHistory"), where("itemID", "==", itemID), orderBy("movedAt", "desc"));
    const snapshot = await getDocs(q);

    list.innerHTML = '';
    if (snapshot.empty) {
        document.getElementById('historyEmpty').classList.remove('hidden');
    } else {
        snapshot.forEach(doc => {
            const data = doc.data();
            list.innerHTML += `
                <li class="pl-6 relative">
                    <span class="absolute left-[-5px] top-1 w-3 h-3 bg-blue-500 rounded-full"></span>
                    <p class="text-sm font-bold text-gray-800">${data.date}</p>
                    <p class="text-sm text-gray-600">Moved from <span class="font-semibold text-red-500">${data.from}</span> to <span class="font-semibold text-green-600">${data.to}</span></p>
                </li>
            `;
        });
    }
};
