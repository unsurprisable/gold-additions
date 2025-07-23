function handleSearch(inputProfName) {
    const url = SEARCH_URL + encodeURIComponent(inputProfName.trim());
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const input = document.getElementById('search');
    input.focus(); // this makes it 100x more convenient by autoselecting the input automaticall;y :D
    form.onsubmit = function(e) {
        e.preventDefault();
        handleSearch(input.value);
    };
});