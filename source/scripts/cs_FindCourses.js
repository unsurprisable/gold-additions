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
