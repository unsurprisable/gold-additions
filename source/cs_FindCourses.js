(() => {
  // finds and replaces all instructor names with an <a/> element
  // redirecting to a RateMyProfessor search of their name
  console.log("Find Courses");

  const subjectArea = getSubjectArea();
  
  const instructorSpans = document.querySelectorAll(
    '.col-lg-search-instructor span[style*="word-wrap"]'
  );

  instructorSpans.forEach(span => {
    const profName = span.textContent?.trim();
    if (profName) {
      const searchParams = encodeURIComponent(`${profName} ${subjectArea}`)
      const ratemyprofURL = `https://www.ratemyprofessors.com/search/professors/1077?q=${searchParams}`;
      
      const link = document.createElement('a');
      link.href = ratemyprofURL;
      link.rel = 'noopener noreferrer';
      link.textContent = profName;
      link.target = '_blank';
      link.style = "white-space: nowrap;"

      span.replaceWith(link);
    }
  });

  function getSubjectArea() {
    const criteriaLabel = document.getElementById('pageContent_criteriaLabel')
    if (criteriaLabel) {
      const text = criteriaLabel.textContent || '';
      const match = text.match(/Subject Area\s*=\s*([^-,]*)/);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
    }
    return ''
  }
})();
