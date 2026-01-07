// script.js (기능 추가 최종 버전)

// [설정] 구글 스프레드시트 ID
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';

// 데이터가 로드될 변수
let productData = [];

let currentTab = 'owned'; 
let filters = { country: 'all', character: 'all' }; 
let isViewCheckedOnly = false; // [추가] 체크한 것만 보기 상태 변수

let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

const listContainer = document.getElementById('listContainer');
const mainContent = document.getElementById('mainContent'); // 스크롤 감지용
const scrollTopBtn = document.getElementById('scrollTopBtn'); // 탑 버튼

// 초기화 함수
async function init() {
    await fetchData(); 
    renderList();
    updateTabUI();
    
    // [추가] 스크롤 이벤트 리스너 등록
    mainContent.addEventListener('scroll', scrollFunction);
}

// 구글 시트 CSV 데이터 가져오기
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
            데이터를 불러오지 못했습니다.<br>
            <span style="font-size:12px;">(컴퓨터 파일로 열었다면 Github에 올려서 확인해주세요!)</span>
        </div>`;
    }
}

// CSV 파싱 함수
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
    
    updateTabUI();
    renderList();

    const titleInput = document.getElementById('customTitle');
    if(titleInput) {
        titleInput.value = tab === 'owned' ? "농담곰 인형 보유 리스트" : "농담곰 인형 위시 리스트";
    }

    const badge = document.getElementById('mobileModeBadge');
    if (badge) {
        badge.innerText = tab === 'owned' ? "보유" : "위시";
    }
}

function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.tab === currentTab); });
}

// [추가] 체크한 것만 모아보기 토글 함수
function toggleViewChecked() {
    const checkbox = document.getElementById('viewCheckedOnly');
    isViewCheckedOnly = checkbox.checked;
    renderList();
}

// [핵심 수정] 리스트 렌더링 함수 (카운트 & 필터링 로직 추가)
function renderList() {
    listContainer.innerHTML = '';
    
    // 1. 현재 필터(국가/캐릭터)에 맞는 데이터 가져오기
    const filteredData = getFilteredData(); 

    if (filteredData.length === 0) {
        if (productData.length === 0) return; 
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">해당하는 농담곰이 없어요 😢</div>';
        return;
    }

    // 2. 그룹핑 (마스코트, 기본 등)
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

    // 3. 그룹별 렌더링
    let hasAnyItem = false; // 화면에 표시된 아이템이 하나라도 있는지 확인

    Object.keys(grouped).forEach(groupName => {
        const groupItems = grouped[groupName];
        
        // [카운트] 이 그룹의 전체 개수와 체크된 개수 계산
        let totalCount = groupItems.length;
        let checkedCount = 0;

        // 먼저 체크된 개수부터 계산 (화면 표시 여부와 상관없이 통계용)
        groupItems.forEach(item => {
            const isOwned = checkedItems.owned.has(item.id);
            if (currentTab === 'owned') {
                if (isOwned) checkedCount++;
            } else {
                // 위시탭: 보유(잠금) 상태이거나 위시에 체크된 경우
                if (isOwned || checkedItems.wish.has(item.id)) checkedCount++;
            }
        });

        // 4. 아이템 카드 생성 (DOM 요소)
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        let visibleItemCount = 0;

        groupItems.forEach(item => {
            const isOwned = checkedItems.owned.has(item.id); 
            let isChecked = false;
            let isLocked = false; 

            if (currentTab === 'owned') {
                isChecked = isOwned;
            } else {
                if (isOwned) {
                    isChecked = true;
                    isLocked = true; 
                } else {
                    isChecked = checkedItems.wish.has(item.id);
                }
            }

            // [필터링] '체크한 것만 보기'가 켜져있는데 체크 안 된 항목이면 건너뜀
            if (isViewCheckedOnly && !isChecked) {
                return; 
            }

            visibleItemCount++;

            const card = document.createElement('div');
            card.className = `item-card ${isChecked ? 'checked' : ''} ${isLocked ? 'owned-in-wish' : ''}`;
            
            card.onclick = () => {
                if (isLocked) return; 
                toggleCheck(item.id, card);
            };

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

        // 5. 표시할 아이템이 있는 경우에만 그룹 제목과 그리드를 추가
        if (visibleItemCount > 0) {
            hasAnyItem = true;
            const title = document.createElement('h3');
            title.className = 'group-title';
            // [카운트 표시] 그룹명 (체크수/전체수)
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
        return true;
    });
}

function toggleCheck(id, cardElement) {
    if (checkedItems[currentTab].has(id)) { 
        checkedItems[currentTab].delete(id); 
        cardElement.classList.remove('checked'); 
    } else { 
        checkedItems[currentTab].add(id); 
        cardElement.classList.add('checked'); 
    }
    saveData();
    
    // [추가] 체크 상태가 바뀌면, '체크한 것만 보기' 모드거나 카운트 갱신을 위해 리스트 다시 그리기
    // UX상 바로 사라지는게 싫으면 아래 renderList()는 주석 처리하고 카운트만 별도로 갱신해야 하지만,
    // 여기선 데이터 정확성을 위해 다시 그리는 방식을 택함.
    if (isViewCheckedOnly) {
        renderList();
    } else {
        // 전체 모드일 때는 카운트 숫자만 갱신하는게 좋지만 구현 단순화를 위해 전체 렌더링
        // (성능 문제 생기면 최적화 가능)
        renderList();
    }
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
    filters = { country: 'all', character: 'all' }; 
    document.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(btn => btn.classList.add('active'));
    
    // [추가] 체크한 것만 보기 옵션도 초기화
    isViewCheckedOnly = false;
    document.getElementById('viewCheckedOnly').checked = false;

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

function toggleNickCheck() {
    const nickInput = document.getElementById('nickInput');
    const nickCheck = document.getElementById('showNick');
    
    if (nickInput.value.trim().length > 0) {
        nickCheck.checked = true;
    } else {
        nickCheck.checked = false;
    }
}

// [추가] 스크롤 시 탑 버튼 표시/숨김
function scrollFunction() {
    // mainContent의 스크롤 위치 감지
    if (mainContent.scrollTop > 300) {
        scrollTopBtn.style.display = "block";
        // 약간의 애니메이션 효과 (opacity)
        setTimeout(() => scrollTopBtn.style.opacity = "1", 10);
    } else {
        scrollTopBtn.style.opacity = "0";
        setTimeout(() => scrollTopBtn.style.display = "none", 300);
    }
}

// [추가] 탑 버튼 클릭 시 맨 위로
function scrollToTop() {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
}

// [이미지 생성 함수]
async function generateImage(mode = 'all') {
    let sourceData = [];

    if (mode === 'all') {
        sourceData = productData;
    } else {
        // [수정] 현재 페이지 저장 시, '체크한 것만 보기' 필터 상태와 상관없이
        // 현재 사이드바 필터(국가/캐릭터)에 맞는 데이터 전체를 대상으로 함
        // (보이는 것만 저장하려면 getFilteredData() 사용 후 isViewCheckedOnly 체크 로직 추가 가능)
        sourceData = getFilteredData();
    }

    const items = sourceData.filter(p => {
        const isChecked = checkedItems[currentTab].has(p.id);
        if (currentTab === 'wish' && checkedItems.owned.has(p.id)) {
            return false; 
        }
        return isChecked;
    });

    if (items.length === 0) return alert("저장할 위시 아이템이 없습니다.\n(보유한 인형은 제외됩니다)");
    
    await document.fonts.ready;

    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const showNick = document.getElementById('showNick').checked;
    const showTitle = document.getElementById('showTitle').checked;
    
    const customTitle = document.getElementById('customTitle').value;
    const nickText = document.getElementById('nickInput').value;

    const btnId = mode === 'all' ? 'genBtnAll' : 'genBtnCurrent';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    
    const maxCols = 4;
    const cols = items.length < maxCols ? items.length : maxCols;
    
    const cardW = 300, cardH = 420;
    const gap = 30, padding = 60;
    
    const headerH = 160; 
    const titleY = 60;   
    const nickY = 115;   

    const rows = Math.ceil(items.length / cols);

    cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
    cvs.height = headerH + padding + (cardH * rows) + (gap * (rows - 1));

    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    if (showTitle) {
        const titleColor = "#aeb4d1"; 
        ctx.fillStyle = titleColor;
        ctx.font = "bold 45px 'Paperlogy', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillText(customTitle, cvs.width / 2, titleY);
    }

    if (showNick && nickText.trim() !== "") {
        ctx.font = "bold 24px 'Paperlogy', sans-serif"; 
        ctx.fillStyle = "#636e72"; 
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nickText, cvs.width / 2, nickY);
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

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

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % cols; 
        const r = Math.floor(i / cols);
        const x = padding + c * (cardW + gap);
        const y = headerH + r * (cardH + gap); 

        // 카드 배경 (흰색)
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 15;
        
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.fill();
        
        // 카드 테두리: 항상 회색(#eae8e4)
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "#eae8e4"; 
        ctx.lineWidth = 2;
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.stroke();

        const img = await loadImage(item.image);
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
            // 가격표 색상 #b2bec3 고정
            ctx.fillStyle = "#b2bec3";
            ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
            const priceY = showName ? y + 390 : y + 330; 
            ctx.fillText(item.price, x + cardW/2, priceY);
        }
    }

    const link = document.createElement('a');
    link.download = `nongdam_${currentTab}_list.jpg`;
    link.href = cvs.toDataURL('image/jpeg');
    link.click();
    btn.innerText = originalText;
    btn.disabled = false;
}

// 모바일 사이드바 토글 함수
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

init();