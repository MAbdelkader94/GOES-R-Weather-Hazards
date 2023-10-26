// Get url parameters
var params = {};
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (
    m,
    key,
    value
) {
    params[key] = value;
});

if (params.layers) {
    var activeLayers = params.layers.split(",").map(function (item) {
        // map function not supported in IE < 9
        return layers[item];
    });
}

var request = new XMLHttpRequest();
// request.open("GET", 'js/gee_maps.json', false);
request.open("GET", 'https://dl.dropboxusercontent.com/scl/fi/j5dpr5q9cxhy4ghaobbt9/gee_maps.json?rlkey=45tyeim66qx2fodks5zinoy2b', false);
request.send(null)
var result2 = JSON.parse(request.responseText);
// console.log(result2['rgb_image']);
// console.log(result2['fre_image']);
request.open("GET", 'https://dl.dropboxusercontent.com/scl/fi/cjaqzsbexf328emfnh8qm/pts_fdc.geojson?rlkey=mbokj0r3zq36ozpjptr6ktzrb', false);
request.send(null)
var result3 = JSON.parse(request.responseText);
var utctime = result3['times'][result3['times'].length-1];
// console.log(utctime.slice(0, -1));
// document.getElementById("utctime").innerHTML = `${utctime} UTC`;


var goes16c = L.tileLayer(result2['rgb_image'], {
    maxZoom: 18,
    attribution: 'Google Earth Engine - GOESR',
})

var goes16f = L.tileLayer(result2['fre_image'], {
    maxZoom: 18,
    attribution: 'Google Earth Engine - GOESR',
})

var map_base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    // tileSize: 512,
    // zoomOffset: -1
})

var map_names = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

// Create map
var map = L.map('map', {
    center: [params.lat || 37.14, params.lng || -98.75],
    zoom: params.zoom || 5,
    layers: [map_base, map_names],
    zoomControl: false,
});
// map.addLayer(map_base);
// map.addLayer(map_names);

// get color depending on population Temp value
function getColor(d) {
    return d > 1400 ? '#ffffff' :
        d > 1300 ? '#ffffcc' :
            d > 1200 ? '#ffff66' :
                d > 1100 ? '#feec02' :
                    d > 1000 ? '#ff9900' :
                        d > 800 ? '#ff6600' :
                            d > 500 ? '#f20000' :
                                d > 200 ? '#b40000' :
                                    d > 1 ? '#700000' :
                                        '#6d6d6d';
}

function style(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        // fillColor: getColor(feature.properties['Temp_b']),
        fillColor: "#ff6347",
        radius: 10,
    };
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    // info.update(layer.feature.properties);
}

var goes16fires;
// function resetHighlight(e) {
//     goes16fires.resetStyle(e.target);
//     // info.update();
// }
// var goes16smoke;
// function resetHighlight(e) {
//     goes16smoke.resetStyle(e.target);
//     // info.update();
// }
// var goes16dust;
// function resetHighlight(e) {
//     goes16dust.resetStyle(e.target);
//     // info.update();
// }
// specify popup options
var customOptions = {
    'maxWidth': '300',
    'className': 'custom'
}

function customPopup5(feature, layer) {
    var charopt = {
        title: { text: '' },
        subtitle: { text: '' },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            },
            dateTimeLabelFormats: {
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%e. %b',
                week: '%e. %b',
                month: '%b \'%y',
                year: '%Y'
            },
        },
        yAxis: { title: { text: 'Selected Hazard' } },
        legend: { enabled: false, },
        plotOptions: {
            series: {
                pointInterval: 300000, // five minutes
                pointStart: Date.parse(feature.properties['time_0']),
            }
        },
        credits: {
            enabled: false,
            href: 'https://goesrdatajam.sched.com/',
            text: 'GOESR',
        },
        exporting: { enabled: false },
        series: [{
            name: 'Selected Hazard',
            data: feature.properties['serie']
        }]
    };

    var popupContent = '<div class="container">  \
            <h3>Status: ' + feature.properties['Status'] + '</h3>  \
            <h3>' + feature.properties['name'] + ': ' + feature.properties['data'] + ' ' + feature.properties['units'] + '</h3>  \
            <h3>Ubicación: ' + feature.properties['lon'] + ', ' + feature.properties['lat'] + '</h3>  \
            <p style="font-size:130%;"><b>' + '' + '</b></p><div id="container" style="width: 300px; height: 200px; ">Loading...</div>\
            </div>';
    layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        popupopen: function (e) {
            var chart = new Highcharts.chart('container', charopt);
        }
    });
    layer.bindPopup(popupContent);
}

function customPopup10(feature, layer) {
    var charopt = {
        title: { text: '' },
        subtitle: { text: '' },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            },
            dateTimeLabelFormats: {
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%e. %b',
                week: '%e. %b',
                month: '%b \'%y',
                year: '%Y'
            },
        },
        yAxis: { title: { text: 'Selected Hazard' } },
        legend: { enabled: false, },
        plotOptions: {
            series: {
                pointInterval: 600000, // five minutes
                pointStart: Date.parse(feature.properties['time_0']),
            }
        },
        credits: {
            enabled: false,
            href: 'https://goesrdatajam.sched.com/',
            text: 'GOESR',
        },
        exporting: { enabled: false },
        series: [{
            name: 'Selected Hazard',
            data: feature.properties['serie']
        }]
    };

    var popupContent = '<div class="container">  \
            <h3>Status: ' + feature.properties['Status'] + '</h3>  \
            <h3>' + feature.properties['name'] + ': ' + feature.properties['data'] + ' ' + feature.properties['units'] + '</h3>  \
            <h3>Location: ' + feature.properties['lon'] + ', ' + feature.properties['lat'] + '</h3>  \
            <p style="font-size:130%;"><b>' + '' + '</b></p><div id="container" style="width: 300px; height: 200px; ">Loading...</div>\
            </div>';
    layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        popupopen: function (e) {
            var chart = new Highcharts.chart('container', charopt);
        }
    });
    layer.bindPopup(popupContent);
}
// Vector Layers

// var goes16fires = new L.GeoJSON.AJAX("data_map/exp_00/pts_fdc.geojson", {
    var goes16fires = new L.GeoJSON.AJAX("https://dl.dropboxusercontent.com/scl/fi/cjaqzsbexf328emfnh8qm/pts_fdc.geojson?rlkey=mbokj0r3zq36ozpjptr6ktzrb", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#ff6347",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#ff6347",
        radius: 10,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
map.addLayer(goes16fires);
// .addTo(map)
// var goes16smoke = new L.GeoJSON.AJAX("data_map/exp_00/pts_adpS.geojson", {
    var goes16smoke = new L.GeoJSON.AJAX("https://dl.dropboxusercontent.com/scl/fi/nqwxa4dga7e2vk9w9peaj/pts_adpS.geojson?rlkey=qoaj3kavn14mx13bo2oyt7mag", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#808080",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#808080",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
// .addTo(map)
// var goes16dust = new L.GeoJSON.AJAX("data_map/exp_00/pts_adpD.geojson", {
    var goes16dust = new L.GeoJSON.AJAX("https://dl.dropboxusercontent.com/scl/fi/s0zlu35zoijb1e569jcdx/pts_adpD.geojson?rlkey=4zezkz5y658nzb14bdjkpsc61", {
        style: {
        weight: 2,
        opacity: 1,
        color: "#ffa500",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#ffa500",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup5,
})
// .addTo(map)
// var goes16prec = new L.GeoJSON.AJAX("data_map/exp_00/pts_rrqpef.geojson", {
    var goes16prec = new L.GeoJSON.AJAX("https://dl.dropboxusercontent.com/scl/fi/0wcn2js518cfthvupv139/pts_rrqpef.geojson?rlkey=mnh32yu2bsfkuo7td2xgxp1ny", {
    style: {
        weight: 2,
        opacity: 1,
        color: "#1e90ff",
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: "#1e90ff",
        radius: 5,
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
    },
    onEachFeature: customPopup10,
})
// .addTo(map)
map.attributionControl.addAttribution('GOES-R &copy; <a href="https://goesrdatajam.sched.com/">goesrdatajam</a>');

var legend = L.control({ position: 'bottomright' });


var baseMaps = {

};

var overlayMaps = {
    "Fire / Fuego": goes16fires,
    "Smoke / Humo": goes16smoke,
    "Dust / Arena": goes16dust,
    "Rainfall / Lluvia": goes16prec,
    "TrueColor": goes16f,
    "FRP / PRF": goes16c,
};
L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);


// legend.onAdd = function (map) {

//     var div = L.DomUtil.create('div', 'info legend'),
//         grades = [0, 1, 200, 500, 800, 1000, 1100, 1200, 1300, 1400,],
//         labels = [],
//         from, to;

//     for (var i = 0; i < grades.length; i++) {
//         from = grades[i];
//         to = grades[i + 1];

//         labels.push(
//             '<i style="background:' + getColor(from + 1) + '"></i> ' +
//             from + (to ? '&ndash;' + to : '+'));
//     }

//     div.innerHTML = labels.join('<br>');
//     return div;
// };

// legend.addTo(map);
// Wathermark
// https://stackoverflow.com/questions/16563190/how-to-add-a-non-referenced-image-as-overlay-in-leaflet
var mainlogo = L.control({
    position: 'bottomleft'
});
mainlogo.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'logo watermark');
    div.innerHTML = '<a href="https://goesrdatajam.sched.com/" target="_blank"> <img id= "logo" src="imgs/sched-web-footer_128.png" ></img> </a>';
    return div;
};
mainlogo.addTo(map);

// Animation Control
L.control.custom({
    position: 'topleft',
    content : '<div id="swichbt" class="divswich"></div>',
    classes : 'panel panel-default',
    style   :
    {
      margin: '0px 20px 20px 0',
      padding: '0px',
    },
}).addTo(map);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);


// Title
var title = L.control({
position: 'topleft'
});
title.onAdd = function(map) {
this._div = L.DomUtil.create('div', 'ctl title');
this.update();
return this._div;
};
title.update = function(props) {
this._div.innerHTML = utctime.slice(0, -1) + " UTC";
};
title.addTo(map);
// Title end