(() => {
  // finds and replaces all instructor names with an <a/> element
  // redirecting to a RateMyProfessor search of their name
  console.log("Find Courses");
  
  const instructorSpans = document.querySelectorAll(
    '.col-lg-search-instructor span[style*="word-wrap"]'
  );

  instructorSpans.forEach(span => {
    const profName = span.textContent?.trim();
    if (profName && profNameIsValid(profName)) {
      const link = createRmpLink(profName);
      span.replaceWith(link);
    }
  });
})();



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
