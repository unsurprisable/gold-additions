/* global chrome, SEARCH_URL */

function handleSearch(inputProfName) {
    const url = SEARCH_URL + encodeURIComponent(inputProfName.trim());
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    const versionElement = document.getElementById('version');
    const form = document.querySelector('form');
    const input = document.getElementById('search');
    const searchButton = document.getElementById('search-button');
    const openGoldButton = document.getElementById('open-gold-button');

    versionElement.textContent = chrome.runtime.getManifest().version;

    input.focus();
    input.addEventListener('input', () => {
        searchButton.disabled = input.value.trim().length === 0;
    });

    form.onsubmit = (event) => {
        event.preventDefault();
        handleSearch(input.value.toUpperCase());
    };

    openGoldButton.addEventListener('click', () => {
        window.open('https://my.sa.ucsb.edu/gold/', '_blank');
    });

});