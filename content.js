// --- 설정 상수 ---
const STORAGE_TIME_KEY = 'force_reload_timestamp';
const RELOAD_COOLDOWN = 4000; // 4초 쿨타임 (이 시간 안에는 다시 리로드 금지)

let lastUrl = location.href;

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
// subtree: true, childList: true로 DOM 변화 감지
observer.observe(document, { subtree: true, childList: true });


// --- [기능 1] 링크 클릭 핸들러 ---
function handleLinkClick(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    if (e.button !== 0) return; // 좌클릭만
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // 새탭 열기는 제외
    if (link.href.startsWith('javascript:') || link.href.includes('#')) return;

    // 클릭은 사용자의 명시적 의도이므로 쿨타임을 무시하고 즉시 실행할 수도 있지만,
    // 더블 클릭 등으로 인한 중복 실행을 막기 위해 체크
    if (isOnCooldown()) return;

    checkAndExecute(link.href, (shouldReload) => {
        if (shouldReload) {
            // 클릭 이벤트 무력화
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            triggerReload(link.href);
        }
    });
}

// --- [기능 2] URL 변경(자동 이동) 핸들러 ---
function handleUrlChange() {
    // 쿨타임 중이면 URL이 바뀌어도 절대 무시 (가장 중요)
    if (isOnCooldown()) {
        console.log("쿨타임 중이라 리로드 무시함");
        return;
    }

    checkAndExecute(location.href, (shouldReload) => {
        if (shouldReload) {
            triggerReload(location.href);
        }
    });
}

// --- [핵심] 쿨타임 체크 함수 ---
function isOnCooldown() {
    const lastTimeStr = sessionStorage.getItem(STORAGE_TIME_KEY);
    if (!lastTimeStr) return false;

    const lastTime = parseInt(lastTimeStr, 10);
    const currentTime = Date.now();

    // 현재 시간이 [마지막 리로드 시간 + 쿨타임]보다 작으면 아직 쿨타임 중
    return (currentTime - lastTime) < RELOAD_COOLDOWN;
}

// --- [공통] 강제 새로고침 실행 함수 ---
function triggerReload(targetUrl) {
    // 1. 현재 시간을 기록 (이제부터 4초간 리로드 금지)
    sessionStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());

    // 2. 페이지 이동
    if (window.location.href !== targetUrl) {
        window.location.href = targetUrl;
    } else {
        window.location.reload();
    }
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

        // URL 객체를 이용해 호스트네임 비교 (더 정확함)
        try {
            const targetHost = new URL(targetUrl).hostname;
            const isTargetSite = allowedSites.some(site => targetHost.includes(site));

            if (!isTargetSite) {
                callback(false);
                return;
            }
            callback(true);
        } catch (err) {
            // URL 파싱 에러 시 무시
            callback(false);
        }
    });
}