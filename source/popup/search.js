function handleSearch(inputProfName) {
    const url = SEARCH_URL + encodeURIComponent(inputProfName.trim());
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const input = document.getElementById('search');
    input.focus();
    form.onsubmit = function(e) {
        e.preventDefault();
        handleSearch(input.value);
    };
});