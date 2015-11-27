"use strict";

var data = {
  mapCenter: {lat: 53.339821, lng: -6.2362889999999425}, // default map center: Google, Ireland
  places: {},//ko.observableArray([]),
  filteredPlaces: ko.observableArray([]),
  categories: ['store'],
  icons: {},
  radius: 3000,
};

var view = {
  map: {},
  controls: [],
  infowindow: {center: {}, naighburhood: {}}, //clean up!!!
  markers: []
};

function initMap() {
  view.map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: data.mapCenter,
    zoom: 14,
    minZoom: 3,
    maxZoom: 18,
    mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.BOTTOM_LEFT
    }
  });
  view.infowindow = new google.maps.InfoWindow();
  view.infowindow.close();
  getCurrentLocation();
}

function getCurrentLocation() {
  markerControl.setMapOnAll(null);
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        data.mapCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        view.infowindow.open(view.map, view.markers[0]);
        view.infowindow.setContent('<div><strong>' + "You are Here!" + '</strong><br>' + 'based on browser data...');

        view.map.setCenter(data.mapCenter);
        getNearbyPlaces(data.mapCenter);
      }, function() {
        handleLocationError(true, view.infowindow, view.map.getCenter());
      });
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, view.infowindow, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  var defaultLocation = '<div><strong>' + "Default Location in case..." + '</strong><br>'
  view.infowindow.setPosition(pos);
  view.infowindow.setContent(browserHasGeolocation ?
      defaultLocation + 'Error: The Geolocation service failed.' :
      defaultLocation + 'Error: Your browser doesn\'t support geolocation.');
}

function autoComplete() {
  var input = /** @type {!HTMLInputElement} */(
      document.getElementById('search-bar'));
  var autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', view.map);
  autocomplete.addListener('place_changed', function() {
    markerControl.removeMarkers();
    view.infowindow.close();
    var place = autocomplete.getPlace();
    if (!place.geometry) {
      window.alert("Autocomplete's returned place contains no geometry");
      return;
    }
    markerControl.addMarker(place);
    //infowindowControl.addInfowindow(place);
    view.map.setCenter(place.geometry.location);
    data.mapCenter = {lat: view.map.getCenter().G, lng: view.map.getCenter().K};
    view.map.setZoom(14);
    getNearbyPlaces(data.mapCenter);
  });
}

var markerControl = {
  addMarker: function(place) {
    var marker = new google.maps.Marker({
      map: view.map,
      anchorPoint: new google.maps.Point(-6, -29)
    });
    if (place.lat == undefined) {
      marker.setIcon(/** @type {google.maps.Icon} */({
        url: place.icon,
        size: new google.maps.Size(25, 25),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      }));
      marker.setPosition(place.geometry.location);
    } else {
      marker.setIcon(({url: "https://maps.gstatic.com/mapfiles/place_api/icons/geocode-71.png"}));
      marker.setPosition(place);
      console.log(place);
    }
    view.markers.push(marker);
  },

  // Sets the map on all markers in the array.
  setMapOnAll: function(map) {
    for (var i = 0; i < view.markers.length; i++) {
      view.markers[i].setMap(map);
    }
  },

  // Removes the markers from the map, but keeps them in the array.
  clearMarkers: function() {
    markerControl.setMapOnAll(null);
  },

  // remove markers from the map
  removeMarkers: function() {
    markerControl.clearMarkers();
    view.markers = []
  }
}

var infowindowControl = {
  addInfowindow: function(place) {
    var address = '';
    if (place.address_components) {
      address = [
        (place.address_components[0] && place.address_components[0].short_name || ''),
        (place.address_components[1] && place.address_components[1].short_name || ''),
        (place.address_components[2] && place.address_components[2].short_name || '')
      ].join(' ');
    }

    view.infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address + '</div>');
    view.infowindow.open(view.map, view.markers[0]);
  }
}

function getNearbyPlaces(center) {
  var service = new google.maps.places.PlacesService(view.map);
  service.nearbySearch({
    location: center,
    radius: data.radius,
    types: data.categories
  }, processResults);
}

function processResults(results, status, pagination) {
  var placesList = document.getElementById('places');
  if (status !== google.maps.places.PlacesServiceStatus.OK) {
    return;
  } else {
    data.places = results;
    for (var i = 0, place; place = results[i]; i++) {
      markerControl.addMarker(place);
      placesList.innerHTML += '<li>' + place.name + '</li>';
    }

    if (pagination.hasNextPage) {
      var moreButton = document.getElementById('more');

      moreButton.disabled = false;

      moreButton.addEventListener('click', function() {
        moreButton.disabled = true;
        pagination.nextPage();
      });
    }
  }
}

initMap();
autoComplete();

$(function() {

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

//---------------------------------------------------------------------------------------------------------------------------
