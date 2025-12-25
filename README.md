# GOLD Additions - [Chrome Extension]

* **NOTE: This extension can only be utilized by current students at the University of California, Santa Barbara**

![ezgif-6e133ed31c42ec](https://github.com/user-attachments/assets/def35bcf-9f39-4bc9-a49d-dc444d213503)

[GOLD Additions](https://chromewebstore.google.com/detail/dddhnnlmjoklomkkfcaegidmdbiijigl?utm_source=item-share-cb) is a fun little side-project of mine that's meant to simplify some tedious tasks I found myself doing while preparing my course schedule. The extension adds a few features to the GOLD webpage that can help students plan, create, and organize their class schedule. (I originally made the extension for myself but figured I might as well upload it since other people could benefit from it!)

Current features:
* Click a professor's name to instantly open a RateMyProfessor search
* Instantly export course schedule and final exams to a digital calendar (Outlook, Google, Apple, etc.)
* Lightweight: only runs on GOLD pages

I'm completely open to feature suggestions and will probably update the extension whenever I think of one! Additionally, feel free to contribute to the repository yourself! 

> **DISCLAIMER**: This extension improves the user experience of GOLD, a service provided to students at the University of California, Santa Barbara (UCSB). If you are not a student enrolled at UCSB, this extension has no use. This is an independent project and is not affiliated with or endorsed by UCSB or RateMyProfessor.

# Installation
Get the extension from the Chrome Web Store: [GOLD Additions](https://chromewebstore.google.com/detail/dddhnnlmjoklomkkfcaegidmdbiijigl?utm_source=item-share-cb)
  
![ezgif-8ed1a734e0159e](https://github.com/user-attachments/assets/d1619285-80bc-49d2-9091-92c65d76035f)

# How It Works
The extension only functions while actively browsing https://my.sa.ucsb.edu/gold.

The program uses content scripts to read and write to the DOM. All functionality is gained by scraping the HTML data of the website; no external scripts or API calls are made. 

The RateMyProfessor implementation was quite simple. The program algorithmically locates all of the HTML elements that display a professor's name and simply replaces them with RateMyProfessor links instead.

The calendar implementation was quite a bit more complicated. Basically, it injects a buttons into the Student Schedule webpage, and on click scrapes the webpage for course data like location and time, then organizes them into .ics format and outputs a file.

# Credits
All the [contributors](https://github.com/unsurprisable/gold-additions/graphs/contributors) of the project!

# Contributing
1. Create a [fork](https://github.com/unsurprisable/gold-additions/fork) of the repository.
2. Only commit using [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary).
3. Create a pull request using your fork.
4. You will be credited properly!

# License
This project is licensed under the [GNU General Public License v3.0](https://github.com/unsurprisable/gold-additions/blob/main/LICENSE).
