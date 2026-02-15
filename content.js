// 클릭 이벤트 리스너 (Capture Phase)
document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;

    // 저장된 설정을 비동기로 가져와서 확인
    chrome.storage.sync.get(['isEnabled', 'sites'], (data) => {
        const isEnabled = data.isEnabled !== false; // 기본값 true
        const allowedSites = data.sites || [];

        // 1. 기능이 꺼져있으면 작동 안 함
        if (!isEnabled) return;

        // 2. 현재 도메인이 허용된 리스트에 포함되어 있는지 확인 (부분 일치)
        const currentHost = window.location.hostname;
        const isTargetSite = allowedSites.some(site => currentHost.includes(site));

        if (!isTargetSite) return;

        // --- 여기서부터 기존 로직 수행 ---
        
        // 예외 처리 (새탭, 자바스크립트 등)
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1 || 
            link.href.startsWith('javascript:') || link.href.includes('#')) {
            return;
        }

        // SPA 동작 차단 및 강제 이동
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        window.location.href = link.href;
    });
}, true);