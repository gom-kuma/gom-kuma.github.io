/**
 * ==============================================================================
 * 전역 설정 및 데이터 관리
 * ==============================================================================
 */
// 구글 스프레드시트 설정
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';
const SHEET_TITLE = '시트1'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TITLE}`;

// 회사 정보 구조체 (필터링 및 표시에 사용)
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

// 애플리케이션 상태 변수
let productData = []; // 전체 상품 데이터
let currentTab = 'owned'; // 현재 선택된 탭 (보유/위시)
let filters = { country: 'all', character: 'all', companyGroup: 'all', companySpecific: null }; // 필터 상태

// 로컬 스토리지에서 저장된 체크 항목 불러오기
let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

// DOM 요소 참조
const listContainer = document.getElementById('listContainer');

/**
 * ==============================================================================
 * 초기화 로직
 * ==============================================================================
 */
// DOMContentLoaded 시 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', async () => {
    if (listContainer) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">데이터 불러오는 중... 🐻</div>';
    }

    // 탭 버튼 이벤트 리스너 등록
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 데이터 가져오기 및 초기 화면 렌더링
    await fetchSheetData();
    renderCompanySubFilters();
    renderList();
    updateTabUI();
});

// 구글 스프레드시트 CSV 데이터 가져오기 및 파싱
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
        
        const data = await response.text();
        const rows = data.split(/\r?\n/);
        
        if (rows.length < 2) throw new Error('시트에서 빈 데이터가 반환되었습니다.');

        const headers = parseCsvRow(rows[0]);
        
        // CSV 행을 객체로 파싱
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

        console.log(`[시스템] 총 ${productData.length}개의 아이템을 성공적으로 로드했습니다.`);

    } catch (err) {
        console.error("[시스템] 데이터 가져오기 오류:", err);
        if (listContainer) {
            listContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#ff7675;">
                데이터를 불러오지 못했습니다.<br>
                오류: ${err.message}<br>
                구글 시트 게시 설정을 확인해주세요.
            </div>`;
        }
    }
}

// CSV 행 파서 (따옴표 내부의 쉼표 처리)
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
 * 렌더링 및 필터링 로직
 * ==============================================================================
 */
// '보유' 및 '위시' 탭 간 전환
function switchTab(tab) {
    currentTab = tab;
    if (tab === 'wish') document.body.classList.add('theme-wish');
    else document.body.classList.remove('theme-wish');
    updateTabUI();
    renderList();
}

// 탭 버튼 UI 상태 업데이트
function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

// 현재 탭 및 필터를 기반으로 아이템 목록 렌더링
function renderList() {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    // 필터 적용
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

    // 결과 없음 처리
    if (filteredData.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">필터와 일치하는 아이템이 없습니다. 😢</div>';
        return;
    }

    // 캐릭터 서브그룹 또는 메인 그룹으로 아이템 그룹화
    const grouped = {};
    filteredData.forEach(item => {
        let groupKey;
        if (filters.character === 'ngn' && item.subGroup) groupKey = item.subGroup;
        else groupKey = item.group || "기타";

        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
    });

    // 그룹 및 아이템 카드 렌더링
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

// 아이템 체크 상태 토글
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

// 체크된 아이템을 로컬 스토리지에 저장
function saveData() { 
    localStorage.setItem(`nongdam_${currentTab}`, JSON.stringify([...checkedItems[currentTab]])); 
}

/**
 * ==============================================================================
 * 필터 액션 (HTML onclick 이벤트용 전역 함수)
 * ==============================================================================
 */
// 메인 필터 타입 및 값 설정
window.setFilter = function(type, value) {
    filters[type] = value;
    const parentWrapper = event.currentTarget.closest('.filter-item-wrapper');
    if (parentWrapper) {
        parentWrapper.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    }
    event.currentTarget.classList.add('active');
    renderList();
};

// 회사 그룹 필터 설정
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

// 특정 회사 필터 설정
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

// 회사 하위 필터 버튼 렌더링
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

// 모든 필터를 기본 상태로 초기화
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

// 현재 탭의 체크 기록 초기화
window.resetRecords = function() {
    const listName = currentTab === 'owned' ? '보유' : '위시';
    if (confirm(`[${listName} 리스트]의 모든 기록을 삭제하시겠습니까?`)) { 
        checkedItems[currentTab].clear(); 
        saveData(); 
        renderList(); 
        alert(`초기화되었습니다.`); 
    }
};

/**
 * ==============================================================================
 * 이미지 생성 로직
 * ==============================================================================
 */
// 헬퍼: 캔버스 컨텍스트에 둥근 사각형 경로 생성
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

// 헬퍼: 타임아웃을 포함한 로컬 폰트 로딩 시도
async function loadFontWithTimeout(name, url, timeout = 3000) {
    try {
        if (!window.FontFace) {
            console.warn("[시스템] 이 브라우저는 FontFace API를 지원하지 않습니다. 기본 폰트를 사용합니다.");
            return false;
        }

        // 로컬 파일 경로 사용
        const font = new FontFace(name, `url(${url})`);
        
        const loadPromise = font.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            return true;
        }).catch(e => {
             console.warn(`[시스템] 폰트 '${name}' 로딩 실패:`, e);
             return false;
        });

        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.warn(`[시스템] 폰트 '${name}' 로딩 시간 초과. 기본 폰트를 사용합니다.`);
                resolve(false);
            }, timeout);
        });

        return await Promise.race([loadPromise, timeoutPromise]);

    } catch (e) {
        console.warn(`[시스템] 폰트 로딩 중 예상치 못한 오류:`, e);
        return false;
    }
}

// 메인 이미지 생성 함수
window.generateImage = async function() {
    const ids = [...checkedItems[currentTab]];
    if (ids.length === 0) return alert("선택된 아이템이 없습니다!");
    
    // 옵션 가져오기
    const showNameEl = document.getElementById('showName');
    const showPriceEl = document.getElementById('showPrice');
    const btn = document.getElementById('genBtn');
    
    const showName = showNameEl ? showNameEl.checked : true;
    const showPrice = showPriceEl ? showPriceEl.checked : true;
    
    const originalText = btn.innerText;
    btn.innerText = "폰트 로딩 중...";
    btn.disabled = true;

    try {
        // [수정됨] 로컬 'Paperlogy.ttf' 폰트 로딩
        await loadFontWithTimeout('Paperlogy', 'Paperlogy.ttf');
        
        btn.innerText = "이미지 생성 중...";

        const items = ids.map(id => productData.find(p => p.id === id)).filter(p => p);
        const cvs = document.createElement('canvas');
        const ctx = cvs.getContext('2d');

        // 레이아웃 설정
        const cols = Math.min(items.length, 4); 
        const rows = Math.ceil(items.length / cols);
        const cardW = 300, cardH = 420;
        const gap = 30, padding = 60;
        const headerH = 220; 
        const cornerRadius = 40; 

        // 캔버스 크기 계산
        cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
        cvs.height = headerH + padding * 2 + (cardH * rows) + (gap * (rows - 1));

        // *** 전체 둥근 모서리 클리핑 (가장 먼저 실행) ***
        roundedRect(ctx, 0, 0, cvs.width, cvs.height, cornerRadius);
        ctx.clip(); 

        // 배경색 채우기
        ctx.fillStyle = "#fdfbf7";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // 헤더 배경 그리기 (보유 테마 색상 고정)
        ctx.fillStyle = "#aeb4d1"; 
        ctx.fillRect(0, 0, cvs.width, headerH);

        // 타이틀 그리기 (폰트 변경됨: Paperlogy)
        ctx.font = "bold 70px 'Paperlogy', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillStyle = "white"; 
        const titleText = currentTab === 'owned' ? "내 농담곰 컬렉션" : "농담곰 위시리스트";
        ctx.fillText(titleText, cvs.width / 2, headerH / 2);

        // 이미지 로드 헬퍼
        const loadImage = (src) => new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });

        // 아이템 카드 루프
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = padding + c * (cardW + gap);
            const y = headerH + padding + r * (cardH + gap);

            // 카드 배경
            ctx.save();
            roundedRect(ctx, x, y, cardW, cardH, 20); 
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fill();
            
            // 카드 테두리
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "#eae8e4";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.clip(); 

            // 상품 이미지
            const img = await loadImage(item.image);
            if (img) {
                const aspect = img.width / img.height;
                let dw = 260, dh = 260;
                if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
                ctx.drawImage(img, x + (cardW - dw)/2, y + 30 + (260 - dh)/2, dw, dh);
            }
            ctx.restore();

            // 텍스트 (상품명 및 가격)
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            
            if (showName) {
                ctx.fillStyle = "#2d3436";
                // 상품명 폰트는 가독성을 위해 기존 고운돋움 유지 (필요 시 Paperlogy로 변경 가능)
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

            if (showPrice) {
                ctx.fillStyle = "#a4b0be";
                ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
                const priceY = showName ? y + 395 : y + 340; 
                ctx.fillText(item.price, x + cardW/2, priceY);
            }
        }

        // 다운로드
        const link = document.createElement('a');
        link.download = `nongdam_${currentTab}_list.png`;
        link.href = cvs.toDataURL('image/png');
        link.click();

    } catch (err) {
        alert("이미지 생성 오류: " + err.message);
        console.error(err);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};