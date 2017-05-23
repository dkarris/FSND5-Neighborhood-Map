var fourSquare_CLIENT_ID = "E31EX22E0IKTMUUBARAYI51DAR3YSPQPBANLYH5SRCPHYUE1";
var fourSquare_CLIENT_SECRET = "PWO4MWWSEP0CSCK250VWZFKKNTQIJHQEYTQH2KQ1GHCT2AOK";
var map;
var googleMarkers = [];
//
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
    // to do add address for each here with foreach JS
};


// View model definition
var ViewModel = function() {
    var self = this;
    this.zipCode = ko.observable();
    this.markers =  ko.observableArray([]);
    this.showMarkers = ko.observable(false);
    this.showMarkers.subscribe(toggleMarkers);
};

function toggleMarkers() {
        if (vm.showMarkers() === true) {
            /// set status to visible
            for (var i=0; i<googleMarkers.length; i++) {
                googleMarkers[i].setMap(map);
            }
        } else {
            /// set status to hidden
            for (var i=0; i<googleMarkers.length; i++) {
                googleMarkers[i].setMap(null);
            }
        }   
     };

// main script body

vm = new ViewModel;
ko.applyBindings(vm);

document.getElementById('address_btn').
    addEventListener('click', function() {
    goToLocationGoogleMaps();
});
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
                var coords = results[0].geometry.location.lat() + "," + results[0].geometry.location.lng();
                loadFourSquareObjects(coords);
            } else {
                window.alert ('Address is not found');
            }
        });
    }
}
function loadFourSquareObjects(coordinates) {
    var fourSquare_urlAPI = "https://api.foursquare.com/v2/venues/search?" +
                        "client_id="+fourSquare_CLIENT_ID + "&client_secret=" +
                        fourSquare_CLIENT_SECRET + "&v=20170101&ll="+coordinates + "&limit=10";
    $.getJSON(fourSquare_urlAPI, function successGetFromFourSquare(response){
        $.each(response.response.venues, function loadMarkers(key,value){
            //console.log(value);
            vm.markers.push(new marker(value));
        });
        drawGoogleMap(coordinates, vm.markers());
    });
}
function loadCurrentLocation() {
    map = new google.maps.Map(document.getElementById('map'), { });
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(coordinates) {
          var coords = coordinates.coords.latitude+"," + coordinates.coords.longitude;
          loadFourSquareObjects(coords);
        }, function(error) {
            alert('Was not able to load current location. Please use address search bar to center Google Maps on your location');
          });
      } else {
          alert('GPS functionality is not working. Please use address search bar to center Google Maps on your location');
    }
}
function drawGoogleMap(coords,markers) {
    //Constructor creates a new map - only center and zoom are required.
    // parse longitute /latititide from format "lat,long" - used for
    // FourSquare
    var coords = coords.split(',');
    // Draw map with passed coordinates
    map.setCenter({lat: Number(coords[0]), lng: Number(coords[1])});
    map.setZoom(15);
    // Create markers for the area
    for (let marker of markers) {
        var googleMarker = new google.maps.Marker({
            position:   {lat:marker.latitude, lng:marker.longitude},
            title:      marker.name 
        });
        googleMarkers.push(googleMarker);
    }
    toggleMarkers();
 }