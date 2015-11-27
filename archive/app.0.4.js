"use strict";

function nhViewModel() {
  // viewModel for knockout.js
  var self = this,
      map,
      infowindow,
      mapBounds,
      mapCenter = {lat: 53.339821, lng: -6.2362889999999425}; // default map center

  self.places = ko.observableArray([]); //container for nearby places objects
  self.markers = ko.observableArray([]); //container for marker objects
  self.categories = ko.observableArray([]); //categries for nearby search
  self.icons = ko.observableArray([{icon: "https://maps.gstatic.com/mapfiles/place_api/icons/bar-71.png"}, {icon: "https://maps.gstatic.com/mapfiles/place_api/icons/cafe-71.png"}]); //marker icons for filtering
  self.radius = ko.observable(1000); //neighborhood radius
  self.switchInfoBox = ko.observable(true);
  self.listBoolean = ko.observable(true);


  self.clickMarker = function() {}

  function getRateStar(rate) {
    var img = {
      25: "images/rate-2.5.png",
      30: "images/rate-3.0.png",
      35: "images/rate-3.5.png",
      40: "images/rate-4.0.png",
      45: "images/rate-4.5.png",
      50: "images/rate-5.0.png",
    }
    console.log(img[(Math.round(rate*2)/2) *10]);
    return img[(Math.round(rate*2)/2) *10];

  }
  /** Google Map API related functions
  *
  *
  *
  *
  */
  function initMap() {
    // initialize the map
    var mapOptions = {
      //zoom: 14,
      minZoom: 3,
      maxZoom: 18,
      mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.BOTTOM_LEFT
      }
    };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    var geocoder = new google.maps.Geocoder;
    infowindow = new google.maps.InfoWindow();
    map.setCenter(mapCenter);
  }

  function getCurrentLocation() {
    // Locate user
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          mapCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          initNeighbourhood(mapCenter);
          map.setCenter(mapCenter);
          infowindow.close();

        }, function() {
          handleLocationError(true, infowindow, map.getCenter());
        });
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infowindow, map.getCenter());
      }
  }

  function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    // Handle geolocation errors
    initNeighbourhood(pos);
    var defaultLocation = '<div><strong>' + "Default Location in case..." + '</strong><br>'
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        defaultLocation + 'Error: The Geolocation service failed.' :
        defaultLocation + 'Error: Your browser doesn\'t support geolocation.');
  }

  function autoComplete() {
    // Autocompete search
    var input = /** @type {!HTMLInputElement} */(
        document.getElementById('search-bar'));
    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();
    if (!place.geometry) {
      window.alert("Autocomplete's returned place contains no geometry");
      return;
    }
    initNeighbourhood(place.geometry.location);
    addMarker(place);
    addInfowindow(place);
    });
  }

  function addMarker(place) {
    var marker = new google.maps.Marker({
      map: map,
      anchorPoint: new google.maps.Point(-6, -29)
    });
    marker.setIcon(/** @type {google.maps.Icon} */({
      url: place.icon,
      size: new google.maps.Size(25, 25),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(25, 25)
    }));
    marker.setPosition(place.geometry.location);
    self.markers.push(marker);
  }

  // Sets the map on all markers in the array.
  function setMapOnAll(map) {
    for (var i = 0; i < self.markers.length; i++) {
      self.markers[i].setMap(map);
    }
  }

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers() {
    setMapOnAll(null);
  }

  // remove markers from the map
  function removeMarkers() {
    clearMarkers();
    self.markers = []
  }

  function addInfowindow(place) {
    // add infowindow
    var address = '';
    if (place.address_components) {
      address = [
        (place.address_components[0] && place.address_components[0].short_name || ''),
        (place.address_components[1] && place.address_components[1].short_name || ''),
        (place.address_components[2] && place.address_components[2].short_name || '')
      ].join(' ');
    }
    infowindow.setContent('<div>\
                            <strong>' + place.name + '</strong><br>' + place.formatted_address +
                          '</div>'

  );
    infowindow.open(map, self.markers[0]);
  }

  function getNearbyPlaces() {
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
      location: mapCenter,
      radius: self.radius(),
      types: self.categories()
    }, processResults);
  }

  function processResults(results, status, pagination) {
    var bounds = new google.maps.LatLngBounds();
    var placesList = document.getElementById('places');
    if (status !== google.maps.places.PlacesServiceStatus.OK) {
      return;
    } else {
        for (var i = 0, place; place = results[i]; i++) {
          self.places.push(place);
          addMarker(place);
          bounds.extend(place.geometry.location);
      }
      map.fitBounds(bounds);
    }
  }


  function initNeighbourhood(center) {
    removeMarkers();
    map.setCenter(center);
    infowindow.open(map)
    infowindow.setPosition(center);
    getNearbyPlaces(center);
    map.setZoom(14);
  }

  initMap();
  autoComplete();
  getCurrentLocation();
}

$(function() {
  ko.applyBindings(new nhViewModel());
  $('[group~=controls]').show(1000);
  $('#hide').click(function() {
      var glyph = '', currentGlyph = $(this).children('span').attr('class');
      if (currentGlyph.slice(29) === 'left') {
        glyph = currentGlyph.replace('left', 'right')
      }
      else {
        glyph = currentGlyph.replace('right', 'left')
      }

      $(this).siblings('div').animate({width: "toggle"}, 500);
      $(this).children('span').attr('class', glyph);
    });
});
