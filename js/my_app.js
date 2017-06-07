// to do::
// filter - done
// categories - done
// choose categories - done
// search - done
// mobile - responsive stuff
// weather
// toggle bounce
// handle google load error
// UX


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
    this.dispay = function () {
        console.log(object);
        console.log('smth');
        console.log(self);
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
    //map = new google.maps.Map(document.getElementById('map'), { });
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
            animation:  google.maps.Animation.DROPб
        });
        googleMarkers.push(googleMarker);
        // if  marker.category does not exist in vm.POIcategories
        // POIcategories is UX drop down list to filter
        if (vm.POIcategories.indexOf(marker.category) == -1) {
            vm.POIcategories.push(marker.category)
        } 
    }
    
    //Constructor creates a new map - only center and zoom are required.
    // parse longitute /latititide from format "lat,long" - used for
    // FourSquare
    var coords = coords.split(',');
    // Draw map with passed coordinates
    map.setCenter({lat: Number(coords[0]), lng: Number(coords[1])});
    map.setZoom(5);
    // draw markers based on checkbox selection
    toggleMarkers();
 }
function clearGoogleMarkers() {
 for (var i=0;i<googleMarkers.length;i++) {
        googleMarkers[i].setMap(null);
    }
};

// main script body

vm = new ViewModel();
ko.applyBindings(vm);


// main script end

// event handlers

document.getElementById('address_btn').
    addEventListener('click', function() {
    goToLocationGoogleMaps();
});
