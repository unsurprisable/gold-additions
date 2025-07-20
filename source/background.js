chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: "https://www.ratemyprofessors.com/search/professors/1077" });
});
