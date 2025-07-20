// idk how to import into content scripts so im just manually copy and pasting these 😭😭😭

function profNameIsValid(profName) {
  const invalidNames = ['cancel', 't.b.a', 't.b.a.'];
  const name = profName.toLowerCase().trim();
  return !invalidNames.includes(name);
}

function createRmpLink(profName) {
  const searchParams = encodeURIComponent(`${profName}`)
  const ratemyprofURL = `https://www.ratemyprofessors.com/search/professors/1077?q=${searchParams}`;

  const link = document.createElement('a');
  link.href = ratemyprofURL;
  link.rel = 'noopener noreferrer';
  link.textContent = `${profName}`;
  link.target = '_blank';
  link.style = "white-space: nowrap;"

  return link;
}