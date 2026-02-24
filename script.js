// --- 설정 및 데이터 ---
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'nongdam_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

// 농담곰 필터 상태
let filters = { country: 'all', character: 'all', group: 'all' }; 

const listContainer = document.getElementById('listContainer');
const previewContainer = document.getElementById('previewContainer');
const navMenuContainer = document.getElementById('navMenuContainer');
const sidebarContent = document.getElementById('sidebarContent');

// 옵션 엘리먼트
const optTitleCheck = document.getElementById('optTitleCheck');
const optTitleInput = document.getElementById('optTitleInput');
const optNameKoCheck = document.getElementById('optNameKoCheck');
const optPriceCheck = document.getElementById('optPriceCheck');
const simpleModeCheck = document.getElementById('simpleModeCheck');

// --- 초기화 ---
async function init() {
    setupEventListeners();
    renderFilterUI(); // 필터 UI 생성
    await fetchData();
    if(productData.length > 0) {
        applyFiltersAndRender(); 
        updateProgress();
    }
}

function setupEventListeners() {
    optTitleInput.addEventListener('input', () => {
        if(optTitleInput.value.trim().length > 0) optTitleCheck.checked = true;
        updateCollectionPreview();
    });
    optTitleCheck.addEventListener('change', updateCollectionPreview);
    optNameKoCheck.addEventListener('change', updateCollectionPreview);
    optPriceCheck.addEventListener('change', updateCollectionPreview);
}

// --- 농담곰 필터 UI 생성 ---
function renderFilterUI() {
    const htmlString = `
        <div class="filter-group">
            <button class="text-btn active" onclick="setFilter('country', 'all', this)">ALL</button>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_kr.png');" onclick="setFilter('country', 'korea', this)"><div class="overlay">한국</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_jp.png');" onclick="setFilter('country', 'japan', this)"><div class="overlay">일본</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_cn.png');" onclick="setFilter('country', 'china', this)"><div class="overlay">중국</div></div>
            <div class="flag-btn" style="background-image: url('img/icon_flag/flag_tw.png');" onclick="setFilter('country', 'taiwan', this)"><div class="overlay">대만</div></div>
            
            <div class="filter-divider"></div>

            <button class="text-btn active" onclick="setFilter('character', 'all', this)">ALL</button>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_kuma.png');" onclick="setFilter('character', 'kuma', this)"><div class="overlay">농담곰</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_mogukoro.png');" onclick="setFilter('character', 'mogukoro', this)"><div class="overlay">두더지<br>고로케</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_pug.png');" onclick="setFilter('character', 'pug', this)"><div class="overlay">퍼그 상</div></div>
            <div class="char-btn" style="background-image: url('img/icon_characters/icon_ngn.png');" onclick="setFilter('character', 'ngn', this)"><div class="overlay">기타</div></div>
            
            <div class="filter-divider"></div>

            <button class="text-btn active" onclick="setFilter('group', 'all', this)">ALL</button>
            <button class="text-btn" onclick="setFilter('group', '마스코트', this)">마스코트</button>
            <button class="text-btn" onclick="setFilter('group', '쿠션', this)">쿠션</button>
            <button class="text-btn" onclick="setFilter('group', '인형', this)">인형</button>
            <button class="text-btn" onclick="setFilter('group', '잡화', this)">잡화</button>

            <div class="filter-divider"></div>
            <button class="text-btn" onclick="resetRecords()" style="border-color:#ff7675; color:#d63031;">초기화</button>
        </div>
    `;
    navMenuContainer.innerHTML = htmlString;
    sidebarContent.innerHTML = `<h2 class="sidebar-title">필터</h2>` + htmlString;
}

// 필터 적용 함수
window.setFilter = function(type, value, btnElem) {
    filters[type] = value;
    
    // 버튼 Active 상태 변경
    const parentGroup = btnElem.closest('.filter-group');
    // type이 일치하는 버튼들만 active 제거하기 로직 (간단히 siblings 중 특정 클래스만 처리)
    // 좀 더 정확히 하려면 type별 컨테이너를 나누는게 좋지만 기존 UI 유지를 위해 분기처리
    let targets = [];
    if(type === 'country') targets = parentGroup.querySelectorAll('.flag-btn, button[onclick*="country"]');
    if(type === 'character') targets = parentGroup.querySelectorAll('.char-btn, button[onclick*="character"]');
    if(type === 'group') targets = parentGroup.querySelectorAll('button[onclick*="group"]');
    
    targets.forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');

    applyFiltersAndRender();
};

function applyFiltersAndRender() {
    currentDisplayData = productData.filter(item => {
        if (filters.country !== 'all' && item.country !== filters.country) return false;
        if (filters.character !== 'all' && item.character !== filters.character) return false;
        if (filters.group !== 'all' && item.group !== filters.group) return false;
        return true;
    });
    renderList(currentDisplayData);
}

// --- 데이터 가져오기 ---
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
        let columns = [];
        let match;
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

// --- 화면 전환 및 네비게이션 ---
window.goHome = function() {
    filters = { country: 'all', character: 'all', group: 'all' };
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(el => el.classList.add('active'));
    
    closeSidebar();
    closePreview();
    applyFiltersAndRender();
    scrollToTop();
}

window.closePreview = function() {
    listContainer.style.display = 'block';
    previewContainer.style.display = 'none';
    document.getElementById('imgCollection').src = "";
    document.querySelector('.floating-progress').style.display = 'flex';
}

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    hamburger.classList.toggle('open'); 
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

window.closeSidebar = function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    document.querySelector('.hamburger-menu').classList.remove('open');
    document.body.style.overflow = ''; 
}

// --- 리스트 렌더링 ---
function renderList(items) {
    listContainer.innerHTML = '';
    if (items.length === 0) {
        listContainer.innerHTML = '<div class="status-msg">해당하는 농담곰이 없습니다 😢</div>';
        return;
    }

    const grouped = new Map();
    items.forEach(item => {
        // 기존 농담곰 로직: ngn 캐릭터이고 subGroup이 있으면 그걸로 그룹핑
        let key = item.group;
        if (filters.character === 'ngn' && item.subGroup) {
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
        titleDiv.innerHTML = `${title} <small style="color:#a4b0be; font-weight:normal;">(${ownedCount}/${groupItems.length})</small>`;
        
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

window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.resetRecords = function() {
    if (confirm("모든 체크 기록을 삭제하시겠습니까?")) {
        ownedItems.clear();
        localStorage.removeItem(STORAGE_KEY);
        renderList(currentDisplayData);
        updateProgress();
        alert("초기화되었습니다.");
        closeSidebar();
    }
}

function updateProgress() {
    const totalCount = productData.length;
    if (totalCount === 0) return;
    const validOwnedCount = productData.filter(item => ownedItems.has(item.id)).length;
    const percent = Math.round((validOwnedCount / totalCount) * 100);
    
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressText').innerText = `${validOwnedCount}/${totalCount} (${percent}%)`;
}

// --- 이미지 생성 렌더링 (미리보기 모달) ---
window.generateImage = async function() {
    await document.fonts.ready;
    
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }

    updateCollectionPreview();
    listContainer.style.display = 'none';
    document.querySelector('.floating-progress').style.display = 'none'; // 바 숨기기
    previewContainer.style.display = 'flex';
    scrollToTop();
}

window.updateCollectionPreview = async function() {
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) return;
    const collectionUrl = await drawCollectionCanvas(checkedItems);
    document.getElementById('imgCollection').src = collectionUrl;
}

async function drawCollectionCanvas(items) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const showTitle = optTitleCheck.checked;
    const titleText = optTitleInput.value;
    const showNameKo = optNameKoCheck.checked;
    const showPrice = optPriceCheck.checked;
    const isSimple = simpleModeCheck.checked; // 간소화 모드

    let cardWidth, imgHeight, cardHeight, gap, colCount;

    if (isSimple) {
        cardWidth = 160; imgHeight = 160; cardHeight = 160; gap = 15;
        // 간소화 모드에선 강제로 텍스트 제거
        optNameKoCheck.disabled = true; optPriceCheck.disabled = true;
    } else {
        cardWidth = 200; imgHeight = 200; gap = 20;
        optNameKoCheck.disabled = false; optPriceCheck.disabled = false;
        
        let textHeight = 0;
        if (showNameKo) textHeight += 40; 
        if (showPrice) textHeight += 20;
        if (showNameKo || showPrice) textHeight += 20;
        cardHeight = imgHeight + textHeight;
    }

    // 그리드 열 개수 동적 조절 (가로로 너무 길어지지 않게)
    colCount = Math.round(Math.sqrt(items.length));
    if (colCount < 3) colCount = 3;
    if (colCount > 8) colCount = 8;
    if (items.length < 3) colCount = items.length;

    const padding = 40; 
    const titleAreaHeight = showTitle ? 100 : 0;
    const rowCount = Math.ceil(items.length / colCount);
    
    const contentWidth = (cardWidth * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardHeight * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight + titleAreaHeight;

    ctx.fillStyle = "#fafafa"; 
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    let startY = padding;
    if (showTitle) {
        ctx.font = "bold 45px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#2d3436";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(titleText, cvs.width / 2, padding + 30);
        startY += titleAreaHeight;
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.src = src; img.onload = () => resolve(img); img.onerror = () => resolve(null);
    });

    const getLines = (text, maxWidth) => {
        const words = text.split(' ');
        const lines = []; let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            if (ctx.measureText(currentLine + " " + word).width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine); currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % colCount; const r = Math.floor(i / colCount);
        const x = padding + c * (cardWidth + gap);
        const y = startY + r * (cardHeight + gap);

        const img = await loadImage(item.image);

        if (isSimple) {
            const radius = cardWidth / 2;
            const cx = x + radius; const cy = y + radius;
            
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = "white"; ctx.shadowColor = "rgba(0,0,0,0.1)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
            ctx.fill(); ctx.restore();

            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
            if (img) {
                const aspect = img.width / img.height;
                let dw = cardWidth, dh = cardHeight;
                if (aspect > 1) dw = cardHeight * aspect; else dh = cardWidth / aspect;
                ctx.drawImage(img, x + (cardWidth - dw) / 2, y + (cardHeight - dh) / 2, dw, dh);
            }
            ctx.restore();

            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#2d3436"; ctx.lineWidth = 3; ctx.stroke();
            ctx.restore();

        } else {
            const borderRadius = 15; 
            ctx.save(); 
            ctx.shadowColor = "rgba(0, 0, 0, 0.1)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = "#ffffff"; 
            ctx.beginPath(); ctx.roundRect(x, y, cardWidth, cardHeight, borderRadius); ctx.fill(); ctx.restore();
            
            ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cardWidth, cardHeight, borderRadius);
            ctx.strokeStyle = "#2d3436"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

            if (img) {
                ctx.save(); ctx.beginPath();
                if (showNameKo || showPrice) ctx.roundRect(x, y, cardWidth, imgHeight, [borderRadius, borderRadius, 0, 0]);
                else ctx.roundRect(x, y, cardWidth, imgHeight, borderRadius);
                ctx.clip();
                const aspect = img.width / img.height; let dw = cardWidth, dh = imgHeight;
                if (aspect > 1) dw = imgHeight * aspect; else dh = cardWidth / aspect;
                ctx.drawImage(img, x + (cardWidth - dw)/2, y + (imgHeight - dh)/2, dw, dh);
                ctx.restore(); 
            }

            if (showNameKo || showPrice) {
                ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#2d3436";
                let drawY = y + imgHeight + 25; 
                if (showNameKo) {
                    ctx.font = "bold 15px 'Gowun Dodum', sans-serif";
                    const lines = getLines(item.nameKo, cardWidth - 20);
                    lines.slice(0, 2).forEach(line => {
                        ctx.fillText(line, x + (cardWidth/2), drawY); drawY += 20;
                    });
                }
                if (showPrice) {
                    ctx.font = "bold 14px 'Gowun Dodum', sans-serif"; ctx.fillStyle = "#636e72"; 
                    ctx.fillText(item.price || '-', x + (cardWidth/2), drawY);
                }
            }
        }
    }
    return cvs.toDataURL('image/jpeg', 0.9);
}

window.downloadImage = function() {
    const img = document.getElementById('imgCollection');
    if(!img || !img.src) return;
    const link = document.createElement('a');
    link.download = 'nongdam_collection_list.jpg';
    link.href = img.src;
    link.click();
}

init();