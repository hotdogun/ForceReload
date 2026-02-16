let lastUrl = location.href;

// 무한 루프 방지용 키 이름
const STORAGE_KEY = 'force_reload_last_url';

// 1. 이벤트 리스너 등록 (클릭 & 마우스다운)
const events = ['click', 'mousedown'];
events.forEach(eventType => {
    document.addEventListener(eventType, handleLinkClick, true);
});

// 2. URL 변경 감지 (MutationObserver)
// 플레이리스트 자동 넘어감, 쇼츠 스크롤 등 감지
const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        handleUrlChange();
    }
});
observer.observe(document, { subtree: true, childList: true });

// --- [기능 1] 링크 클릭 핸들러 ---
function handleLinkClick(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    if (e.button !== 0) return; // 좌클릭만
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (link.href.startsWith('javascript:') || link.href.includes('#')) return;

    // 클릭은 사용자의 명시적 행동이므로 비교적 관대하게 처리하되
    // 현재 페이지와 완전히 같은 링크를 누른 경우에만 루프 방지 체크
    if (link.href === location.href) {
        if (isJustReloaded(link.href)) return; 
    }

    checkAndExecute(link.href, (shouldReload) => {
        if (shouldReload) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            forceReload(link.href);
        }
    });
}

// --- [기능 2] URL 변경(자동 이동) 핸들러 ---
function handleUrlChange() {
    // 플레이리스트나 쇼츠 등에서 URL이 바뀌었을 때
    checkAndExecute(location.href, (shouldReload) => {
        if (shouldReload) {
            // ★ 중요: 방금 새로고침해서 들어온 주소라면 무시 (무한루프 방지)
            if (isJustReloaded(location.href)) return;
            
            forceReload(location.href);
        }
    });
}

// --- [공통] 강제 새로고침 실행 함수 ---
function forceReload(targetUrl) {
    // 1. 현재 주소를 '방금 리로드함'으로 기록
    sessionStorage.setItem(STORAGE_KEY, targetUrl);

    // 2. 페이지 이동 또는 새로고침
    if (window.location.href !== targetUrl) {
        window.location.href = targetUrl;
    } else {
        window.location.reload();
    }
}

// --- [공통] 방금 리로드했는지 확인하는 함수 ---
function isJustReloaded(url) {
    const lastForced = sessionStorage.getItem(STORAGE_KEY);
    // 저장된 주소와 현재 주소가 정확히 일치하면 '방금 리로드된 것'으로 판단
    return lastForced === url;
}


// --- [공통] 설정 확인 및 판단 로직 ---
function checkAndExecute(targetUrl, callback) {
    chrome.storage.sync.get(['isEnabled', 'sites'], (data) => {
        const isEnabled = data.isEnabled !== false;
        const allowedSites = data.sites || [];

        if (!isEnabled) {
            callback(false);
            return;
        }

        // 도메인 체크 (예: youtube.com)
        const currentHost = new URL(targetUrl).hostname; // 정확한 호스트 추출
        const isTargetSite = allowedSites.some(site => currentHost.includes(site));

        if (!isTargetSite) {
            callback(false);
            return;
        }

        callback(true);
    });
}