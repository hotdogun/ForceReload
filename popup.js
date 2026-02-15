document.addEventListener('DOMContentLoaded', () => {
    // UI 요소 가져오기
    const els = {
        title: document.getElementById('uiTitle'),
        enableLabel: document.getElementById('uiEnableLabel'),
        input: document.getElementById('siteInput'),
        addBtn: document.getElementById('addBtn'),
        themeBtn: document.getElementById('themeBtn'),
        masterToggle: document.getElementById('masterToggle'),
        siteList: document.getElementById('siteList')
    };

    let sites = [];
    let themeMode = 'system'; 

    // 1. 다국어(i18n) 텍스트 적용 함수
    function setLanguage() {
        els.title.textContent = chrome.i18n.getMessage("appName");
        els.enableLabel.textContent = chrome.i18n.getMessage("enableFeature");
        els.input.placeholder = chrome.i18n.getMessage("inputPlaceholder");
        els.addBtn.textContent = chrome.i18n.getMessage("addBtn");
    }

    // 2. 초기 데이터 로드 및 UI 설정
    setLanguage(); // 언어 적용
    
    chrome.storage.sync.get(['isEnabled', 'sites', 'themeMode'], (data) => {
        els.masterToggle.checked = data.isEnabled !== false;
        sites = data.sites || [];
        themeMode = data.themeMode || 'system';
        
        renderList();
        applyTheme();
    });

    // 3. 마스터 토글 변경 시 -> 저장 + [열린 탭 새로고침]
    els.masterToggle.addEventListener('change', () => {
        const isEnabled = els.masterToggle.checked;
        chrome.storage.sync.set({ isEnabled });

        // ★ 기능이 켜지면(ON), 리스트에 있는 사이트가 열린 탭을 찾아 새로고침
        if (isEnabled && sites.length > 0) {
            refreshTargetTabs(sites);
        }
    });

    // 4. 열려있는 탭 중 대상 사이트 찾아서 새로고침하는 함수
    function refreshTargetTabs(targetSites) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (!tab.url) return;
                // 탭의 URL이 저장된 사이트 목록 중 하나라도 포함하는지 확인
                const shouldReload = targetSites.some(site => tab.url.includes(site));
                if (shouldReload) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });
    }

    // 5. 사이트 추가
    els.addBtn.addEventListener('click', addSite);
    els.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSite();
    });

    function addSite() {
        const url = els.input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (url && !sites.includes(url)) {
            sites.push(url);
            saveSites();
            els.input.value = '';
        }
    }

    // 6. 사이트 삭제
    els.siteList.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-btn')) {
            const urlToDelete = e.target.dataset.url;
            sites = sites.filter(s => s !== urlToDelete);
            saveSites();
        }
    });

    function saveSites() {
        chrome.storage.sync.set({ sites }, renderList);
    }

    function renderList() {
        els.siteList.innerHTML = '';
        sites.forEach(site => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${site}</span>
                <button class="del-btn" data-url="${site}">X</button>
            `;
            els.siteList.appendChild(li);
        });
    }

    // 7. 테마 설정 (3단 토글 + 다국어 적용)
    els.themeBtn.addEventListener('click', () => {
        if (themeMode === 'system') themeMode = 'off';
        else if (themeMode === 'off') themeMode = 'on';
        else themeMode = 'system';
        
        chrome.storage.sync.set({ themeMode }, applyTheme);
    });

    function applyTheme() {
        let isDark = false;
        let btnKey = "themeSystem"; // i18n 키값

        if (themeMode === 'on') {
            isDark = true;
            btnKey = "themeDark";
        } else if (themeMode === 'off') {
            isDark = false;
            btnKey = "themeLight";
        } else {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            btnKey = "themeSystem";
        }

        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        els.themeBtn.textContent = chrome.i18n.getMessage(btnKey); // 언어에 맞는 텍스트 출력
    }
});