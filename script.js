const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'nongdam_kenshistyle_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

// 농담곰 전용 다중 필터 상태
let activeFilters = {
    country: 'all',
    character: 'all',
    group: 'all'
};

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
        renderNavMenu(); // 요네즈 켄시처럼 필터를 nav-group으로 생성
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
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-val="all"]').forEach(b => b.classList.add('active'));

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

// 요네즈 켄시 메뉴 구조(nav-group)로 농담곰 필터 생성
function renderNavMenu() {
    navMenuContainer.innerHTML = '';
    sidebarContent.innerHTML = '';

    // 1. HOME 기능 메뉴
    const createHomeGroup = () => {
        const homeGroup = document.createElement('div');
        homeGroup.className = 'nav-group';
        
        const homeBtn = document.createElement('button');
        homeBtn.className = 'nav-header'; 
        homeBtn.innerText = 'HOME';
        homeBtn.onclick = goHome;
        homeGroup.appendChild(homeBtn);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'nav-item nav-action'; 
        saveBtn.innerText = '이미지 저장';
        saveBtn.onclick = () => {
            generateImage();
            closeSidebar(); 
        };
        homeGroup.appendChild(saveBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'nav-item nav-action';
        resetBtn.innerText = '기록 초기화';
        resetBtn.onclick = () => {
            resetRecords();
            closeSidebar();
        };
        homeGroup.appendChild(resetBtn);
        return homeGroup;
    };

    navMenuContainer.appendChild(createHomeGroup());
    sidebarContent.appendChild(createHomeGroup());

    // 2. 농담곰 필터 메뉴들
    const filtersConfig = [
        { title: '국가', key: 'country', items: [{label: 'ALL', val: 'all'}, {label: '한국', val: 'korea'}, {label: '일본', val: 'japan'}, {label: '중국', val: 'china'}, {label: '대만', val: 'taiwan'}] },
        { title: '캐릭터', key: 'character', items: [{label: 'ALL', val: 'all'}, {label: '농담곰', val: 'kuma'}, {label: '두더지고로케', val: 'mogukoro'}, {label: '퍼그 상', val: 'pug'}, {label: '기타', val: 'ngn'}] },
        { title: '종류', key: 'group', items: [{label: 'ALL', val: 'all'}, {label: '마스코트', val: '마스코트'}, {label: '쿠션', val: '쿠션'}, {label: '인형', val: '인형'}, {label: '잡화', val: '잡화'}] }
    ];

    filtersConfig.forEach(config => {
        const pcGroup = createFilterGroup(config, false);
        navMenuContainer.appendChild(pcGroup);
        const mobileGroup = createFilterGroup(config, true);
        sidebarContent.appendChild(mobileGroup);
    });
}

function createFilterGroup(config, isMobile) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'nav-group';

    const header = document.createElement('div');
    header.className = 'nav-header';
    header.innerText = config.title;
    groupDiv.appendChild(header);

    config.items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.innerText = item.label;
        btn.dataset.type = config.key;
        btn.dataset.val = item.val;
        
        if(item.val === 'all') btn.classList.add('active'); // 기본값

        btn.onclick = (e) => {
            // 같은 그룹 내의 active 해제
            const parent = e.target.closest('.nav-group');
            parent.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 양쪽(PC, 모바일) 동기화
            document.querySelectorAll(`.nav-item[data-type="${config.key}"][data-val="${item.val}"]`)
                    .forEach(b => b.classList.add('active'));

            activeFilters[config.key] = item.val;
            applyMultiFilters();
            window.scrollTo(0, 0); 
            if(isMobile) closeSidebar();
            closePreview();
        };
        groupDiv.appendChild(btn);
    });
    return groupDiv;
}

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
        // 기존 농담곰 그룹핑 로직: 캐릭터가 ngn일 때 subGroup이 있으면 그걸로 분류
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

            card.innerHTML = `
                <div class="item-img-wrapper">
                    <img src="${imgSrc}" loading="lazy" alt="${item.nameKo}">
                    <div class="check-overlay"></div>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.nameKo}</div>
                    <div class="item-subname">${item.nameJp || ''}</div>
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

function resetRecords() {
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

// 요네즈 켄시의 캔버스 로직 100% 동일
async function generateImage() {
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