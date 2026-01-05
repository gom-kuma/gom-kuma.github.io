/**
 * ==============================================================================
 * Global Configuration & Data Management
 * ==============================================================================
 */
// Google Spreadsheet configuration
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';
const SHEET_TITLE = '시트1'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TITLE}`;

// Company information structure for filtering and display
const companyInfo = {
    groups: {
        old: ["b-flat", "Anova", "Furyu"],
        new: ["Daewon", "Spiralcute", "Parade", "Furyu_new"]
    },
    names: {
        "b-flat": "비플랏",
        "Anova": "지그노/에이노바",
        "Furyu": "후류",
        "Daewon": "대원미디어",
        "Spiralcute": "스파이럴큐트",
        "Parade": "퍼레이드",
        "Furyu_new": "후류"
    }
};

// Application state variables
let productData = [];
let currentTab = 'owned'; 
let filters = { country: 'all', character: 'all', companyGroup: 'all', companySpecific: null };

// Load saved checked items from localStorage
let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

// DOM element references
const listContainer = document.getElementById('listContainer');

/**
 * ==============================================================================
 * Initialization Logic
 * ==============================================================================
 */
// Initialize application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    if (listContainer) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">Loading Data... 🐻</div>';
    }

    // Attach event listeners to tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Fetch data and render initial view
    await fetchSheetData();
    renderCompanySubFilters();
    renderList();
    updateTabUI();
});

// Fetch and parse data from Google Spreadsheet CSV
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.text();
        const rows = data.split(/\r?\n/);
        
        if (rows.length < 2) throw new Error('Empty data returned from sheet');

        const headers = parseCsvRow(rows[0]);
        
        // Parse CSV rows into objects
        productData = rows.slice(1)
            .filter(row => row.trim() !== "")
            .map(row => {
                const values = parseCsvRow(row);
                let obj = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i] || "";
                });
                return obj;
            });

        console.log(`[System] Successfully loaded ${productData.length} items.`);

    } catch (err) {
        console.error("[System] Data Fetch Error:", err);
        if (listContainer) {
            listContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#ff7675;">
                Failed to load data.<br>
                Error: ${err.message}<br>
                Please check the Google Sheet publishing settings.
            </div>`;
        }
    }
}

// Helper function to parse CSV row correctly handling quotes
function parseCsvRow(row) {
    const result = [];
    let startValueIndex = 0;
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        if (row[i] === '"') inQuotes = !inQuotes;
        else if (row[i] === ',' && !inQuotes) {
            result.push(row.substring(startValueIndex, i).replace(/^"|"$/g, '').trim());
            startValueIndex = i + 1;
        }
    }
    result.push(row.substring(startValueIndex).replace(/^"|"$/g, '').trim());
    return result;
}

/**
 * ==============================================================================
 * Rendering & Filtering Logic
 * ==============================================================================
 */
// Switch between 'owned' and 'wish' tabs
function switchTab(tab) {
    currentTab = tab;
    if (tab === 'wish') document.body.classList.add('theme-wish');
    else document.body.classList.remove('theme-wish');
    updateTabUI();
    renderList();
}

// Update tab button UI states
function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

// Render the list of items based on current tab and filters
function renderList() {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    // Apply filters to productData
    const filteredData = productData.filter(item => {
        if (filters.country !== 'all' && item.country !== filters.country) return false;
        if (filters.character !== 'all' && item.character !== filters.character) return false;
        if (filters.companyGroup === 'old') {
            if (filters.companySpecific) { if (item.company !== filters.companySpecific) return false; }
            else { if (!companyInfo.groups.old.includes(item.company)) return false; }
        } else if (filters.companyGroup === 'new') {
            if (filters.companySpecific) { if (item.company !== filters.companySpecific) return false; }
            else { if (!companyInfo.groups.new.includes(item.company)) return false; }
        }
        return true;
    });

    // Handle no results case
    if (filteredData.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">No items match your filter. 😢</div>';
        return;
    }

    // Group items by character subGroup or main group
    const grouped = {};
    filteredData.forEach(item => {
        let groupKey;
        if (filters.character === 'ngn' && item.subGroup) groupKey = item.subGroup;
        else groupKey = item.group || "Others";

        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
    });

    // Render groups and item cards
    Object.keys(grouped).forEach(groupName => {
        const title = document.createElement('h3');
        title.className = 'group-title';
        title.innerText = groupName;
        listContainer.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        grouped[groupName].forEach(item => {
            const isChecked = checkedItems[currentTab].has(item.id);
            const card = document.createElement('div');
            card.className = `item-card ${isChecked ? 'checked' : ''}`;
            card.onclick = () => toggleCheck(item.id, card);
            card.innerHTML = `
                <div class="item-img-wrapper">
                    <img src="${item.image}" alt="${item.nameKo}" loading="lazy">
                    <div class="check-overlay"></div>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.nameKo}</div>
                    <div class="item-price">${item.price}</div>
                </div>
            `;
            grid.appendChild(card);
        });
        listContainer.appendChild(grid);
    });
}

// Toggle checked state of an item
function toggleCheck(id, cardElement) {
    if (checkedItems[currentTab].has(id)) { 
        checkedItems[currentTab].delete(id); 
        cardElement.classList.remove('checked'); 
    } else { 
        checkedItems[currentTab].add(id); 
        cardElement.classList.add('checked'); 
    }
    saveData();
}

// Save checked items to localStorage
function saveData() { 
    localStorage.setItem(`nongdam_${currentTab}`, JSON.stringify([...checkedItems[currentTab]])); 
}

/**
 * ==============================================================================
 * Filter Actions (Exposed for HTML onclick events)
 * ==============================================================================
 */
// Set main filter type and value
window.setFilter = function(type, value) {
    filters[type] = value;
    const parentWrapper = event.currentTarget.closest('.filter-item-wrapper');
    if (parentWrapper) {
        parentWrapper.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    }
    event.currentTarget.classList.add('active');
    renderList();
};

// Set company group filter ('old' or 'new')
window.setCompanyFilter = function(group) {
    filters.companyGroup = group; 
    filters.companySpecific = null;
    
    const companyWrapper = document.querySelector('[data-type="company"]').closest('.filter-item-wrapper');
    companyWrapper.querySelectorAll('.text-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === group));
    
    const oldSub = document.getElementById('old-subs');
    const newSub = document.getElementById('new-subs');
    if(oldSub) oldSub.classList.toggle('show', group === 'old');
    if(newSub) newSub.classList.toggle('show', group === 'new');
    
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    renderList();
};

// Set specific company filter
window.setCompanySpecific = function(companyName, btnElement) {
    if (filters.companySpecific === companyName) { 
        filters.companySpecific = null; 
        btnElement.classList.remove('active'); 
    } else { 
        filters.companySpecific = companyName; 
        btnElement.parentElement.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active')); 
        btnElement.classList.add('active'); 
    }
    renderList();
};

// Render sub-filter buttons for companies
window.renderCompanySubFilters = function() {
    const oldContainer = document.getElementById('old-subs');
    if(oldContainer) {
        oldContainer.innerHTML = '';
        companyInfo.groups.old.forEach(comp => { 
            const btn = document.createElement('button'); 
            btn.className = 'sub-btn'; 
            btn.innerText = companyInfo.names[comp] || comp; 
            btn.onclick = (e) => setCompanySpecific(comp, e.target); 
            oldContainer.appendChild(btn); 
        });
    }

    const newContainer = document.getElementById('new-subs');
    if(newContainer) {
        newContainer.innerHTML = '';
        companyInfo.groups.new.forEach(comp => { 
            const btn = document.createElement('button'); 
            btn.className = 'sub-btn'; 
            btn.innerText = companyInfo.names[comp] || comp; 
            btn.onclick = (e) => setCompanySpecific(comp, e.target); 
            newContainer.appendChild(btn); 
        });
    }
};

// Reset all filters to default state
window.resetFilters = function() {
    filters = { country: 'all', character: 'all', companyGroup: 'all', companySpecific: null };
    document.querySelectorAll('.flag-btn, .char-btn, .text-btn, .sub-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(btn => btn.classList.add('active'));
    
    const oldSub = document.getElementById('old-subs');
    const newSub = document.getElementById('new-subs');
    if(oldSub) oldSub.classList.remove('show');
    if(newSub) newSub.classList.remove('show');
    
    renderList();
};

// Reset checked records for the current tab
window.resetRecords = function() {
    const listName = currentTab === 'owned' ? 'Owned' : 'Wish';
    if (confirm(`Delete all records for [${listName} List]?`)) { 
        checkedItems[currentTab].clear(); 
        saveData(); 
        renderList(); 
        alert(`Reset complete.`); 
    }
};

/**
 * ==============================================================================
 * Image Generation Logic
 * ==============================================================================
 */
// Helper: Creates a rounded rectangle path in the canvas context
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Helper: Attempts to load a font with a timeout to prevent hanging
async function loadFontWithTimeout(name, url, timeout = 3000) {
    try {
        const font = new FontFace(name, `url(${url})`);
        const loadPromise = font.load().then(() => {
            document.fonts.add(font);
            return true;
        });
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.warn("[System] Font load timed out. Using fallback.");
                resolve(false);
            }, timeout);
        });
        return await Promise.race([loadPromise, timeoutPromise]);
    } catch (e) {
        console.warn("[System] Font loading failed:", e);
        return false;
    }
}

// Main function to generate and download the image
window.generateImage = async function() {
    const ids = [...checkedItems[currentTab]];
    if (ids.length === 0) return alert("No items selected!");
    
    const showNameEl = document.getElementById('showName');
    const showPriceEl = document.getElementById('showPrice');
    const btn = document.getElementById('genBtn');
    
    const showName = showNameEl ? showNameEl.checked : true;
    const showPrice = showPriceEl ? showPriceEl.checked : true;
    
    const originalText = btn.innerText;
    btn.innerText = "Loading Fonts...";
    btn.disabled = true;

    try {
        // Load 'Jua' font for title
        await loadFontWithTimeout('Jua', 'https://fonts.gstatic.com/s/jua/v14/co364W5X5_Y8yykk.woff2');
        btn.innerText = "Generating...";

        const items = ids.map(id => productData.find(p => p.id === id)).filter(p => p);
        const cvs = document.createElement('canvas');
        const ctx = cvs.getContext('2d');

        // Layout Configuration
        // Dynamic columns based on item count (max 4)
        const cols = Math.min(items.length, 4); 
        const rows = Math.ceil(items.length / cols);
        const cardW = 300, cardH = 420;
        const gap = 30, padding = 60;
        // Increased header height for better spacing
        const headerH = 220; 
        const cornerRadius = 40;

        // Calculate total canvas size
        cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
        cvs.height = headerH + padding * 2 + (cardH * rows) + (gap * (rows - 1));

        // *** Apply global rounded corners (clipping) FIRST ***
        roundedRect(ctx, 0, 0, cvs.width, cvs.height, cornerRadius);
        ctx.clip(); 

        // Fill background
        ctx.fillStyle = "#fdfbf7";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Draw Header Background (Fixed to 'owned' theme color as requested)
        ctx.fillStyle = "#aeb4d1"; 
        ctx.fillRect(0, 0, cvs.width, headerH);

        // Draw Title (Centered vertically and horizontally in header)
        ctx.font = "bold 70px 'Jua', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillStyle = "white"; // White text for better contrast on header
        const titleText = currentTab === 'owned' ? "내 농담곰 컬렉션" : "농담곰 위시리스트";
        // Y-coordinate is half of header height for vertical centering
        ctx.fillText(titleText, cvs.width / 2, headerH / 2);

        // Helper to load images asynchronously
        const loadImage = (src) => new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });

        // Draw item cards grid
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = padding + c * (cardW + gap);
            const y = headerH + padding + r * (cardH + gap);

            // Draw card background and shadow
            ctx.save();
            roundedRect(ctx, x, y, cardW, cardH, 20); 
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fill();
            
            // Draw card border
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "#eae8e4";
            ctx.lineWidth = 2;
            ctx.stroke();
            // Clip content inside the card
            ctx.clip(); 

            // Draw product image fitting within the card area
            const img = await loadImage(item.image);
            if (img) {
                const aspect = img.width / img.height;
                let dw = 260, dh = 260;
                if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
                ctx.drawImage(img, x + (cardW - dw)/2, y + 30 + (260 - dh)/2, dw, dh);
            }
            ctx.restore();

            // Draw text (Name and Price)
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            
            // Product Name with word wrapping
            if (showName) {
                ctx.fillStyle = "#2d3436";
                ctx.font = "bold 22px 'Gowun Dodum', sans-serif";
                const name = item.nameKo;
                const words = name.split(' ');
                let line = '', lineY = y + 320;
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > 260 && n > 0) {
                        ctx.fillText(line, x + cardW/2, lineY);
                        line = words[n] + ' '; lineY += 28;
                    } else { line = testLine; }
                }
                ctx.fillText(line, x + cardW/2, lineY);
            }

            // Product Price
            if (showPrice) {
                ctx.fillStyle = "#a4b0be";
                ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
                const priceY = showName ? y + 395 : y + 340; 
                ctx.fillText(item.price, x + cardW/2, priceY);
            }
        }

        // Trigger image download
        const link = document.createElement('a');
        link.download = `nongdam_${currentTab}_list.png`;
        link.href = cvs.toDataURL('image/png');
        link.click();

    } catch (err) {
        alert("Image Generation Error: " + err.message);
        console.error(err);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};
