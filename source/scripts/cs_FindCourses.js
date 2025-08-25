(() => {
  console.log("Find Courses");
  
  // Replacing professor names with links
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
