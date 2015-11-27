  /*
    Adding modulus methode to Number.
    In JavaScript "%"-called modulus by many programmer and sites like W3Schools, but it's really a remainder function
    and it DOES NOT behave like modulus with negative numbers.
    Remainder: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Arithmetic_Operators#Remainder_()
    Difference explained in details here: http://www.sitecrafting.com/blog/modulus-remainder
    NOTE: needed for the function getOpeningHrs() line 481.

  */
  Number.prototype.mod = function(n) { return ((this%n)+n)%n; }

  $(function() {

    function nhViewModel() {
      // viewModel for knockout.js
      var self = this,
          map,
          infowindow,
          mapCenter = {lat: 42.3601, lng: -71.0589}, // default map center
          categories = [],
          //styles = [],
          styledMap,
          marker_animation = null
          today = new Date();

      var winWidth = $( window ).width();

      self.nearByPlaces = ko.observableArray([]); //container for object returned by google map places API nearby search service
      self.places = ko.observableArray([]); //container for object returned by google map places API searchBox service
      self.markers = ko.observableArray([]); //container for marker objects
      self.radius = ko.observable(2000); //neighborhood radius
      self.keyword = ko.observable(""); //keyword to filter markers and places
      self.placeReviews = ko.observableArray([]); //container for place review objects returned by google map places API getDetails() service
      self.placePhotos = ko.observableArray([]); //container for place photo urls returned by google map places API getDetails() service
      self.placeInFocus = ko.observable(); //place object container when opening photos and reviews via infowindows
      self.foursquarePlaces = ko.observableArray([]); //container for foursquare API objects

      self.address = function(place) {
        /*
          return place address from place object
        */
        if (place.vicinity) {
          return place.vicinity;
        } else {
          return place.formatted_address;
        }
      };

      self.icons = ko.computed(function() {
        /*
          return icons for the btn-toolbar
        */
        var iconSet = new Set();
        var iconDict = [];


        for (var idx in self.nearByPlaces()) {
          if (idx) {
          	iconSet.add(self.nearByPlaces()[idx].icon);
          }
        }

        iconSet.forEach(function(icon) {
          iconDict.push({"icon": icon});
        });

        return iconDict.slice(0, 8);
      });

      self.rateImg = function(rating) {
        /*
          chain together the rating stars based on place rating.
        */
        var rating = Math.round(rating * 2)/2;
        var imgHolder = [];

        for (var i = 0; i < parseInt(rating); i++) {
          imgHolder.push({"star" : "images/full-star.png"});
        }

        if (rating - parseInt(rating) !== 0) {
          imgHolder.push({"star" : "images/half-star.png"});
        }

        for (i = 0; i < parseInt(5 - rating); i++){
          imgHolder.push({"star" : "images/empty-star.png"});
        }
        return imgHolder;
      };

      self.displayedPlaces = function() {
        /*
          filter markers and places based on keyword
        */
        var places = [],
            keyword = self.keyword().toLowerCase(),
            actualPlaces = [],
            width = window.innerWidth;

        if (self.places().length < 2) {
          actualPlaces = self.nearByPlaces();
        } else {
          actualPlaces = self.places();
        }

        if (self.keyword() !== "") {
          for (var idx in actualPlaces) {

            if (actualPlaces[idx].name.toLowerCase().indexOf(keyword) != -1 ||
                actualPlaces[idx].types[0].toLowerCase().indexOf(keyword) != -1) {
                  marker_animation = null;
                  places.push(actualPlaces[idx]);
            }
          }
        } else {
            if (width < 500) {
              places = actualPlaces.slice(0, 12); //number of hits reduced for smaller device.
            }
            else {
              places = actualPlaces
            }

        }
        addMarkers(places);
        return places;
      };

      self.formattedType = function(data) {
        /*
         replace "_ & -" to space and first letter to uppercase in place type
         example: art_gallery => Art gallery
        */
        var formattedType = data.types[0].replace(/[_-]/g, " ");
        return formattedType.charAt(0).toUpperCase() + formattedType.substr(1, formattedType.length);
      };

      function initMap() {
        /*
          google map initialization
        */
        var mapOptions = {
          center: mapCenter,
          zoom: 14,
          minZoom: 3,
          maxZoom: 18,
          disableDefaultUI: true
        };

        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        infowindow = new google.maps.InfoWindow({
          pixelOffset: new google.maps.Size(-23, -10),
        });

        marker_animation = google.maps.Animation.DROP;
        styledMap = new google.maps.StyledMapType(styles,{name: "Styled Map"});
        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');

      }

      initMap();

      function getCurrentLocation() {
        /*
          Locate user using geolocation
        */
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              mapCenter = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setCenter(mapCenter);
              getNearbyPlaces(mapCenter);
            }, function() {
              handleLocationError(true, infowindow, map.getCenter());
            });
          } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infowindow, map.getCenter());
            getNearbyPlaces(mapCenter);
          }
      }

      function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        // Handle geolocation errors
        getNearbyPlaces(mapCenter);
      }

      getCurrentLocation();

      function getNearbyPlaces(center) {
        /*
          google maps places API search pagination request
        */
        self.nearByPlaces([]);

        var service = new google.maps.places.PlacesService(map);
          service.nearbySearch  ({
          location: center,
          radius: self.radius(),
          types: categories
        }, processResults);
      }

      function processResults(results, status, pagination) {
        var bounds = new google.maps.LatLngBounds();
        //var placesList = document.getElementById('places');
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          return;
        } else {
            for (var i = 0, place; place = results[i]; i++) {
              if (place.types[place.types.length - 1] != "political") {
                self.nearByPlaces.push(place);
                bounds.extend(place.geometry.location);
              }
            }
          map.fitBounds(bounds);
        }
        categories = [];
      }

      function initAutocomplete() {
        /*
          google maps places API autocomplete service
        */
        self.places([]);
        // Create the search box and link it to the UI element.
        var input = document.getElementById('search-input');
        var searchBox = new google.maps.places.SearchBox(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function() {
          searchBox.setBounds(map.getBounds());
          mapCenter = map.getCenter();
        });

        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', boxSearch);
        categories = [];

        function boxSearch() {
          var searchedPlaces = searchBox.getPlaces();
          self.places(searchedPlaces);

          if (self.places().length === 0) {
            return;
          }
          else if (self.places().length == 1) {
            getNearbyPlaces(self.places()[0].geometry.location);
            self.nearByPlaces().push(searchedPlaces[0]);
          }
          else {
            var bounds = new google.maps.LatLngBounds();
            self.places().forEach(function(place) {
              bounds.extend(place.geometry.location);
              map.fitBounds(bounds);
            });
          }
          document.getElementById('search-input').value = "";
          self.keyword("");
          marker_animation = google.maps.Animation.DROP;
        }
      }

      initAutocomplete();

      function addMarkers(places) {
        /*
          add markers to the map
        */
        var iconSize = Math.sqrt($(window).width()) + 20;

        self.markers().forEach(function(marker) {
          // Clear out the old markers.
          marker.setMap(null);
        });
        self.markers([]);

        // For each place, get the icon, name and location.
        places.forEach(function(place) {
          var icon = {
            url: place.icon,
            size: new google.maps.Size(iconSize, iconSize),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(iconSize/4, iconSize/2),
            scaledSize: new google.maps.Size(iconSize / 2.8, iconSize / 2.8)
          };

          // Create a marker for each place.
          var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name,
                animation: marker_animation,
                position: place.geometry.location
              }),
              width = window.innerWidth,
              height = window.innerHeight,
              offsetX = 150,
              offsetY = - height / 5;

          if (width < 800) {
            offsetX = -20;
            offsetY = -1 * (height / 2 - 100)
          }

          marker.addListener('click', function() {
            self.markers().forEach(function(marker) {
              marker.setAnimation(null);
            });

            if (marker.getAnimation() !== null) {
              marker.setAnimation(null);
            } else {
              marker.setAnimation(google.maps.Animation.BOUNCE);
              map.panTo(marker.position);
              map.panBy(offsetX, offsetY);
            }
          });

          self.markers().push(marker);

          google.maps.event.addListener(marker, 'click', function() {
            addInfowindow(place, marker);
          });
        });
      }

      function addInfowindow(place, marker) {
        /*
          get details about place corresponded to the clicked marker and build the infowindow
        */
        var service = new google.maps.places.PlacesService(map);
        var infoWidth = 200;
        if ($(window).width() < 800) {
          infoWidth = 170;
        }
        service.getDetails({
          placeId: place.place_id
        }, function (place, status) {
          getFourSquare(place);
          getWikiExtract(place);
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            infowindow.setContent(
              /*
                dynamically generated info window content
              */
              '<div id="infoWindow" style="width:' + infoWidth + 'px; font-size: 14px; display: none;"><p><h3>' + place.name + '</h3></p>' +
              '<hr>' +
              '<p><span style="font-size: 14px">' + place.formatted_address + '</span></p>' +

              '<p><span style="color: #4a7ea7; font-weight: bold;">' + getOpeningHrs(place)  + '</span></p>'+
              '<br>' +
              '<div id="wiki" style="white-space: normal;"><span></span></div>' +
              '<hr>' +
              getRating(place) +  getPhotoes(place) + '</div></p>' +
              '<p><span>' + getPhone(place) + '</span></p>' +
              '<p><div class="longtext"><a href="'+ self.getWeb(place) +'" target="_blank">' + self.getWeb(place) + '<a></div>' +
              '<hr style="background: #ffbccd;">' +
              '<img style="width: 20px;" src="images/Foursquare-icon.png"><a href="#" id="fourLink" style="display: inline;"> Top 5 place by 4Square</a>'
            );

            infowindow.open(map, marker);

            $('#infoWindow').fadeIn(1000);

            self.placePhotos(place.photos);

            document.getElementById('photoLink').addEventListener("click", function() {
              /*
                open photo viewer
              */
              $('#photoViewer').show();

              var numberOfPhotos = place.photos.length;
              var photoIdx = 0;

              updPhoto(0);

              $('#next').click(function() {
                updPhoto(1);

              });

              $('#prev').click(function() {
                updPhoto(-1);
              });

              function updPhoto(direction) {
                /*
                  update which photo to be shown
                */
                photoIdx += direction;

                if (photoIdx === 0) {
                  $('#prev').hide();
                  $('#next').show();
                } else if (photoIdx === numberOfPhotos - 1){
                  $('#next').hide();
                  $('#prev').show();
                } else {
                  $('#prev').show();
                  $('#next').show();
                }
                $('#frame').children().eq(photoIdx - direction).hide();
                $('#frame').children().eq(photoIdx).show();
                updCounter();
              }

              function updCounter() {
                $('#photoCounter').text((photoIdx + 1) + " / " + numberOfPhotos);
              }

              $('#close-photo').click(function() {
                $('#frame').children().hide();
                $('#photoViewer').hide();
                photoIdx = 0;
              });

            });

            var reviewlink = document.getElementById('reviewlink');

            if (reviewlink) {
              reviewlink.addEventListener("click", function(){
                /*
                  open review page
                */
                self.placeReviews([]);
                self.placeInFocus(place);
                var reviews = [];
                place.reviews.forEach(function(review) {
                    if (review.text !== "") {
                      reviews.push(review);
                    }
                });

                self.placeReviews(reviews);

                $('#review-page').show();
                $('#reviews').children().show();
                $('#close-review').click(function() {
                  $('#reviews').children().hide();
                  $('#review-page').hide();
                });
              });
            }

            var foursquareLink = document.getElementById('fourLink');
            if (foursquareLink) {
              foursquareLink.addEventListener("click", function(){
                self.foursquarePlaces(getFourSquare(place));

                $('#foursquare-page').show();
                $('#close-foursquare').click(function() {
                  $('#foursquare').children().hide();
                  $('#foursquare-page').hide();
                });
              });
            }
          }
        });

        google.maps.event.addListener(infowindow,'closeclick',function(){
          self.markers().forEach(function(marker) {
            marker.setAnimation(null);
          });
        });
      }

      function getOpeningHrs(place) {
        /*
          get opening hours from place object
        */
        var openHrs = place.opening_hours;
        if (openHrs) {
          return openHrs.weekday_text[(today.getDay() - 1).mod(7)];
        } else {
          return "";
        }
      }

      function getRating(place) {
        /*
          get rating from place object and dinamically chain together the rating tag
          add rating stars and review link
        */
        var ratingTag = "";
        var starHolder = self.rateImg(place.rating);
        if (place.rating) {
          ratingTag = '<div><span style="color: #df6d15; padding-right: 3px;">' + place.rating + '</span>';
          for (var i in starHolder) {
            if (i) {
             ratingTag += '<img class="rate-star" src="' + starHolder[i].star + '" />';
            }
          }

          return ratingTag + '<a id="reviewlink" style="padding-left: 10px;" href="#"">reviews,</a>';
        } else {
          return '<span style="font-style: italic;">no rating available</span>';
        }
      }

      function getPhone(place) {
        /*
          get phone number from place object
        */
        if (place.international_phone_number) {
          return place.international_phone_number;
        } else {
          return '<span>Location:' + place.geometry.location + '</span>';
        }
      }

      self.getWeb = function(place) {
        /*
          get website from place object
        */
        if (place.website) {
          return place.website;
        } else {
          return "";
        }
      }

      function getPhotoes(place) {
        /*
          get photo urls from place object
        */
        if (place.photos) {
          if (place.photos.length > 1 ) {
          return '<a style="margin-left: 5px;" id="photoLink" href="#"">photos</a>';
        }}
        return '<div id="photoLink"></div></div>';
      }

      function getFourSquare(place) {
        var lat = place.geometry.location.lat(), lng = place.geometry.location.lng(),
        baseUrl = "https://api.foursquare.com/v2/venues/explore?ll=",
        baseLocation = lat + ", " + lng,
        extraParams = "&limit=5&section=topPicks&day=any&time=any&locale=en&&client_id=PMDCA1TH4CXRVBSLMBTPME2OBYL4G2FY5JZJ1SHXPW5T50ZL&client_secret=ZYQZSU5EZP3T0PRYJASI0N5X12ORCCI5113ENQOQAKIR1AAP&v=20151119",
        url = baseUrl + baseLocation + extraParams;
        $.getJSON(url, function(data) {
          self.foursquarePlaces(data.response.groups[0].items)

      })
        .fail(function() {
          console.log( "foursquare API faild to load" );

        })
        .always(function() {
          console.log( "foursquare request finished" );
        });

      }

      function getWikiExtract(place) {
        /*
          get wikipedia page extract and link based on place name
        */
        var searchParam = place.name.replace(/[\s,]/g, "%20");
        var wiki = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=" + searchParam;

        var wikiTimeOut = setTimeout(function() {
          console.log("Wiki API failed to load."); //Could notify user but did not seemed necessary, anyhow it's useful for debug
        }, 3000);

        $.ajax({
          url: wiki,
          dataType: "jsonp",
          success: function(response) {
            var wikiTag = document.getElementById('wiki');
            for (var page in response.query.pages) {
              if (response.query.pages[page].extract === undefined || response.query.pages[page].extract === "") {

              }else {
                  wikiTag.innerHTML = '<span>' + response.query.pages[page].extract.substring(0, 60) +
                  "..." + '</span><a style="display: block;" href=http://en.wikipedia.org/?curid=' + response.query.pages[page].pageid +
                  ' target="_blank">read more on wikipedia</a>';
              }
            }
            clearTimeout(wikiTimeOut);
          }
        });
      }

      self.clickMarker = function(place) {
        /*
          trigger click event to markers when list item is clicked
        */
        var name = place.name.toLowerCase();

        self.markers().forEach(function(marker) {
          if (marker.title.toLowerCase() === name) {
            google.maps.event.trigger(marker, 'click');
          }
        });
      };

      $('#filters').on('click', 'button', function () {
        /*
          call google map API nearby serach with altered categories based on which icon pressed
          unfortunatelly there is an inconsistency with how google call place types and the
          "corresponding image" see example typename = gym,  imgname = fitness
        */
        self.places([]);
         marker_animation = google.maps.Animation.DROP;
         var fileName = $(this).children('img').attr('src').split("/");
         var rawCategory = fileName[fileName.length - 1].split("-")[0];
         categories = [];

         if (rawCategory == "fitness") {
           categories.push("gym");         // <--not nice but necessary because the inconsistency
         }

         for (var idx in googlePlaceTypes) {
           //fetch the place type from googlePlaceTypes based on icon url name
           if (googlePlaceTypes[idx].toLowerCase().indexOf(rawCategory.substring(0, 4)) != -1) {
                 categories.push(googlePlaceTypes[idx]);
           }
         }

         getNearbyPlaces(map.getCenter());
      });

      $('#reset').on('click', function() {
        /*
          reset categories on hitting refresh button on .btn-toolbar and
          re-request Nearby places with google API
        */
        self.places([]);
        categories = [];
        getNearbyPlaces(map.getCenter());
      });

      /*
        hide navbuttons for mobile slider
      */
      $('#prev-list').children().hide();
      $('#next-list').children().hide();

      $('#prev-list').children().click(function() {
        /*
          handle mobile previous navButton
        */
        var number = $('.infolist').scrollLeft() / (winWidth - 26);
        if (number === parseInt(number, 10)) {
          mobilSlider(-1)
        } else {
          mobilSlider(0)
        }
      });

      $('#next-list').children().click(function() {
        /*
          handle mobile next navButton
        */
        var number = $('.infolist').scrollLeft() / (winWidth - 26);
        if (number === parseInt(number, 10)) {
          mobilSlider(1)
        } else {
          mobilSlider(0)
        }
      });

      function mobilSlider(direction) {
        /*
          animate slider based on direction input.
        */
        var $infolist = $('.infolist');
        var dist = $('.infolist').scrollLeft();
        var placeIndex = (parseInt(dist / (winWidth  - 26)));

        placeCount = $('.infolist').children('li').length;
        placeIndex += direction;

        $infolist.animate({
        scrollLeft: placeIndex * winWidth - placeIndex * 26
      }, 1000);
      }

      $('.infolist').scroll(function() {
        /*
          hide/show navButtons based on slider position.
        */
        if ($(this).scrollLeft() < winWidth / 3) {
          $('#prev-list').children().hide();
        } else if ($(this).scrollLeft() > ($(this).children('li').length - 2) * winWidth) {
          $('#next-list').children().hide();
        } else {
          $('#prev-list').children().show();
          $('#next-list').children().show();
        }
      });

      screenResize();
      $( window ).resize(function() {
        screenResize();
      });

      function screenResize() {
        /*
          transform infolist to slider depending on screen size.
        */
        if ($( window ).width() < 800) {
          $('#next-list').children().show();
          $('.row').css('width', winWidth);
          $('.col-md-8').css('width', winWidth - 2 * ($('.navigator').width() + 26));
        }
      }

      var lastScrollValue = 0;
      var $infolist = $('.infolist');
      setInterval(function(){
        /*
          checking mobilSlider position every 1200ms and move it to next item found if moved and out of position.
        */
        var placeCount = $infolist.children('li').length;
        var currentScrollValue = $infolist.scrollLeft() / (winWidth - 26);
        if (currentScrollValue > placeCount - 2) {
          return
        }
        if (currentScrollValue !== parseInt(currentScrollValue, 10)) {
          if (currentScrollValue < lastScrollValue) {
            mobilSlider(0);
          } else if (currentScrollValue > lastScrollValue) {
            mobilSlider(1);
          }
          lastScrollValue = Math.round(currentScrollValue);
        }
      }, 1200);
    }

    ko.applyBindings(new nhViewModel());
    $('.infolist').css('height', $('.infolist').parent().height() * 0.8);
    $('.infolist').each(function() {
      /*
        JQuery magic to overcome complex css dependance issues. NOTE: http://imgur.com/gallery/9qzBYbH
      */
      var height = $( window ).height(),
          width = $( window ).width()
      if (height > width) {
        $(this).css('height', "60%");
      }
    });

    $('#hide').click(function() {
      /*
        handle btn-toolbar click events
      */
        var glyph = '', currentGlyph = $(this).children('span').attr('class');
        if (currentGlyph.slice(29) === 'left') {
          glyph = currentGlyph.replace('left', 'right');
        }
        else {
          glyph = currentGlyph.replace('right', 'left');
        }

        $(this).siblings('div').animate({width: "toggle"}, 500);
        $(this).children('span').attr('class', glyph);
      });
  });
