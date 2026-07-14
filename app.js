/*
 * Niwasa Constructions ERP - Advanced Logic
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
// Import Auth
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

// ImgBB API Key
const IMGBB_API_KEY = "4d99a2396623c2d301a6e8233f352ba7";

// ==========================================
// AUTHENTICATION (Login System)
// ==========================================
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEmail = document.getElementById('currentUserEmail');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

// Listen for auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged in
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        currentUserEmail.innerText = user.email;
    } else {
        // Logged out
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
    } catch (error) {
        loginError.innerText = "Invalid credentials. Please try again.";
        loginError.classList.remove('hidden');
    } finally {
        loginBtn.innerHTML = '<span>Sign In</span>';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});


// ==========================================
// MASTER ITEM CATEGORIES (New Feature)
// ==========================================
const masterItemForm = document.getElementById('masterItemForm');
const masterItemsTableBody = document.getElementById('masterItemsTableBody');
const itemTypeSelect = document.getElementById('itemTypeSelect'); // In Inventory Tab

let globalCategories = []; // Keep in memory to use when adding items

masterItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('masterItemName').value,
        prefix: document.getElementById('masterItemPrefix').value.toUpperCase(),
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "itemCategories"), data);
        masterItemForm.reset();
        alert('Category Created!');
    } catch (error) {
        console.error(error);
        alert('Error saving category.');
    }
});

// Listen to Item Categories
onSnapshot(query(collection(db, "itemCategories"), orderBy("name", "asc")), (snapshot) => {
    masterItemsTableBody.innerHTML = '';
    itemTypeSelect.innerHTML = '<option value="" disabled selected>Select Item Category</option>';
    globalCategories = [];

    snapshot.forEach((docRef) => {
        const data = docRef.data();
        globalCategories.push(data);
        
        // Update Table
        masterItemsTableBody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-medium text-gray-800">${data.name}</td>
                <td class="p-3"><span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold">${data.prefix}</span></td>
            </tr>
        `;
        
        // Update Dropdown in Inventory Tab
        itemTypeSelect.innerHTML += `<option value="${data.prefix}">${data.name} (${data.prefix})</option>`;
    });
});


// ==========================================
// SITES MANAGEMENT (Unchanged)
// ==========================================
const siteForm = document.getElementById('siteForm');
const sitesTableBody = document.getElementById('sitesTableBody');
const activeSitesLbl = document.getElementById('active-sites-lbl');
const expSiteSelect = document.getElementById('expSite');

siteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const siteData = {
        name: document.getElementById('siteName').value,
        location: document.getElementById('siteLocation').value,
        startDate: document.getElementById('siteStartDate').value,
        status: 'Active',
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, "sites"), siteData);
        siteForm.reset();
        document.getElementById('siteStartDate').valueAsDate = new Date();
    } catch (error) { alert('Error adding site.'); }
});

onSnapshot(query(collection(db, "sites"), orderBy("createdAt", "desc")), (snapshot) => {
    sitesTableBody.innerHTML = '';
    expSiteSelect.innerHTML = '<option value="" disabled selected>Select Site</option>';
    let activeCount = 0;
    
    snapshot.forEach((docRef) => {
        const data = docRef.data();
        if (data.status === 'Active') {
            activeCount++;
            expSiteSelect.innerHTML += `<option value="${data.name}">${data.name} (${data.location})</option>`;
        }
        
        const statusBadge = data.status === 'Active' 
            ? `<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Active</span>`
            : `<span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Completed</span>`;

        const actionBtn = data.status === 'Active'
            ? `<button onclick="markSiteCompleted('${docRef.id}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-1 px-3 rounded transition">Mark Completed</button>`
            : `<span class="text-xs text-gray-400">Done</span>`;
        
        sitesTableBody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-medium text-gray-900">${data.name}</td>
                <td class="p-3 text-gray-600">${data.location}</td>
                <td class="p-3">${data.startDate}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-center">${actionBtn}</td>
            </tr>
        `;
    });
    activeSitesLbl.innerText = activeCount;
});

window.markSiteCompleted = async function(docId) {
    if(confirm("Mark this site as Completed?")) {
        await updateDoc(doc(db, "sites", docId), { status: "Completed" });
    }
};


// ==========================================
// EXPENSES & IMGBB INTEGRATION
// ==========================================
const expenseForm = document.getElementById('expenseForm');
const expensesTableBody = document.getElementById('expensesTableBody');
const totalExpensesLbl = document.getElementById('total-expenses-lbl');
const expSubmitBtn = document.getElementById('expSubmitBtn');

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    expSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    expSubmitBtn.disabled = true;

    try {
        let category = document.getElementById('expCategory').value;
        if (category === 'Other') category = document.getElementById('expCustomCategory').value;
        
        let receiptUrl = null;
        
        // Handle Image Upload to ImgBB
        const fileInput = document.getElementById('expReceipt');
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("image", fileInput.files[0]);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const imgbbData = await response.json();
            if(imgbbData.success) {
                receiptUrl = imgbbData.data.display_url;
            }
        }

        const expenseData = {
            siteName: document.getElementById('expSite').value,
            date: document.getElementById('expDate').value,
            category: category,
            amount: parseFloat(document.getElementById('expAmount').value),
            description: document.getElementById('expDesc').value,
            receiptUrl: receiptUrl,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "expenses"), expenseData);
        expenseForm.reset();
        document.getElementById('expDate').valueAsDate = new Date();
        document.getElementById('customCategoryDiv').style.display = 'none';
        
    } catch (error) {
        console.error(error);
        alert('Error adding expense.');
    } finally {
        expSubmitBtn.innerHTML = '<span>Save Expense</span>';
        expSubmitBtn.disabled = false;
    }
});

onSnapshot(query(collection(db, "expenses"), orderBy("createdAt", "desc")), (snapshot) => {
    expensesTableBody.innerHTML = '';
    let total = 0;
    snapshot.forEach((docRef) => {
        const data = docRef.data();
        total += data.amount || 0;
        
        const receiptBtn = data.receiptUrl 
            ? `<a href="${data.receiptUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm font-semibold"><i class="fas fa-file-image mr-1"></i> View</a>`
            : `<span class="text-xs text-gray-400">No Bill</span>`;

        expensesTableBody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 text-gray-600 whitespace-nowrap">${data.date}</td>
                <td class="p-3">
                    <div class="font-medium text-gray-900">${data.siteName}</div>
                    <div class="text-xs text-gray-500">${data.description}</div>
                </td>
                <td class="p-3"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${data.category}</span></td>
                <td class="p-3 text-right font-bold text-gray-800">Rs. ${data.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="p-3 text-center">${receiptBtn}</td>
            </tr>
        `;
    });
    totalExpensesLbl.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
});


// ==========================================
// INVENTORY & ITEM STATUS
// ==========================================
const itemForm = document.getElementById('itemForm');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const totalItemsLbl = document.getElementById('total-items-lbl');

async function generateItemID(prefix) {
    const qCount = query(collection(db, "inventory"), where("prefix", "==", prefix));
    const querySnapshot = await getDocs(qCount);
    // Simple logic for auto-increment. Note: In a highly concurrent app, a transaction is better.
    const count = querySnapshot.size + 1; 
    return `${prefix}-${count.toString().padStart(3, '0')}`;
}

itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prefix = itemTypeSelect.value;
    const cat = globalCategories.find(c => c.prefix === prefix);
    
    if(!cat) return alert("Please select a valid category");

    const newItemID = await generateItemID(prefix);
    const itemData = {
        itemID: newItemID,
        prefix: prefix,
        name: cat.name,
        purchasedDate: document.getElementById('itemDate').value,
        location: document.getElementById('itemLocation').value,
        status: 'Active', // Default status: Active, Repair, Removed
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "inventory"), itemData);
        itemForm.reset();
        document.getElementById('itemDate').valueAsDate = new Date();
    } catch (error) {
        alert('Error adding item.');
    }
});

onSnapshot(query(collection(db, "inventory"), orderBy("createdAt", "desc")), (snapshot) => {
    inventoryTableBody.innerHTML = '';
    let activeItemsCount = 0;

    snapshot.forEach((docRef) => {
        const data = docRef.data();
        if(data.status !== 'Removed') activeItemsCount++;
        
        // Status Badge Logic
        let statusBadge = '';
        if(data.status === 'Active') statusBadge = `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded"><i class="fas fa-check-circle mr-1"></i>Active</span>`;
        else if(data.status === 'Repair') statusBadge = `<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded"><i class="fas fa-wrench mr-1"></i>In Repair</span>`;
        else if(data.status === 'Removed') statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded"><i class="fas fa-trash mr-1"></i>Removed</span>`;

        inventoryTableBody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-3 font-bold text-gray-800">${data.itemID}</td>
                <td class="p-3">${data.name}</td>
                <td class="p-3 text-gray-600">
                    ${data.status === 'Removed' ? '-' : data.location}
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="updateLocation('${docRef.id}', '${data.location}')" title="Move Site" class="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-2 rounded transition ${data.status === 'Removed' ? 'hidden':''}">
                        <i class="fas fa-truck"></i>
                    </button>
                    <select onchange="changeItemStatus('${docRef.id}', this.value)" class="text-xs border p-1 rounded bg-white cursor-pointer">
                        <option value="" disabled selected>Status...</option>
                        <option value="Active">Active</option>
                        <option value="Repair">Send to Repair</option>
                        <option value="Removed">Remove/Discard</option>
                    </select>
                </td>
            </tr>
        `;
    });
    totalItemsLbl.innerText = activeItemsCount;
});

// Update Location
window.updateLocation = async function(docId, currentLocation) {
    const newLocation = prompt("Move tool to new Site/Location:", currentLocation);
    if (newLocation && newLocation.trim() !== "" && newLocation !== currentLocation) {
        await updateDoc(doc(db, "inventory", docId), { location: newLocation, updatedAt: serverTimestamp() });
    }
};

// Update Status (Active -> Repair -> Removed)
window.changeItemStatus = async function(docId, newStatus) {
    if(newStatus && confirm(`Change item status to ${newStatus}?`)) {
        await updateDoc(doc(db, "inventory", docId), { status: newStatus, updatedAt: serverTimestamp() });
    }
};
