(() => {
  // finds and replaces all instructor names with an <a/> element
  // redirecting to a RateMyProfessor search of their name
 
  //#region Find Courses
  if (window.location.href.startsWith("https://my.sa.ucsb.edu/gold/ResultsFindCourses.aspx")) {
    const instructorSpans = document.querySelectorAll(
        '.col-lg-search-instructor span[style*="word-wrap"]'
    );
    
    console.log(instructorSpans.length)

    instructorSpans.forEach(span => {
        const profName = span.textContent?.trim();
        if (profName) {
        const ratemyprofURL = `https://www.ratemyprofessors.com/search/professors/1077?q=${encodeURIComponent(profName)}`;
        
        const link = document.createElement('a');
        link.href = ratemyprofURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = profName;
        link.style.color = '#0077cc';

        span.replaceWith(link);
        }
    });
    }
    //#endregion
})();
