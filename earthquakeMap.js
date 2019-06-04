let map;

//initialise l'affichage de la map
function initEqMap() {
    let values = new Array();

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 2,
        center: {lat: -33.865427, lng: 151.196123},
        mapTypeId: 'terrain'
    });

    values = loadValues();

    loadEarthquakes(values[0], values[1], values[2], values[3], values[4]);

    //Affichage des seismes selectiones
    map.data.setStyle(function(feature) {
        let magnitude = feature.getProperty('mag');
        return {
        icon: getCircle(magnitude)
        };
    });

    //declaration d'une popover
    let eqInfoWindow = new google.maps.InfoWindow();

    //Lors d'un clic sur un des seismes, on affiche les informations liees
    map.data.addListener('click', 
        function(event) {
            eqInfoWindow.setPosition(event.feature.getGeometry().get());
            eqInfoWindow.setContent(getDisplayInfos(event.feature));
            eqInfoWindow.open(map);
            getDBPediaPerson(event.feature);
            getDBPediaPlace(event.feature);
            map.setCenter(event.feature.getGeometry().get());
        }
    );

    map.addListener('click', 
        function() {
            eqInfoWindow.close();
        }
    );

}

//Renvoie un tableau contenant les valeurs du formulaire
function loadValues(){
    let values = new Array();

    values[0] = document.getElementById("minM").value;
    values[1] = document.getElementById("maxM").value;
    values[2] = document.getElementById("minD").value;
    values[3] = document.getElementById("maxD").value;
    values[4] = document.getElementById("nbM").value;

    return values;
}

//Determine et execute la requete permettant de recuperer les seismes correspondants au formulaire
function loadEarthquakes(minMagnitude = null, maxMagnitude, minDate, maxDate, nbMax){
    let query = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&jsonerror=true&orderby=time';

    if(nbMax){ query += '&limit=' + nbMax; }
    else{ query += '&limit=100'; }

    if(minMagnitude){ query += '&minmagnitude=' + minMagnitude; }

    if(maxMagnitude){ query += '&maxmagnitude=' + maxMagnitude; }

    if(minDate){ query += '&starttime=' + minDate; }

    if(maxDate){ query += '&endtime=' + maxDate; }

    map.data.loadGeoJson(query);

}

//Retourne la description d'un point affichable sur la carte selon une magnétude
function getCircle(magnitude) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: 'red',
        fillOpacity: .2,
        scale: Math.pow(2, magnitude) / 2,
        strokeColor: 'white',
        strokeWeight: .5
    };
}

//Renvoie au format html les informations generales sur le seisme passe en argument
function getDisplayInfos(feature){
    let title = feature.getProperty('place');
    
    let sec = new Date();
    sec.setTime(feature.getProperty('time'));
    let date = sec.toUTCString();

    let magnitude = feature.getProperty('mag');

    let link = feature.getProperty('url');

    let desc = '<a href=' + link + ' "target=_blank">' + '<H3>' + title + '</H3>' + '</br'
             + '<p style="color:black;"> Date : ' + date + '</br>'
             + 'Magnitude : ' + magnitude + '</br> </p> </a>' ;

    return desc;
}

//Execute une requete AJAX et SPARQL sur dbpedia pour recuperer et afficher les informations liees au pays du seisme passe en argument
function getDBPediaPlace(feature){
    let place = (feature.getProperty('place').split(', '))[1];

    let querySPARQL=
        ""+
        'PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>'+ 
        'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'+
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> '+
        'PREFIX dbpedia-res: <http://fr.dbpedia.org/resource/>'+
        'PREFIX dbpedia: <http://dbpedia.org/resource/>'+
        'PREFIX owl: <http://www.w3.org/2002/07/owl#>'+
        'SELECT ?country, ?abstr '+
        'WHERE {'+ 
            '?country owl:sameAs dbpedia:' + place + '. '+
            '?country dbpedia-owl:abstract ?abstr . '+
        'FILTER(lang(?abstr) = "en")'+
        ' }';

    let endpoint = "http://fr.dbpedia.org/sparql";

    let query = endpoint + "?query=" + encodeURIComponent(querySPARQL) + "&format=json";

    //Création de la requête AJAX
    let req = new XMLHttpRequest();
    req.open("GET", query, true);
    req.onreadystatechange = myCode;   
    req.send(null);        

    function myCode() {
        if (req.readyState == 4) {
            let doc = JSON.parse(req.responseText); 
            let name = ((doc.results.bindings[0].country.value.split('/'))[4]).replace('_', ' ');;
            let abstr = doc.results.bindings[0].abstr.value;

            console.log(doc)
            document.getElementById("countryName").innerHTML = name;
            document.getElementById("countryAbstr").innerHTML = abstr;
        }
    }
}

//Execute une requete AJAX et SPARQL sur dbpedia pour recuperer et afficher les informations liees a 10 personnes celebres du pays du seisme passe en argument
function getDBPediaPerson(feature){
    let place = (feature.getProperty('place').split(', '))[1];

    let querySPARQL=
        ""+
        'PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>'+ 
        'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'+
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> '+
        'PREFIX dbpedia-res: <http://fr.dbpedia.org/resource/>'+
        'PREFIX dbpedia: <http://dbpedia.org/resource/>'+
        'PREFIX owl: <http://www.w3.org/2002/07/owl#>'+
        'SELECT ?pers ?abstr '+
        'WHERE {'+ 
            '?country owl:sameAs dbpedia:'+ place +' . '+
            '?country dbpedia-owl:wikiPageWikiLink ?pers .'+ 
            '?pers rdf:type dbpedia-owl:Person . '+
            '?pers dbpedia-owl:abstract ?abstr . '+
        'FILTER(lang(?abstr) = "fr")'+
        ' }'+
        'LIMIT 10';

    let endpoint = "http://fr.dbpedia.org/sparql";

    let query = endpoint + "?query=" + encodeURIComponent(querySPARQL) + "&format=json";

    //On crée notre requête AJAX
    let req = new XMLHttpRequest();
    req.open("GET", query, true);
    req.onreadystatechange = myCode;   
    req.send(null);        

    function myCode() {
        if (req.readyState == 4) {
            let doc = JSON.parse(req.responseText);
            let persons = doc.results.bindings;

            document.getElementById("desc").innerHTML = '';
            persons.forEach(person => {
                let name = ((person.pers.value.split('/'))[4]).replace('_', ' ');
                document.getElementById("desc").innerHTML +=
                    '<div class="row">' +
                        '<div class="col-lg-3"> </div>' +
                            '<div class="col-lg-8">' + 
                                '<div class="shadow card bg-light mb-3">' +
                                    '<div class="card-header">' +
                                        '<h4><i class="fas fa-envelope"></i>' + name + '</h4>' +
                                    '</div>' + 
                                    '<div class="card-body">' + 
                                        '<p>' + person.abstr.value + '</p>' + 
                                    '</div>' + 
                                '</div>' + 
                            '</div>' + 
                        '</div>' + 
                    '</div>' ;
            });
        }
    }

}

    //Tentative d'utilisation de l'API data youtube non finalisee

    /*

    function loadClient() {
        gapi.client.setApiKey("AIzaSyCb38uvldC6fkqf4z80iuJ2KsY_4cP0YEI");
        return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
            .then(function() { console.log("GAPI client loaded for API"); },
                  function(err) { console.error("Error loading GAPI client for API", err); });
      }
      // Make sure the client is loaded before calling this method.
      function search(feature) {

        let location = feature.getGeometry().get();
        let lat = location.lat();
        let lng = location.lng();

        let locationString = lat + ',' + lng;

        return gapi.client.youtube.search.list({
          "part": "snippet",
          "location": locationString,
          "locationRadius": "20km",
          "maxResults": 10,
          "q": "earthquake",
          "type": "video"
        })
        .then(function(response) {
            // Handle the results here (response.result has the parsed body).
            console.log("Response", response);
        },
        function(err) { console.error("Execute error", err); });
      }

      gapi.load("client");

    */