const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'nongdam_kenshistyle_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

let activeFilters = { country: 'all', character: 'all', group: 'all' };

const listContainer = document.getElementById('listContainer');
const navMenuContainer = document.getElementById('navMenuContainer');
const sidebarContent = document.getElementById('sidebarContent');
const previewContainer = document.getElementById('previewContainer');

const optTitleCheck = document.getElementById('optTitleCheck');
const optTitleInput = document.getElementById('optTitleInput');
const optNameKoCheck = document.getElementById('optNameKoCheck');
const optNameJpCheck = document.getElementById('optNameJpCheck');
const optPriceCheck = document.getElementById('optPriceCheck');

async function init() {
    setupEventListeners();
    await fetchData();
    if(productData.length > 0) {
        renderNavMenu(); 
        renderAllList(); 
        updateProgress();
    }
}

function setupEventListeners() {
    optTitleInput.addEventListener('input', () => {
        if(optTitleInput.value.trim().length > 0) optTitleCheck.checked = true;
        updateCollectionPreview();
    });
    optTitleCheck.addEventListener('change', updateCollectionPreview);
    optNameKoCheck.addEventListener('change', () => {
        if(optNameKoCheck.checked) optNameJpCheck.checked = false;
        updateCollectionPreview();
    });
    optNameJpCheck.addEventListener('change', () => {
        if(optNameJpCheck.checked) optNameKoCheck.checked = false;
        updateCollectionPreview();
    });
    optPriceCheck.addEventListener('change', updateCollectionPreview);
}

async function updateCollectionPreview() {
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) return;
    const collectionUrl = await drawCollectionCanvas(checkedItems);
    document.getElementById('imgCollection').src = collectionUrl;
}

async function fetchData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("네트워크 오류");
        const text = await response.text();
        productData = parseCSV(text);
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<div class="status-msg">데이터를 불러오지 못했습니다.</div>';
    }
}

function parseCSV(csvText) {
    const rows = csvText.split('\n').map(row => {
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        let columns = []; let match;
        while (match = regex.exec(row)) {
            let col = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
            columns.push(col.trim());
        }
        return columns;
    });

    const headers = rows[0]; 
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue;
        const item = {};
        headers.forEach((h, idx) => item[h] = row[idx]);
        if(item.id) data.push(item);
    }
    return data;
}

function goHome() {
    activeFilters = { country: 'all', character: 'all', group: 'all' };
    
    // 버튼 초기화 (모든 active 클래스 제거)
    document.querySelectorAll('[onclick*="setFilter"]').forEach(b => b.classList.remove('active'));

    closeSidebar();
    closePreview();
    renderAllList();
    scrollToTop();
}

function closePreview() {
    listContainer.style.display = 'block';
    previewContainer.style.display = 'none';
    document.getElementById('imgCollection').src = "";
}

function renderNavMenu() {
    // ALL 버튼 삭제 완료
    const filterHtml = `
        <div class="filter-row">
            <span class="filter-label">국가</span>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_kr.png');" onclick="setFilter('country', 'korea', this)"><div class="overlay">한국</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_jp.png');" onclick="setFilter('country', 'japan', this)"><div class="overlay">일본</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_cn.png');" onclick="setFilter('country', 'china', this)"><div class="overlay">중국</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_tw.png');" onclick="setFilter('country', 'taiwan', this)"><div class="overlay">대만</div></div>
        </div>

        <div class="filter-row">
            <span class="filter-label">캐릭터</span>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_kuma.png');" onclick="setFilter('character', 'kuma', this)"><div class="overlay">농담곰</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_mogukoro.png');" onclick="setFilter('character', 'mogukoro', this)"><div class="overlay">두더지<br>고로케</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_pug.png');" onclick="setFilter('character', 'pug', this)"><div class="overlay">퍼그 상</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_ngn.png');" onclick="setFilter('character', 'ngn', this)"><div class="overlay">기타</div></div>
        </div>

        <div class="filter-row">
            <span class="filter-label">종류</span>
            <button class="text-btn" onclick="setFilter('group', '마스코트', this)">마스코트</button>
            <button class="text-btn" onclick="setFilter('group', '쿠션', this)">쿠션</button>
            <button class="text-btn" onclick="setFilter('group', '인형', this)">인형</button>
            <button class="text-btn" onclick="setFilter('group', '잡화', this)">잡화</button>
        </div>

        <div class="filter-action-row">
            <button class="filter-action-btn" onclick="generateImage(); closeSidebar();">이미지 저장</button>
            <button class="filter-action-btn reset" onclick="resetRecords(); closeSidebar();">기록 초기화</button>
        </div>
    `;

    navMenuContainer.innerHTML = filterHtml;
    sidebarContent.innerHTML = filterHtml;
}

window.setFilter = function(type, value, btnElem) {
    // 토글(Toggle) 로직 적용 완료
    if (activeFilters[type] === value) {
        activeFilters[type] = 'all'; // 선택 해제
        document.querySelectorAll(`[onclick*="'${type}', '${value}'"]`).forEach(el => el.classList.remove('active'));
    } else {
        activeFilters[type] = value; // 새로 선택
        document.querySelectorAll(`[onclick*="'${type}'"]`).forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`[onclick*="'${type}', '${value}'"]`).forEach(el => el.classList.add('active'));
    }

    applyMultiFilters();
    window.scrollTo(0, 0); 
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    hamburger.classList.toggle('open'); 
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    document.querySelector('.hamburger-menu').classList.remove('open');
    document.body.style.overflow = ''; 
}

function applyMultiFilters() {
    currentDisplayData = productData.filter(item => {
        if (activeFilters.country !== 'all' && item.country !== activeFilters.country) return false;
        if (activeFilters.character !== 'all' && item.character !== activeFilters.character) return false;
        if (activeFilters.group !== 'all' && item.group !== activeFilters.group) return false;
        return true;
    });
    renderList(currentDisplayData);
}

function renderList(items) {
    listContainer.innerHTML = '';
    if (items.length === 0) {
        listContainer.innerHTML = '<div class="status-msg">해당하는 상품이 없습니다.</div>';
        return;
    }

    const grouped = new Map();
    items.forEach(item => {
        let key = item.group;
        if (activeFilters.character === 'ngn' && item.subGroup) {
            key = item.subGroup;
        }
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
    });

    for (const [title, groupItems] of grouped) {
        const section = document.createElement('div');
        section.className = 'category-section';
        const ownedCount = groupItems.filter(i => ownedItems.has(i.id)).length;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'category-title';
        titleDiv.innerHTML = `${title} <small style="color:#888; font-weight:normal;">(${ownedCount}/${groupItems.length})</small>`;
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';

        groupItems.forEach(item => {
            const isOwned = ownedItems.has(item.id);
            const card = document.createElement('div');
            card.className = `item-card ${isOwned ? 'checked' : ''}`;
            card.onclick = () => toggleCheck(item.id);

            const imgSrc = item.image || 'https://via.placeholder.com/150?text=No+Image';

            // 리스트 화면 일본어 삭제 완료
            card.innerHTML = `
                <div class="item-img-wrapper">
                    <img src="${imgSrc}" loading="lazy" alt="${item.nameKo}">
                    <div class="check-overlay"></div>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.nameKo}</div>
                    <div class="item-price">${item.price || '-'}</div>
                </div>
            `;
            grid.appendChild(card);
        });
        section.appendChild(titleDiv);
        section.appendChild(grid);
        listContainer.appendChild(section);
    }
}

function renderAllList() {
    currentDisplayData = productData;
    renderList(productData);
}

function toggleCheck(id) {
    if (ownedItems.has(id)) {
        ownedItems.delete(id);
    } else {
        ownedItems.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedItems]));
    renderList(currentDisplayData);
    updateProgress(); 
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.resetRecords = function() {
    if (confirm("모든 체크 기록을 삭제하시겠습니까?")) {
        ownedItems.clear();
        localStorage.removeItem(STORAGE_KEY);
        renderList(currentDisplayData);
        updateProgress();
        alert("초기화되었습니다.");
    }
}

function updateProgress() {
    const totalCount = productData.length;
    if (totalCount === 0) return;
    
    const validOwnedCount = productData.filter(item => ownedItems.has(item.id)).length;
    const percent = Math.round((validOwnedCount / totalCount) * 100);
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if(progressBar) progressBar.style.width = `${percent}%`;
    if(progressText) progressText.innerText = `${validOwnedCount}/${totalCount} (${percent}%)`;
}

window.generateImage = async function() {
    await document.fonts.ready;
    
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }
    updateCollectionPreview();
    
    listContainer.style.display = 'none';
    previewContainer.style.display = 'flex';
    scrollToTop();
}

async function drawCollectionCanvas(items) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const showTitle = optTitleCheck.checked;
    const titleText = optTitleInput.value;
    const showNameKo = optNameKoCheck.checked;
    const showNameJp = optNameJpCheck.checked;
    const showPrice = optPriceCheck.checked;
    const showText = showNameKo || showNameJp;

    const cardWidth = 200;
    const imgHeight = 200;
    
    let textHeight = 0;
    const nameLineHeight = 20;
    const priceLineHeight = 20;
    const paddingY = 10;

    if (showText) textHeight += (nameLineHeight * 2); 
    if (showPrice) textHeight += priceLineHeight;
    if (showText || showPrice) textHeight += (paddingY * 2);

    const cardHeight = imgHeight + textHeight;
    const gap = 20; 
    const colCount = 5;
    const padding = 40; 
    const titleAreaHeight = showTitle ? 80 : 0;

    const rowCount = Math.ceil(items.length / colCount);
    const contentWidth = (cardWidth * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardHeight * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight + titleAreaHeight;

    ctx.fillStyle = "#fafafa"; 
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    let startY = padding;
    if (showTitle) {
        ctx.font = "bold 40px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#182558";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(titleText, cvs.width / 2, padding + 20);
        startY += titleAreaHeight;
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.src = src; img.onload = () => resolve(img); img.onerror = () => resolve(null);
    });

    const getLines = (text, maxWidth) => {
        const words = text.split('');
        const lines = []; let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + word).width;
            if (width < maxWidth) { currentLine += word; } 
            else { lines.push(currentLine); currentLine = word; }
        }
        lines.push(currentLine); return lines;
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % colCount; const r = Math.floor(i / colCount);
        const x = padding + c * (cardWidth + gap);
        const y = startY + r * (cardHeight + gap);
        const borderRadius = 15; 

        ctx.save(); 
        ctx.shadowColor = "rgba(0, 0, 0, 0.1)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = "#ffffff"; 
        ctx.beginPath(); ctx.roundRect(x, y, cardWidth, cardHeight, borderRadius); ctx.fill(); ctx.restore();

        const img = await loadImage(item.image);
        if (img) {
            ctx.save(); ctx.beginPath();
            if (showText || showPrice) ctx.roundRect(x, y, cardWidth, imgHeight, [borderRadius, borderRadius, 0, 0]);
            else ctx.roundRect(x, y, cardWidth, imgHeight, borderRadius);
            ctx.clip();
            const aspect = img.width / img.height; let dw = cardWidth, dh = imgHeight;
            if (aspect > 1) dw = imgHeight * aspect; else dh = cardWidth / aspect;
            ctx.drawImage(img, x + (cardWidth - dw)/2, y + (imgHeight - dh)/2, dw, dh);
            ctx.restore(); 
        }

        if (showText || showPrice) {
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#333";
            let lines = [];
            if (showText) {
                ctx.font = "bold 15px 'Pretendard', sans-serif";
                let textToDraw = showNameJp ? (item.nameJp && item.nameJp.trim() !== '' ? item.nameJp : item.nameKo) : item.nameKo;
                let tempLines = getLines(textToDraw, cardWidth - 20);
                if (tempLines.length > 2) { tempLines = tempLines.slice(0, 2); tempLines[1] = tempLines[1].slice(0, -1) + "..."; }
                lines = tempLines;
            }

            let contentHeight = 0;
            if (showText) contentHeight += lines.length * nameLineHeight;
            if (showPrice) contentHeight += priceLineHeight;
            if (showText && showPrice) contentHeight += 5; 

            const textAreaCenterY = y + imgHeight + (textHeight / 2);
            let drawY = textAreaCenterY - (contentHeight / 2) + (nameLineHeight / 2); 

            if (showText) {
                ctx.font = "bold 15px 'Pretendard', sans-serif";
                lines.forEach(line => { ctx.fillText(line, x + (cardWidth/2), drawY); drawY += nameLineHeight; });
            }

            if (showPrice) {
                if (showText) drawY += 5; 
                if (!showText) drawY = textAreaCenterY - (priceLineHeight / 2) + (priceLineHeight / 2); 
                ctx.font = "14px 'Pretendard', sans-serif"; ctx.fillStyle = "#182558"; 
                ctx.fillText(item.price || '-', x + (cardWidth/2), drawY);
            }
        }
    }
    return cvs.toDataURL('image/jpeg', 0.9);
}

function downloadImage() {
    const img = document.getElementById('imgCollection');
    if(!img || !img.src) return;
    const link = document.createElement('a');
    link.download = 'nongdam_collection_list.jpg';
    link.href = img.src;
    link.click();
}

init();