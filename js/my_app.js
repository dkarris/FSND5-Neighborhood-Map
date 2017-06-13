/** Udacity FSND Project 5 Neighborhood map */

/** defining FourSquare API variables */
var fourSquare_CLIENT_ID = "E31EX22E0IKTMUUBARAYI51DAR3YSPQPBANLYH5SRCPHYUE1";
var fourSquare_CLIENT_SECRET = "PWO4MWWSEP0CSCK250VWZFKKNTQIJHQEYTQH2KQ1GHCT2AOK";

/** defining Google Maps API variables */
var map;
var googleMarkers=[];
// model object for coordinates
var coords;

/**  marker class 
@constructs marker object
@param markerData - data from FourSquare API 
*/
var marker = function(markerData) {
    this.id = markerData.id;
    this.name = markerData.name;
    if (markerData.categories.length !== 0) {
      this.category = markerData.categories[0].name;
    }  else {
      this.category = "Not present in FourSquare db";
    }
    this.phone = markerData.contact.formattedPhone;
    this.latitude = markerData.location.lat;
    this.longitude = markerData.location.lng;
    this.address = '';
    markerData.location.formattedAddress.forEach(function(element) {
        this.address = this.address + '<BR>' + element;
    },this);
};

/** 
@constructs ViewModel for the app
*/
var ViewModel = function() {
    var self = this;
    this.markers =  ko.observableArray([]); 
    this.markersFiltered = ko.observableArray([]);
    this.showMarkers = ko.observable(true);
    this.showMarkers.subscribe(toggleMarkers);
    this.limitPOIoptions = ['1','5','10','15','25','50','100'];
    this.limitPOI = ko.observable(this.limitPOIoptions[2]);
    this.limitPOI.subscribe(function(newLimitPOI){
        loadFourSquareObjects(coords,newLimitPOI);
    });
    this.POIcategories = ko.observableArray([]); // will get populated with FourSquare POI categories
    this.filterCategory = ko.observable();
    this.filterCategory.subscribe(applyCategoryFilter);
    this.query = ko.observable('');
    this.query.subscribe(function (searchValue){
        // if searchValue is empty restore the original list else 
        // apply filter to markersFilter
        if (!searchValue) {
            self.markersFiltered(self.markers.slice());
        } else {
            self.markersFiltered.removeAll();
            for (var marker of self.markers()) {
                if (marker.name.toLowerCase().indexOf(searchValue.toLowerCase()) >=0) {
                    self.markersFiltered.push(marker);
                }
            }
        }
        drawGoogleMap(coords,self.markersFiltered());
    });
    this.display = function (data, event) {
        var index = ko.contextFor(event.target).$index();
        google.maps.event.trigger(googleMarkers[index],'click');
    };
};

/**
@description toggles markes on/off depending on previous state
*/
function toggleMarkers() {
        if (vm.showMarkers() === true) {
            // set status to visible - initiate info window and googleMarkers array
            var infoWindow = new google.maps.InfoWindow();
            var bounds = new google.maps.LatLngBounds();
            for (var i=0; i<googleMarkers.length; i++) {
                googleMarkers[i].setMap(map);
                bounds.extend(googleMarkers[i].position);
                googleMarkers[i].addListener('click', function() {
                    if (this.getAnimation() !== null) {
                        this.setAnimation(null);
                    } else {
                        this.setAnimation(google.maps.Animation.BOUNCE);
                    }
                    populateInfoWindow(this, infoWindow);
                });
            }
            map.fitBounds(bounds);
        } else {
            /// set status to hidden => call clearMarkers
            clearGoogleMarkers();
        }   
     }

/**
@description passes marker information to infowindow to open on the map
@param {marker} googleMarker
@param {infowindow} infowindow
@returns {nothing} draws data from marker object into infowindow associated with that marker
*/
function populateInfoWindow(googleMarker, infowindow) {
    // check if infoWindow is opened
    if (infowindow.marker != googleMarker) {
        infowindow.marker = googleMarker;
        var windowContent = '<div id="windowContent_category"> Category: ' + googleMarker.category + '</div>' +
                            '<BR><div id="windowContent_name"> Name: ' + googleMarker.title + '</div>' + 
                            '<BR><div id="windowContent_phone">Phone: ' + googleMarker.phone + '</div>' + 
                            '<BR><div id="windowContent_address">Address: '+ googleMarker.address + '</div>';
        infowindow.setContent(windowContent);
        infowindow.open(map,googleMarker);
        // if closed - clear the content
        infowindow.addListener('closeclick', function() {
            googleMarker.setAnimation(null);
            infowindow.marker = null;
        });
    }
}

/**
@description display map centered on the location passed from address_text
then calls FourSquare API to retrieve data about the local POI's
*/
function goToLocationGoogleMaps() {
    // initialize the geocode
    var geocoder = new google.maps.Geocoder();
    // get the address
    var address = document.getElementById('address_text').value;
    // if blank dispay error message and do nothing
    if (address === '') {
        window.alert('Address line is blank. Please enter something to search');
    } else {
        // geocode the address
        geocoder.geocode({'address':address},
                function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                // unpack coordinates to pass into fourSquares api
                coords = results[0].geometry.location.lat() + "," + results[0].geometry.location.lng();
                loadFourSquareObjects(coords, vm.limitPOI());
            } else {
                window.alert ('Address is not found');
            }
        });
    }
}


/**
@description triggers ajax to FourSquare API 
@param {coordinates} passed from google maps 
@param {number} maximum amount of POI's to retrieve
@returns populates filtered markers array and calls drawGoogleMap to actually display map and markers
*/
function loadFourSquareObjects(coordinates,records) {
    var fourSquare_urlAPI = "https://api.foursquare.com/v2/venues/search?" +
                        "client_id="+fourSquare_CLIENT_ID + "&client_secret=" +
                        fourSquare_CLIENT_SECRET + "&v=20170101&ll="+coordinates + "&limit="+records;
    // clear markers location array before reseting the map
    vm.markers().length = 0;
    $.getJSON(fourSquare_urlAPI, function successGetFromFourSquare(response){
        $.each(response.response.venues, function loadMarkers(key,value){
            vm.markers.push(new marker(value));
        });
        // save vm.markers array to filteredMarkers array so that we work with filteredMarkers
        // and vm.markers is used to restore it back
        vm.markersFiltered(vm.markers.slice()); 
        drawGoogleMap(coordinates, vm.markers());
    });
}

/** 
@description filters markers area bases on user selection
@param {text} category name
*/
function applyCategoryFilter(filterValue) {
// clear filtered array and loop through main markers filtering criteria
    if (filterValue) {
        vm.markersFiltered.removeAll(); 
        vm.markers().forEach(function (marker){
            if (marker.category == filterValue) {
                vm.markersFiltered.push(marker);
            }
        });
    } else {
        // restore back from the original array
        vm.markersFiltered(vm.markers.slice());
    }
    drawGoogleMap(coords,vm.markersFiltered());
}

/**
@description tries to get current user location if unsuccesfull fallsback to user manual location input
*/
function loadCurrentLocation() {
    map = new google.maps.Map(document.getElementById('map'), { });
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(coordinates) {
          coords = coordinates.coords.latitude+"," + coordinates.coords.longitude;
          loadFourSquareObjects(coords, vm.limitPOI());
        }, function(error) {
            alert('Was not able to load current location. Please use address search bar to center Google Maps on your location');
          });
      } else {
          alert('GPS functionality is not working. Please use address search bar to center Google Maps on your location');
    }
}


/**
@description google initialize function.
@param {coords} coordinate to draw the map
@param {marker array} is used to populate googleMarkers and POI UX filter
@returns sets google maps, markers , listeners, etc.
*/
function drawGoogleMap(coords,markers) {
    // set markers style
    var defaultIcon = makeMarkerIcon('0091ff');
    var highlightedIcon = makeMarkerIcon('FFFF24');
    // set style
     var style = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#ff4400"
            },
            {
                "saturation": -68
            },
            {
                "lightness": -4
            },
            {
                "gamma": 0.72
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.icon"
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#0077ff"
            },
            {
                "gamma": 3.1
            }
        ]
    },
    {
        "featureType": "water",
        "stylers": [
            {
                "hue": "#00ccff"
            },
            {
                "gamma": 0.44
            },
            {
                "saturation": -33
            }
        ]
    },
    {
        "featureType": "poi.park",
        "stylers": [
            {
                "hue": "#44ff00"
            },
            {
                "saturation": -23
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "hue": "#007fff"
            },
            {
                "gamma": 0.77
            },
            {
                "saturation": 65
            },
            {
                "lightness": 99
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "gamma": 0.11
            },
            {
                "weight": 5.6
            },
            {
                "saturation": 99
            },
            {
                "hue": "#0091ff"
            },
            {
                "lightness": -86
            }
        ]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": -48
            },
            {
                "hue": "#ff5e00"
            },
            {
                "gamma": 1.2
            },
            {
                "saturation": -23
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "saturation": -64
            },
            {
                "hue": "#ff9100"
            },
            {
                "lightness": 16
            },
            {
                "gamma": 0.47
            },
            {
                "weight": 2.7
            }
        ]
    }
];
    // Create googleMarkers global array for the area buf first clear any residues from the previos searches in googleMarkers
    clearGoogleMarkers(); 
    googleMarkers.length = 0;
    // clear POICategories if exist from the previous searches
    vm.POIcategories().length = 0;
    // now loop through new set and create data
    // console.log('google got the following set');
    // console.log(markers);
    for (let marker of markers) {
        var googleMarker = new google.maps.Marker({
            position:   {lat:marker.latitude, lng:marker.longitude},
            title:      marker.name,
            category:   marker.category,
            phone:      marker.phone,
            address:    marker.address,
            animation:  google.maps.Animation.DROP,
            icon: defaultIcon
        });
        googleMarkers.push(googleMarker);
        // if  marker.category does not exist in vm.POIcategories
        // POIcategories is UX drop down list to filter
        if (vm.POIcategories.indexOf(marker.category) == -1) {
            vm.POIcategories.push(marker.category);
        } 
        googleMarker.addListener('mouseover', function() {
            this.setIcon(highlightedIcon);
        });
        googleMarker.addListener('mouseout', function() {
            this.setIcon(defaultIcon);
        });
    }
    
    // Constructor creates a new map - only center and zoom are required.
    // parse longitute /latititide from format "lat,long" - used for
    // FourSquare
    var coords = coords.split(',');
    // Draw map with passed coordinates
    map.setCenter({lat: Number(coords[0]), lng: Number(coords[1])});
    map.setZoom(5);
    map.setOptions({styles : style});
    // draw markers based on checkbox selection
    toggleMarkers();

    // assign auto-complete to button
    var goToPlace = new google.maps.places.Autocomplete(
        document.getElementById('address_text'));
    goToPlace.bindTo('bounds', map);
 }

/**
@description clears googleMarkers array when applying new filters or redrawing map at new location
*/
function clearGoogleMarkers() {
 for (var i=0;i<googleMarkers.length;i++) {
        googleMarkers[i].setMap(null);
    }
}

/**
@description handles google load error 
*/
function googleLoadError() {
    alert ('Google maps failed to load. Aborting. Please check your network connectivity');
}


/**
@description simple setup for markers appearance. Borrowed from google api docs
*/
function makeMarkerIcon(markerColor) {
    // This function takes in a COLOR, and then creates a new marker
    // icon of that color. The icon will be 21 px wide by 34 high, have an origin
    // of 0, 0 and be anchored at 10, 34).
    var markerImage = new google.maps.MarkerImage(
       'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
       '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21,34));
    return markerImage;
}

/** main script body */
    vm = new ViewModel();
    ko.applyBindings(vm);
/** main script end
  event handlers outside functions / MVC */
document.getElementById('address_btn').
    addEventListener('click', function() {
    goToLocationGoogleMaps();
});

/** event handlers to implement DOM manipulation for responsive design layout */
function openMenu() {
    document.getElementById("POI_list").style.width = "90%";
    document.getElementById("elements_wrapper").style.display = "block";
    document.getElementById("btn_menu").style.display = "none";
}
function closeMenu() {
    document.getElementById("POI_list").style.width = "30%";
    document.getElementById("elements_wrapper").style.display = "none";
    document.getElementById("btn_menu").style.display = "block";
}

/* Script end */