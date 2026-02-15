// 확장 프로그램이 처음 설치되었을 때 실행되는 이벤트
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // 초기 데이터 설정: 유튜브를 기본값으로 넣음
        chrome.storage.sync.set({
            sites: ['www.youtube.com'], 
            isEnabled: true,
            themeMode: 'system'
        });
    }
});