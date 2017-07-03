# Udacity FSND Neighborhood map

## Project scope

The project was designed to be as flexible as possible. Accordingly, there are no "hard-coded" places - everything is pulled using APIs.

The algo is as following:
- App tries to obtain user location and if unsuccessful is waiting for user input to draw the map.
- When location is obtained app is using a 3-d party API (FourSquare) to retrieve a list of local POI's. User can specify how many records are needed.
- All POI data is pulled from FourSquare, accordingly some "weird" info maybe present which is solely how FourSquare has its data about the user location

## Responsive design

App has 2 breakpoints:
* small phone screen
* anything else
During testing I found the default desktop design sufficient for tablets as well.
Though for phones additional responsive layout is implemented improving user experience


## Installation

Run the app from any local server, Ex: python -m SimpleHTTPServer

## Programming patterns

Knockout.js was used to build UX. Direct DOM manipulation is implemented for responsive design features only.

