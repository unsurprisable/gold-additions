# GOLD x RateMyProfessor
Allows you to click on professor's names in GOLD to instantly view their RateMyProfessor page.

***

![ezgif-6e133ed31c42ec](https://github.com/user-attachments/assets/def35bcf-9f39-4bc9-a49d-dc444d213503)

## This extension only works for UCSB's GOLD registration system!

If you are not a student at UC Santa Barbara... 

go away 🤢

## Installation
sorry but im not paying $5 to upload it to the chrome web store 😭

1. Click on the green "<> Code" button at the top and click [Download ZIP](https://github.com/unsurprisable/gold-rmp-extension/archive/refs/heads/main.zip) (or this link)
2. Save the ZIP file and Extract it
3. Open Chrome and type [chrome://extensions]() into the search bar
4. On the top right, flip the "Developer mode" switch so that it's enabled
5. Click "Load unpacked" at the top left and select the "source" folder in the extracted ZIP file.
6. shabang that's it, just remember if you move the folder you'll have to re-do Step 5.

## How to Use
* Just click on the professor's name.
* This works for all courses listed on the "MY SCHEDULE" and "FIND COURSES" pages.
* Unfortunately, RateMyProfessor's search isn't perfect and your professor sometimes won't be the very first result.
  
![ezgif-8ed1a734e0159e](https://github.com/user-attachments/assets/d1619285-80bc-49d2-9091-92c65d76035f)
***
## How It Works
The extension only functions while actively browsing https://my.sa.ucsb.edu/gold.

The program simply searches for the exact HTML elements that typically display the professors' names. Once it finds one, the original element gets replaced with a link to a RateMyProfessor search of that professor's name. Nothing else is modified and there is no visual indication other than the names being clickable.

In the future, I'd like to add a little icon next to professors' names that displays their ratings directly on GOLD, but as of now I don't believe RateMyProfessor hosts any API endpoints that would enable me to add something like that.

## uhhh
maybe ill start a $5 gofundme to add this to the chrome web store

lmk 👍

