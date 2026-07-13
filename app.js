/*
 * Niwasa Constructions ERP - App Logic
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtpKSpZi-0IOB_yBdPRt_CKQ_0-7McBss",
    authDomain: "niwasa-cost-analitics.firebaseapp.com",
    projectId: "niwasa-cost-analitics",
    storageBucket: "niwasa-cost-analitics.firebasestorage.app",
    messagingSenderId: "708635197914",
    appId: "1:708635197914:web:36e6e47ccad0707451c0e3",
    measurementId: "G-ZCP5XM0086"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Global state
let itemTypes = [
    { id: 'type_1', name: 'Grinder', prefix: 'GRN' },
    { id: 'type_2', name: 'Drill Machine', prefix: 'DRL' },
    { id: 'type_3', name: 'Wheelbarrow', prefix: 'WLB' }
];

// ==========================================
// SITES MANAGEMENT (New Feature)
// ==========================================
const siteForm = document.getElementById('siteForm');
const sitesTableBody = document.getElementById('sitesTableBody');
const activeSitesLbl = document.getElementById('active-sites-lbl');
const expSiteSelect = document.getElementById('expSite');

// Add Site
siteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const siteData = {
        name: document.getElementById('siteName').value,
        location: document.getElementById('siteLocation').value,
        startDate: document.getElementById('siteStartDate').value,
        status: 'Active', // Default status
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "sites"), siteData);
        siteForm.reset();
        document.getElementById('siteStartDate').valueAsDate = new Date();
        alert('Site Added Successfully!');
    } catch (error) {
        console.error("Error adding site: ", error);
        alert('Error adding site.');
    }
});

// Listen to Sites real-time
const qSites = query(collection(db, "sites"), orderBy("createdAt", "desc"));
onSnapshot(qSites, (snapshot) => {
    sitesTableBody.innerHTML = '';
    
    // Clear and reset the Expense form site dropdown
    expSiteSelect.innerHTML = '<option value="" disabled selected>Select Site</option>';
    
    let activeCount = 0;
    
    snapshot.forEach((docRef) => {
        const data = docRef.data();
        const docId = docRef.id;
        
        if (data.status === 'Active') {
            activeCount++;
            // Add to expenses dropdown if active
            expSiteSelect.innerHTML += `<option value="${data.name}">${data.name} (${data.location})</option>`;
        }
        
        const statusBadge = data.status === 'Active' 
            ? `<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Active</span>`
            : `<span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Completed</span>`;

        const actionBtn = data.status === 'Active'
            ? `<button onclick="markSiteCompleted('${docId}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-1 px-3 rounded transition">Mark Completed</button>`
            : `<span class="text-xs text-gray-400">Done</span>`;
        
        const row = `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 font-medium text-gray-900">${data.name}</td>
                <td class="p-3 text-gray-600">${data.location}</td>
                <td class="p-3">${data.startDate}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-center">${actionBtn}</td>
            </tr>
        `;
        sitesTableBody.insertAdjacentHTML('beforeend', row);
    });
    
    // Update Dashboard active sites count
    activeSitesLbl.innerText = activeCount;
});

// Function to mark site as completed (Attached to window so HTML can call it)
window.markSiteCompleted = async function(docId) {
    if(confirm("Are you sure you want to mark this site as Completed?")) {
        try {
            const siteRef = doc(db, "sites", docId);
            await updateDoc(siteRef, { status: "Completed" });
        } catch (error) {
            console.error("Error updating site status:", error);
            alert("Failed to update status.");
        }
    }
};


// ==========================================
// EXPENSES MANAGEMENT
// ==========================================
const expenseForm = document.getElementById('expenseForm');
const expensesTableBody = document.getElementById('expensesTableBody');
const totalExpensesLbl = document.getElementById('total-expenses-lbl');

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let category = document.getElementById('expCategory').value;
    if (category === 'Other') {
        category = document.getElementById('expCustomCategory').value;
    }
    const expenseData = {
        siteName: document.getElementById('expSite').value,
        date: document.getElementById('expDate').value,
        category: category,
        amount: parseFloat(document.getElementById('expAmount').value),
        description: document.getElementById('expDesc').value,
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, "expenses"), expenseData);
        expenseForm.reset();
        document.getElementById('expDate').valueAsDate = new Date();
        document.getElementById('customCategoryDiv').style.display = 'none';
        alert('Expense Added Successfully!');
    } catch (error) {
        console.error("Error adding expense: ", error);
        alert('Error adding expense. Check console.');
    }
});

const qExpenses = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
onSnapshot(qExpenses, (snapshot) => {
    expensesTableBody.innerHTML = '';
    let total = 0;
    snapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount || 0;
        const row = `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3">${data.date}</td>
                <td class="p-3 font-medium text-gray-900">${data.siteName}</td>
                <td class="p-3"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${data.category}</span></td>
                <td class="p-3">${data.description}</td>
                <td class="p-3 text-right font-semibold">Rs. ${data.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
        expensesTableBody.insertAdjacentHTML('beforeend', row);
    });
    totalExpensesLbl.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
});


// ==========================================
// INVENTORY MANAGEMENT
// ==========================================
const itemForm = document.getElementById('itemForm');
const itemTypeSelect = document.getElementById('itemTypeSelect');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const totalItemsLbl = document.getElementById('total-items-lbl');

function populateItemTypes() {
    itemTypeSelect.innerHTML = '<option value="" disabled selected>Select Item Type</option>';
    itemTypes.forEach(type => {
        itemTypeSelect.innerHTML += `<option value="${type.prefix}">${type.name} (${type.prefix})</option>`;
    });
    itemTypeSelect.innerHTML += '<option value="NEW_TYPE" class="font-bold text-blue-600">+ Add New Type</option>';
}
populateItemTypes();

async function generateItemID(prefix) {
    const qCount = query(collection(db, "inventory"), where("prefix", "==", prefix));
    const querySnapshot = await getDocs(qCount);
    const count = querySnapshot.size + 1; 
    const paddedNumber = count.toString().padStart(3, '0');
    return `${prefix}-${paddedNumber}`;
}

itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let typePrefix = itemTypeSelect.value;
    let typeName = "";
    
    if (typePrefix === 'NEW_TYPE') {
        typeName = document.getElementById('newItemName').value;
        typePrefix = document.getElementById('newItemPrefix').value.toUpperCase();
        itemTypes.push({ id: 'temp_id', name: typeName, prefix: typePrefix });
        populateItemTypes(); 
    } else {
        const selectedType = itemTypes.find(t => t.prefix === typePrefix);
        if(selectedType) typeName = selectedType.name;
    }

    const newItemID = await generateItemID(typePrefix);
    const itemData = {
        itemID: newItemID,
        prefix: typePrefix,
        name: typeName,
        purchasedDate: document.getElementById('itemDate').value,
        location: document.getElementById('itemLocation').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "inventory"), itemData);
        itemForm.reset();
        document.getElementById('itemDate').valueAsDate = new Date();
        document.getElementById('newTypeDiv').style.display = 'none';
        itemTypeSelect.value = "";
        alert(`Item Added! ID: ${newItemID}`);
    } catch (error) {
        console.error("Error adding item: ", error);
        alert('Error adding item. Check console.');
    }
});

const qInventory = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
onSnapshot(qInventory, (snapshot) => {
    inventoryTableBody.innerHTML = '';
    totalItemsLbl.innerText = snapshot.size;
    snapshot.forEach((docRef) => {
        const data = docRef.data();
        const row = `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 font-bold text-gray-800">${data.itemID}</td>
                <td class="p-3">${data.name}</td>
                <td class="p-3">
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt text-red-500 mr-2"></i>
                        <span id="loc-${docRef.id}">${data.location}</span>
                    </div>
                </td>
                <td class="p-3">${data.purchasedDate}</td>
                <td class="p-3">
                    <button onclick="updateLocation('${docRef.id}', '${data.location}')" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded transition">
                        Update Location
                    </button>
                </td>
            </tr>
        `;
        inventoryTableBody.insertAdjacentHTML('beforeend', row);
    });
});

window.updateLocation = async function(docId, currentLocation) {
    const newLocation = prompt("Enter new location/site for this item:", currentLocation);
    if (newLocation && newLocation.trim() !== "" && newLocation !== currentLocation) {
        const itemRef = doc(db, "inventory", docId);
        try {
            await updateDoc(itemRef, {
                location: newLocation,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating location:", error);
            alert("Failed to update location.");
        }
    }
};
