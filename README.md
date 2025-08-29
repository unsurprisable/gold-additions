# GOLD Additions

### The Chrome Extension can be found at: [still under review]

***

![ezgif-6e133ed31c42ec](https://github.com/user-attachments/assets/def35bcf-9f39-4bc9-a49d-dc444d213503)

## Description
> Only applicable to students currently enrolled at the University of California, Santa Barbara!

GOLD Additions is a side-project of mine that's meant to simplify some tedious tasks I found myself doing while preparing my course schedule on GOLD.

Current features:
* Click a professor's name to instantly open a RateMyProfessor search
* Instantly export course schedule to a digital calendar (Outlook, Google, Apple, etc.)
* Lightweight: only runs on GOLD pages

I'm completely open to feature suggestions and will probably update the extension whenever I think of one!

> **DISCLAIMER**: This extension improves the user experience of GOLD, a service provided to students at the University of California, Santa Barbara (UCSB). If you are not a student enrolled at UCSB, this extension has no use. This is an independent project and is not affiliated with or endorsed by UCSB or RateMyProfessor.





## Installation
Get the extension from the Chrome Web Store: [still under review]
  
![ezgif-8ed1a734e0159e](https://github.com/user-attachments/assets/d1619285-80bc-49d2-9091-92c65d76035f)
***
## How It Works
The extension only functions while actively browsing https://my.sa.ucsb.edu/gold.

The program uses content scripts to read and write to the DOM. All functionality is gained by scraping the HTML data of the website; no external scripts or API calls are made. 

The RateMyProfessor implementation was quite simple. The program algorithmically locates all of the HTML elements that display a professor's name and simply replaces them with RateMyProfessor links instead.

The calendar implementation was quite a bit more complicated. If you check **source/scripts/cs_StudentSchedule** you can see that the file is quite large compared to the other content script... that's because it contains all of the JavaScript, HTML, and CSS related to generating and injecting the Schedule Exporter into the website. Could I have separated all of the HTML and CSS into their own file? honestly yeah probably but whatever 🤷‍♂️

(i'll probably put more here whenever i add a new feature)