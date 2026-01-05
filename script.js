// script.js 최종

// 1. 구글 시트 및 회사 데이터 설정
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM'; // 누나의 진짜 시트 ID
const SHEET_TITLE = '시트1'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TITLE}`;

// data.js가 없어졌으니 여기에 회사 정보를 넣어줘야 해!
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

let productData = []; // 시트에서 가져온 데이터가 여기 담김
let currentTab = 'owned'; 
let filters = { country: 'all', character: 'all', companyGroup: 'all', companySpecific: null };

let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

const listContainer = document.getElementById('listContainer');

// 2. 초기화 함수
async function init() {
    listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">농담곰 친구들 불러오는 중... 🐻</div>';
    await fetchSheetData(); 
    renderCompanySubFilters();
    renderList();
    updateTabUI();
}

// 3. 구글 시트 데이터 로드
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        const data = await response.text();
        const rows = data.split(/\r?\n/);
        
        if (rows.length < 2) return;

        const headers = parseCsvRow(rows[0]);
        productData = rows.slice(1).filter(row => row.trim() !== "").map(row => {
            const values = parseCsvRow(row);
            let obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || "";
            });
            return obj;
        });
        console.log("데이터 로딩 완료!", productData);
    } catch (err) {
        console.error("데이터 로드 실패:", err);
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#ff7675;">데이터를 가져올 수 없어.<br>1. 구글 시트 [웹에 게시] 확인<br>2. 브라우저 보안 정책 때문에 로컬 실행(더블클릭)은 안 됨!<br>3. Live Server나 깃허브를 이용해줘!</div>';
    }
}

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

// 4. 화면 렌더링 및 기능 로직
function switchTab(tab) {
    currentTab = tab;
    if (tab === 'wish') document.body.classList.add('theme-wish');
    else document.body.classList.remove('theme-wish');
    updateTabUI();
    renderList();
}

function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

function renderList() {
    listContainer.innerHTML = '';
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

    if (filteredData.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">해당하는 농담곰이 없어요 😢</div>';
        return;
    }

    const grouped = {};
    filteredData.forEach(item => {
        let groupKey;
        if (filters.character === 'ngn' && item.subGroup) groupKey = item.subGroup;
        else groupKey = item.group;

        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
    });

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

function toggleCheck(id, cardElement) {
    if (checkedItems[currentTab].has(id)) { checkedItems[currentTab].delete(id); cardElement.classList.remove('checked'); }
    else { checkedItems[currentTab].add(id); cardElement.classList.add('checked'); }
    saveData();
}

function saveData() { localStorage.setItem(`nongdam_${currentTab}`, JSON.stringify([...checkedItems[currentTab]])); }

function setFilter(type, value) {
    filters[type] = value;
    const parentWrapper = event.currentTarget.closest('.filter-item-wrapper');
    if (parentWrapper) {
        parentWrapper.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    }
    event.currentTarget.classList.add('active');
    renderList();
}

function setCompanyFilter(group) {
    filters.companyGroup = group; filters.companySpecific = null;
    const companyWrapper = document.querySelector('[data-type="company"]').closest('.filter-item-wrapper');
    companyWrapper.querySelectorAll('.text-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === group));
    document.getElementById('old-subs').classList.toggle('show', group === 'old');
    document.getElementById('new-subs').classList.toggle('show', group === 'new');
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    renderList();
}

function setCompanySpecific(companyName, btnElement) {
    if (filters.companySpecific === companyName) { filters.companySpecific = null; btnElement.classList.remove('active'); }
    else { filters.companySpecific = companyName; btnElement.parentElement.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active')); btnElement.classList.add('active'); }
    renderList();
}

function renderCompanySubFilters() {
    const oldContainer = document.getElementById('old-subs');
    companyInfo.groups.old.forEach(comp => { const btn = document.createElement('button'); btn.className = 'sub-btn'; btn.innerText = companyInfo.names[comp] || comp; btn.onclick = () => setCompanySpecific(comp, btn); oldContainer.appendChild(btn); });
    const newContainer = document.getElementById('new-subs');
    companyInfo.groups.new.forEach(comp => { const btn = document.createElement('button'); btn.className = 'sub-btn'; btn.innerText = companyInfo.names[comp] || comp; btn.onclick = () => setCompanySpecific(comp, btn); newContainer.appendChild(btn); });
}

function resetFilters() {
    filters = { country: 'all', character: 'all', companyGroup: 'all', companySpecific: null };
    document.querySelectorAll('.flag-btn, .char-btn, .text-btn, .sub-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(btn => btn.classList.add('active'));
    document.getElementById('old-subs').classList.remove('show');
    document.getElementById('new-subs').classList.remove('show');
    renderList();
}

function resetRecords() {
    const listName = currentTab === 'owned' ? '보유' : '위시';
    if (confirm(`[${listName} 리스트]의 체크 기록을 모두 삭제하시겠습니까?`)) { checkedItems[currentTab].clear(); saveData(); renderList(); alert(`초기화되었습니다.`); }
}

async function generateImage() {
    const ids = [...checkedItems[currentTab]];
    if (ids.length === 0) return alert("선택된 인형이 없어요!");
    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const btn = document.getElementById('genBtn');
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    const items = ids.map(id => productData.find(p => p.id === id)).filter(p => p);
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    const cols = 4;
    const cardW = 300, cardH = 420;
    const gap = 30, padding = 60, headerH = 150;
    const rows = Math.ceil(items.length / cols);

    cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
    cvs.height = headerH + padding * 2 + (cardH * rows) + (gap * (rows - 1));

    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = currentTab === 'owned' ? "#aeb4d1" : "#ff7675";
    ctx.font = "bold 60px 'Jua', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(currentTab === 'owned' ? "내 농담곰 컬렉션" : "농담곰 위시리스트", cvs.width / 2, 100);

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = padding + c * (cardW + gap);
        const y = headerH + padding + r * (cardH + gap);

        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y, cardW, cardH);
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "#eae8e4";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardW, cardH);

        const img = await loadImage(item.image);
        if (img) {
            const aspect = img.width / img.height;
            let dw = 260, dh = 260;
            if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
            ctx.drawImage(img, x + (300 - dw)/2, y + 20 + (260 - dh)/2, dw, dh);
        }

        if (showName) {
            ctx.textAlign = "center";
            ctx.fillStyle = "#2d3436";
            ctx.font = "bold 22px 'Gowun Dodum', sans-serif";
            const name = item.nameKo;
            const words = name.split(' ');
            let line = '', lineY = y + 310;
            for(let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                if (ctx.measureText(testLine).width > 260 && n > 0) {
                    ctx.fillText(line, x + 150, lineY);
                    line = words[n] + ' '; lineY += 28;
                } else { line = testLine; }
            }
            ctx.fillText(line, x + 150, lineY);
        }

        if (showPrice) {
            ctx.fillStyle = "#a4b0be";
            ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
            const priceY = showName ? y + 390 : y + 330; 
            ctx.fillText(item.price, x + 150, priceY);
        }
    }

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