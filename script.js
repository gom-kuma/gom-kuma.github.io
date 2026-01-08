// script.js 

const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';

let productData = [];

let currentTab = 'owned'; 

let filters = { country: 'all', character: 'all', group: 'all' }; 
let isViewCheckedOnly = false; 

let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

const listContainer = document.getElementById('listContainer');
const mainContent = document.getElementById('mainContent'); 
const scrollTopBtn = document.getElementById('scrollTopBtn'); 

// 스타일 지정
function injectGrayStyle() {
    const style = document.createElement('style');
    style.innerHTML = `
        .item-card.owned-in-wish {
            border-color: #b2bec3 !important;
            background-color: #f1f2f6 !important;
            cursor: default !important;
        }
        .item-card.owned-in-wish .check-overlay::after {
            background-color: #b2bec3 !important;
            box-shadow: none !important;
            content: '✔' !important;
        }
        .item-card.owned-in-wish .item-price {
            background-color: #e2e6ea !important;
            color: #b2bec3 !important;
        }
    `;
    document.head.appendChild(style);
}

// 초기화
async function init() {
    injectGrayStyle(); 
    await fetchData(); 
    renderList();
    updateTabUI();
    
    mainContent.addEventListener('scroll', scrollFunction);

    const viewCheckInput = document.getElementById('viewCheckedOnly');
    if (viewCheckInput) {
        viewCheckInput.addEventListener('change', toggleViewChecked);
    }
}

// 데이터 불러오기
async function fetchData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("네트워크 응답이 올바르지 않습니다.");
        
        const text = await response.text();
        productData = parseCSV(text);
        
        console.log("데이터 로드 성공:", productData.length + "개");
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        listContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#aaa; line-height:1.6;">
            데이터를 불러오지 못했습니다.
        </div>`;
    }
}

// CSV 파싱
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
        headers.forEach((header, index) => {
            let value = row[index];
            item[header] = value;
        });
        
        if(item.id) data.push(item);
    }
    return data;
}

function switchTab(tab) {
    currentTab = tab;
    
    if (tab === 'wish') { 
        document.body.classList.add('theme-wish'); 
    } else { 
        document.body.classList.remove('theme-wish'); 
    }
    
    const viewCheckText = document.getElementById('viewCheckText');
    if (viewCheckText) {
        viewCheckText.innerText = tab === 'owned' ? "내 콜렉션 모아보기" : "내 위시 모아보기";
    }

    // 탭 전환 시 타이틀 입력창 값 변경
    const titleInput = document.getElementById('customTitle');
    if (titleInput) {
        titleInput.value = tab === 'owned' ? '농담곰 인형 보유 리스트' : '농담곰 인형 위시 리스트';
    }

    const topImg = document.getElementById('scrollTopImg');
    if (topImg) {
        topImg.src = tab === 'owned' ? 'img/top_own.png' : 'img/top_wish.png';
    }

    const delImg = document.getElementById('deleteRecordImg');
    if (delImg) {
        delImg.src = tab === 'owned' ? 'img/own_delete.png' : 'img/wish_delete.png';
    }
    
    updateTabUI();
    renderList();

    const badge = document.getElementById('mobileModeBadge');
    if (badge) {
        badge.innerText = tab === 'owned' ? "보유" : "위시";
    }
}

function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.tab === currentTab); });
}

function toggleViewChecked() {
    const checkbox = document.getElementById('viewCheckedOnly');
    isViewCheckedOnly = checkbox.checked;
    renderList();
}

// 리스트 렌더링
function renderList() {
    listContainer.innerHTML = '';
    
    const filteredData = getFilteredData(); 

    if (filteredData.length === 0) {
        if (productData.length === 0) return; 
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">해당하는 농담곰이 없어요 😢</div>';
        return;
    }

    const grouped = {};
    filteredData.forEach(item => {
        let groupKey;
        if (filters.character === 'ngn' && item.subGroup) {
            groupKey = item.subGroup;
        } else {
            groupKey = item.group;
        }
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
    });

    let hasAnyItem = false; 

    Object.keys(grouped).forEach(groupName => {
        const groupItems = grouped[groupName];
        
        let totalCount = groupItems.length;
        let checkedCount = 0;

        groupItems.forEach(item => {
            if (checkedItems.owned.has(item.id)) {
                checkedCount++;
            }
        });

        const grid = document.createElement('div');
        grid.className = 'items-grid';
        let visibleItemCount = 0;

        groupItems.forEach(item => {
            const isOwned = checkedItems.owned.has(item.id); 
            const isWished = checkedItems.wish.has(item.id);
            
            let displayClass = ''; 
            let isLocked = false;  

            if (currentTab === 'owned') {
                if (isOwned) displayClass = 'checked';
            } else {
                if (isOwned) {
                    displayClass = 'checked owned-in-wish'; 
                    isLocked = true;
                } else if (isWished) {
                    displayClass = 'checked';
                }
            }

            let showItem = true;
            if (isViewCheckedOnly) {
                if (currentTab === 'owned') {
                    if (!isOwned) showItem = false;
                } else {
                    if (isOwned) showItem = false; 
                    if (!isWished) showItem = false;
                }

                if (showItem) {
                    displayClass = ''; 
                    isLocked = false;
                }
            }

            if (!showItem) return;

            visibleItemCount++;

            const card = document.createElement('div');
            card.className = `item-card ${displayClass}`;
            
            if (isLocked && !isViewCheckedOnly) {
                card.style.borderColor = "#b2bec3";
                card.style.backgroundColor = "#f1f2f6";
            }

            if (!isViewCheckedOnly) {
                card.onclick = () => {
                    if (isLocked) return; 
                    toggleCheck(item.id, card);
                };
            } else {
                card.style.cursor = 'default';
            }

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

        if (visibleItemCount > 0) {
            hasAnyItem = true;
            const title = document.createElement('h3');
            title.className = 'group-title';
            title.innerHTML = `${groupName} <span class="group-count">(${checkedCount}/${totalCount})</span>`;
            
            listContainer.appendChild(title);
            listContainer.appendChild(grid);
        }
    });

    if (!hasAnyItem && isViewCheckedOnly) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">체크된 인형이 없습니다.</div>';
    }
}

function getFilteredData() {
    return productData.filter(item => {
        if (filters.country !== 'all' && item.country !== filters.country) return false;
        if (filters.character !== 'all' && item.character !== filters.character) return false;
        if (filters.group !== 'all' && item.group !== filters.group) return false;
        return true;
    });
}

function toggleCheck(id, cardElement) {
    if (checkedItems[currentTab].has(id)) { 
        checkedItems[currentTab].delete(id); 
    } else { 
        checkedItems[currentTab].add(id); 
    }
    saveData();
    renderList();
}

function saveData() { localStorage.setItem(`nongdam_${currentTab}`, JSON.stringify([...checkedItems[currentTab]])); }

function setFilter(type, value) {
    filters[type] = value;
    const parentWrapper = event.currentTarget.closest('.filter-item-wrapper');
    if (parentWrapper) {
        parentWrapper.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    event.currentTarget.classList.add('active');
    renderList();
}

function resetFilters() {
    filters = { country: 'all', character: 'all', group: 'all' }; 
    document.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(btn => btn.classList.add('active'));
    
    isViewCheckedOnly = false;
    const chk = document.getElementById('viewCheckedOnly');
    if(chk) chk.checked = false;

    renderList();
}

function resetRecords() {
    const listName = currentTab === 'owned' ? '보유' : '위시';
    if (confirm(`${listName} 리스트의 체크 기록을 모두 삭제하시겠습니까?`)) {
        checkedItems[currentTab].clear();
        saveData();
        renderList();
        alert(`${listName} 리스트를 초기화했습니다.`);
    }
}

// [수정] 간소화 모드 UI 토글 (타이틀은 제외하고 상품명/가격만 비활성화)
function toggleSimpleModeUI() {
    const isSimple = document.getElementById('simpleMode').checked;
    const textOptions = document.getElementById('textOptions');

    if (isSimple) {
        textOptions.classList.add('disabled-option');
        document.getElementById('showName').disabled = true;
        document.getElementById('showPrice').disabled = true;
        // 타이틀 관련은 건드리지 않음
    } else {
        textOptions.classList.remove('disabled-option');
        document.getElementById('showName').disabled = false;
        document.getElementById('showPrice').disabled = false;
    }
}

function scrollFunction() {
    // 탑 버튼 항상 표시
}

function scrollToTop() {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// --- [이미지 생성] 간소화 모드 + 타이틀 지원 + 가변 그리드 ---
async function generateImage(mode = 'all') {
    let sourceData = [];

    if (mode === 'all') {
        sourceData = productData;
    } else {
        sourceData = getFilteredData();
    }

    const items = sourceData.filter(p => {
        const isOwned = checkedItems.owned.has(p.id);
        const isWished = checkedItems.wish.has(p.id);

        if (currentTab === 'owned') {
            return isOwned;
        } else {
            if (isOwned) return false;
            return isWished;
        }
    });

    if (items.length === 0) return alert("현재 페이지에서 체크된 상품이 없습니다.");
    
    await document.fonts.ready;

    // 옵션 확인
    const isSimpleMode = document.getElementById('simpleMode').checked; 
    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const showTitle = document.getElementById('showTitle').checked;
    const customTitle = document.getElementById('customTitle').value;

    const btnId = mode === 'all' ? 'genBtnAll' : 'genBtnCurrent';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    
    // [가변 그리드 계산]
    const totalCount = items.length;
    let calculatedCols = Math.round(Math.sqrt(totalCount)); 
    
    if (calculatedCols < 3) calculatedCols = 3;
    if (calculatedCols > 8) calculatedCols = 8;
    if (totalCount < 3) calculatedCols = totalCount;

    const cols = calculatedCols;
    
    // [설정 분기]
    let cardW, cardH, gap;

    // 헤더(타이틀 영역)는 모드 상관없이 체크 여부에 따라 결정
    const headerH = showTitle ? 140 : 60;
    const titleY = 70;

    if (isSimpleMode) {
        // [간소화 모드]
        cardW = 160; 
        cardH = 160; 
        gap = 15;    
    } else {
        // [일반 모드]
        cardW = 300;
        let dynamicCardH = 300; 
        if (showName) dynamicCardH += 80;
        if (showPrice) dynamicCardH += 40;
        cardH = dynamicCardH;
        gap = 30;
    }

    const padding = 60;
    const rows = Math.ceil(items.length / cols);

    // 캔버스 크기 계산
    cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
    cvs.height = headerH + (cardH * rows) + (gap * (rows - 1)) + padding;

    // 배경
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // 타이틀 (체크되어 있으면 무조건 그림)
    if (showTitle) {
        const titleColor = "#aeb4d1"; 
        ctx.fillStyle = titleColor;
        ctx.font = "bold 45px 'Paperlogy', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillText(customTitle, cvs.width / 2, titleY);
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    // 둥근 사각형 함수
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // 아이템 그리기 반복
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % cols; 
        const r = Math.floor(i / cols);
        const x = padding + c * (cardW + gap);
        const y = headerH + r * (cardH + gap); 

        const img = await loadImage(item.image);

        if (isSimpleMode) {
            // [간소화 모드: 원형]
            const radius = cardW / 2;
            const cx = x + radius;
            const cy = y + radius;

            // 1. 배경
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.1)"; 
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
            ctx.fill();
            ctx.restore();

            // 2. 이미지
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.clip(); 

            if (img) {
                const aspect = img.width / img.height;
                let dw = cardW, dh = cardH;
                if (aspect > 1) dw = cardH * aspect; else dh = cardW / aspect;
                ctx.drawImage(img, x + (cardW - dw) / 2, y + (cardH - dh) / 2, dw, dh);
            }
            ctx.restore();

            // 3. 테두리
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#dfe6e9"; 
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

        } else {
            // [일반 모드: 카드]
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 0;
            
            roundRect(ctx, x, y, cardW, cardH, 20);
            ctx.fill();
            
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "#dfe6e9"; 
            ctx.lineWidth = 2;
            roundRect(ctx, x, y, cardW, cardH, 20);
            ctx.stroke();

            if (img) {
                const aspect = img.width / img.height;
                let dw = 260, dh = 260;
                if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
                ctx.drawImage(img, x + (cardW - dw)/2, y + 20 + (260 - dh)/2, dw, dh);
            }

            if (showName) {
                ctx.textAlign = "center";
                ctx.textBaseline = "alphabetic"; 
                ctx.fillStyle = "#2d3436";
                ctx.font = "bold 22px 'Gowun Dodum', sans-serif";
                
                const name = item.nameKo;
                const words = name.split(' ');
                let line = '', lineY = y + 310;
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > 260 && n > 0) {
                        ctx.fillText(line, x + cardW/2, lineY);
                        line = words[n] + ' '; lineY += 28;
                    } else { line = testLine; }
                }
                ctx.fillText(line, x + cardW/2, lineY);
            }

            if (showPrice) {
                ctx.fillStyle = "#b2bec3";
                ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
                const priceY = showName ? y + 390 : y + 330; 
                ctx.fillText(item.price, x + cardW/2, priceY);
            }
        }
    } // for loop

    const link = document.createElement('a');
    link.download = `nongdam_${currentTab}_list.jpg`;
    link.href = cvs.toDataURL('image/jpeg');
    link.click();
    btn.innerText = originalText;
    btn.disabled = false;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

init();
