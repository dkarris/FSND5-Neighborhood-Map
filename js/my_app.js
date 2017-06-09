// to do::
// filter - done
// categories - done
// choose categories - done
// search - done
// mobile - responsive stuff
// toggle bounce - done
// handle google load error - done
// UX - done


// FourSquare API stuff
var fourSquare_CLIENT_ID = "E31EX22E0IKTMUUBARAYI51DAR3YSPQPBANLYH5SRCPHYUE1";
var fourSquare_CLIENT_SECRET = "PWO4MWWSEP0CSCK250VWZFKKNTQIJHQEYTQH2KQ1GHCT2AOK";

// Google map and objects
var map;
var googleMarkers=[];

// model object for coordinates
var coords;

// model object for POI
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
        this.address = this.address + '<BR>' + element
    },this)
};

// View model definition
var ViewModel = function() {
    var self = this;
    this.markers =  ko.observableArray([]); // actually not required to be in vm
    this.markersFiltered = ko.observableArray([]);
    this.showMarkers = ko.observable(true);
    this.showMarkers.subscribe(toggleMarkers);
    this.limitPOIoptions = ['1','5','10','15','25','50','100'];
    this.limitPOI = ko.observable(this.limitPOIoptions[2]);
    this.limitPOI.subscribe(function(newLimitPOI){
        loadFourSquareObjects(coords,newLimitPOI);
    })
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
    })
    this.display = function (data, event) {
        var index = ko.contextFor(event.target).$index();
        google.maps.event.trigger(googleMarkers[index],'click');
    }
};

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
     };

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
        // and vm/markers is used to restore it back
        vm.markersFiltered(vm.markers.slice()); 
        drawGoogleMap(coordinates, vm.markers());
    });
}
function applyCategoryFilter(filterValue) {
// clear filtered array and loop through main markers filtering criteria
    if (filterValue) {
        vm.markersFiltered.removeAll(); 
        vm.markers().forEach(function (marker){
            if (marker.category == filterValue) {
                vm.markersFiltered.push(marker);
            }
        })
    } else {
        // restore back from the original array
        vm.markersFiltered(vm.markers.slice());
    }
    drawGoogleMap(coords,vm.markersFiltered());
}
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
]
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
            vm.POIcategories.push(marker.category)
        } 
        googleMarker.addListener('mouseover', function() {
            this.setIcon(highlightedIcon);
        });
        googleMarker.addListener('mouseout', function() {
            this.setIcon(defaultIcon);
        })
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
    goToPlace.bindTo('bounds', map)
 }
function clearGoogleMarkers() {
 for (var i=0;i<googleMarkers.length;i++) {
        googleMarkers[i].setMap(null);
    }
};

function googleLoadError() {
    alert ('Google maps failed to load. Aborting. Please check your network connectivity')
}

// This function takes in a COLOR, and then creates a new marker
      // icon of that color. The icon will be 21 px wide by 34 high, have an origin
      // of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
       'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
       '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21,34));
    return markerImage;
}



// main script body


    vm = new ViewModel();
    ko.applyBindings(vm);


// main script end

// event handlers outside functions / MVC

document.getElementById('address_btn').
    addEventListener('click', function() {
    goToLocationGoogleMaps();
});
