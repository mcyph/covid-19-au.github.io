import React from "react";
import mapboxgl from 'mapbox-gl';
import polylabel from 'polylabel';
import confirmedData from "../data/mapdataCon"
import hospitalData from "../data/mapdataHos"
import mapDataArea from "../data/mapdataarea"
import vicLgaData from "../data/vic_lga.geojson"
import nswLgaData from "../data/nsw_lga.geojson"
import qldHhsData from "../data/qld_hhs.geojson"
import actSaData from "../data/sa3_act.geojson"
import waLgaData from "../data/wa_lga.geojson"
import 'mapbox-gl/dist/mapbox-gl.css'
import './ConfirmedMap.css'
import confirmedImg from '../img/icon/confirmed-recent.png'
import confirmedOldImg from '../img/icon/confirmed-old.png'
import hospitalImg from '../img/icon/hospital.png'
import ReactGA from "react-ga";
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import Acknowledgement from "../Acknowledgment"
//Fetch Token from env
let token = process.env.REACT_APP_MAP_API;
mapboxgl.accessToken = token;


const oldCaseDays = 14; // Threshold for an 'old case', in days

class MbMap extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lng: 133.751567,
            lat: -26.344589,
            zoom: 2,
            showMarker: true,
        };
    }

    componentDidMount() {
        const { lng, lat, zoom } = this.state;

        var bounds = [
            [101.6015625, -49.83798245308484], // Southwest coordinates
            [166.2890625, 0.8788717828324276] // Northeast coordinates
        ];

        const map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [lng, lat],
            zoom: zoom,
            maxBounds: bounds // Sets bounds as max
        });

        // Add geolocate control to the map.
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            })
        );

        //Add Zoom Controls
        map.addControl(new mapboxgl.NavigationControl());

        //Add Full Screen Controls
        map.addControl(new mapboxgl.FullscreenControl());

        map.on('move', () => {
            const { lng, lat } = map.getCenter();

            this.setState({
                lng: lng.toFixed(4),
                lat: lat.toFixed(4),
                zoom: map.getZoom().toFixed(2)
            });
        });

        // Add markers: confirmed cases/hospitals
        // only for tas/nt at this point
        var confirmedMarkers = this.confirmedMarkers = [];
        confirmedData.forEach((item) => {
            if (!(['VIC', 'NSW', 'QLD', 'WA', 'ACT'].includes(item['state']))) {
                confirmedMarkers.push(
                    new ConfirmedMarker(map, item)
                );
            }
        });
        this.hospitalMarkers = hospitalData.map((item) => {
            return new HospitalMarker(map, item);
        });

        var that = this;
        map.on('load', function () {
            (async () => {
                that.totalData = new CurrentValuesDataSource('totalData', mapDataArea);

                // ACT uses SA3 schema, Queensland uses HHS.
                // The others use LGA (Local Government Area)
                that.sa3ACT = new ACTSA3Boundaries(map);
                that.lgaWA = new WALGABoundaries(map);
                that.lgaNSW = new NSWLGABoundaries(map);
                that.lgaVic = new VicLGABoundaries(map);
                //that.lgaQLD = new QLDLGABoundaries(map);    <-- TODO!
                //that.qldHHS = new QLDHHSGeoBoundaries(map);  <-- TODO!
            })();
        });
    }

    setUnderlay(underlay) {
        this._underlay = underlay;
        this.setState({
            _underlay: underlay
        });
    }

    setMarkers(markers) {
        // Reset since last time
        let m = this._markers;

        if (m === null) {
        }
        else if (m === 'Total') {
            this.sa3ACT.removeHeatMap();
            this.lgaNSW.removeHeatMap();
            this.lgaVic.removeHeatMap();
            this.lgaWA.removeHeatMap();
            //this.hhsQLD.removeHeatMap();

            this.confirmedMarkers.forEach(
                (marker) => marker.hide()
            );
        }
        else if (m === 'Active') {
            this.sa3ACT.removeHeatMap();
            this.lgaNSW.removeHeatMap();
            this.lgaVic.removeHeatMap();
            this.lgaWA.removeHeatMap();
            //this.hhsQLD.removeHeatMap();
        }
        else if (m === 'Tests') {
            this.lgaInsts['nsw'].removeHeatMap();
        }
        else if (m === 'Hospitals') {
            this.hospitalMarkers.forEach(
                (marker) => marker.hide()
            );
        }

        this._markers = markers;
        this.setState({
            _markers: markers
        });

        // Change to the new markers mode
        if (markers === null) {
        }
        else if (markers === 'Total') {
            this.sa3ACT.addLinePoly(this.totalData);
            this.lgaNSW.addLinePoly(this.totalData);
            this.lgaVic.addLinePoly(this.totalData);
            this.lgaWA.addLinePoly(this.totalData);
            //this.hhsQLD.addLinePoly(this.totalData);

            this.sa3ACT.addHeatMap(this.totalData);
            this.lgaNSW.addHeatMap(this.totalData);
            this.lgaVic.addHeatMap(this.totalData);
            this.lgaWA.addHeatMap(this.totalData);
            //this.hhsQLD.addHeatMap(this.totalData);

            this.confirmedMarkers.forEach(
                (marker) => marker.show()
            );
        }
        else if (markers === 'Active') {
            this.sa3ACT.addLinePoly(this.activeData);
            this.lgaNSW.addLinePoly(this.activeData);
            this.lgaVic.addLinePoly(this.activeData);
            this.lgaWA.addLinePoly(this.activeData);
            //this.hhsQLD.addLinePoly(this.activeData);

            this.sa3ACT.addHeatMap(this.activeData);
            this.lgaNSW.addHeatMap(this.activeData);
            this.lgaVic.addHeatMap(this.activeData);
            this.lgaWA.addHeatMap(this.activeData);
            //this.hhsQLD.addHeatMap(this.activeData);

            // TODO: Show recent confirmed markers!!! ==================================================================
        }
        else if (markers === 'Tests') {
            this.lgaNSW.addHeatMap(this.testsData);
        }
        else if (markers === 'Hospitals') {
            this.hospitalMarkers.forEach(
                (marker) => marker.show()
            );
        }
        else {
            throw "Unknown marker";
        }
    }

    showMarkers() {
        // Turn markers on
        var all = document.getElementsByClassName("marker");
        for (var i = 0; i < all.length; i++) {
            var element = all[i];
            element.style.visibility = 'visible';
        }
        this.setState({
            showMarker: true
        })
    }

    hideMarkers() {
        // Turn markers off
        var all = document.getElementsByClassName("marker");
        for (var i = 0; i < all.length; i++) {
            var element = all[i];
            element.style.visibility = 'hidden';
        }
        this.setState({
            showMarker: false
        })
    }

    render() {
        const activeStyles = {
            color: 'black',
            borderColor: '#8ccfff',
            padding: "0px 5px",
            zIndex:10,
            outline: "none"
        };
        const inactiveStyles = {
            color: 'grey',
            borderColor: '#e3f3ff',
            padding: "0px 5px",
            outline: "none"
        };

        return (
            <div className="card" style={{
                display: 'flex',
                flexDirection: 'column',
            }}>
                <h2 style={{ display: "flex" }}
                    aria-label="Hospital and Case Map">Hospital & Case Map<div style={{
                        alignSelf: "flex-end",
                        marginLeft: "auto",
                        fontSize: "60%"
                    }}>
                    <Acknowledgement>
                    </Acknowledgement></div></h2>

                <div>
                    <span className="key" style={{ alignSelf: "flex-end", marginBottom: "0.5rem" }}>
                        Markers:&nbsp;<ButtonGroup size="small" aria-label="small outlined button group">
                            <Button style={this._markers == null ? activeStyles : inactiveStyles}
                                    onClick={() => this.setMarkers(null)}>Off</Button>
                            <Button style={this._markers === 'Total' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setMarkers('Total')}>Total</Button>
                            <Button style={this._markers === 'Active' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setMarkers('Active')}>Active</Button>
                            <Button style={this._markers === 'Tests' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setMarkers('Tests')}>Tests</Button>
                            <Button style={this._markers === 'Hospitals' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setMarkers('Hospitals')}>COVID-19 Hospitals</Button>
                        </ButtonGroup>
                    </span>
                </div>

                <div>
                    <span className="key" style={{ alignSelf: "flex-end", marginBottom: "0.5rem" }}>
                        Underlay:&nbsp;<ButtonGroup size="small" aria-label="small outlined button group">
                            <Button style={this._underlay == null ? activeStyles : inactiveStyles}
                                    onClick={() => this.setUnderlay(null)}>Off</Button>
                            <Button style={this._underlay === 'Population' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setUnderlay('Population')}>Population</Button>
                            <Button style={this._underlay === 'Socioeconomic rank' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setUnderlay('Socioeconomic rank')}>Socioeconomic rank</Button>
                            <Button style={this._underlay === 'Aged 65+' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setUnderlay('Aged 65+')}>Aged 65+</Button>
                            <Button style={this._underlay === 'Other Stats' ? activeStyles : inactiveStyles}
                                    onClick={() => this.setUnderlay('Other Stats')}>Other Stats</Button>
                        </ButtonGroup>
                    </span>
                </div>

                <div ref={el => this.mapContainer = el} >
                    {/*{*/}
                    {/*confirmedData.map((item)=>(*/}
                    {/*<div style={activityStyle}>*/}

                    {/*</div>*/}
                    {/*))*/}
                    {/*}*/}
                </div>

                <span className="due">
                    <span className="key"><img src={hospitalImg} /><p>Hospital or COVID-19 assessment centre</p></span>
                    <span className="key"><img src={confirmedOldImg} /><p>Case over {oldCaseDays} days old</p></span>
                    <span className="key"><img src={confirmedImg} /><p>Recently confirmed case(not all, collecting)</p></span>
                    <span className="Key">
                        <p>*City-level data is only present for <strong>ACT</strong>, <strong>NSW</strong>,
                            <strong>VIC</strong>, and <strong>WA</strong>, HHS Data for <strong>QLD</strong>.
                            Other states are being worked on.</p>
                    </span>
                </span>

            </div>
        );
    }
}


class DataSourceBase {
    constructor(sourceName) {
        this._sourceName = sourceName;
    }

    getSourceName() {
        return this._sourceName;
    }
}

class TimeSeriesDataSource extends DataSourceBase {
    /*
    A datasource which contains values over time

    In format:

     [[[...FIXME...]]]
    */
}

class CurrentValuesDataSource extends DataSourceBase {
    /*
    A datasource which only contains current values

    In format:

     [[[...FIXME...]]]
    */
    constructor(sourceName, mapAreaData) {
        super(sourceName);
        this.mapAreaData = mapAreaData;
    }

    getCaseInfoForCity(stateName, cityName) {
        var numberOfCases = 0,
            updatedDate = '16/4/20';

        for (var i=0; i<this.mapAreaData.length; i++) {
            var areaInfo = this.mapAreaData[i];
            if (
                stateName === areaInfo['state'] &&
                areaInfo['schema'] !== 'HLD'  // What is HLD? ========================================================
            ) {
                if (
                    areaInfo['area'].toLowerCase() ===
                        cityName.toLowerCase() &&
                    numberOfCases === 0
                ) {
                    console.log(areaInfo);
                    numberOfCases = areaInfo['confirmedCases'];
                    updatedDate = areaInfo['lastUpdateDate'];
                }
            }
        }
        return {
            'numCases': parseInt(numberOfCases),
            'updatedDate': updatedDate
        };
    }
}


class JSONGeoBoundariesBase {
    constructor(map, stateName, fillPolyId, linePolyId, data) {
        this.map = map;
        this.stateName = stateName;
        this.fillPolyId = fillPolyId;
        this.linePolyId = linePolyId;
        this.addedSources = {};  // Using as a set

        var that = this;
        this._loadJSON(data).then(
            data => that._onLoadData(data)
        );
    }

    // var maxValue = 56;
    async _loadJSON(Data) {
        let geojsonData = await fetch(`${Data}`)
            .then(response => response.json())
            .then(responseData => {
                return responseData;
            });
        return geojsonData;
    }

    _onLoadData(data) {
        this.geoJSONData = data;
        this.pointGeoJSONData = this._getModifiedGeoJSONWithPolyCentralAreaPoints(
            this.geoJSONData
        );
    }

    /*******************************************************************
     * Fill poly-related
     *******************************************************************/

    addFillPoly(dataSource) {
        // Add the colored fill area
        const map = this.map;
        this._associateGeoJSONWithSource(dataSource);

        map.addLayer({
            id: this.fillPolyId,
            type: 'fill',
            minzoom: 2,
            source: this.fillPolyId+dataSource.getSourceName()+'source',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'cases'],
                    0, '#E3F2FD',
                    1, '#BBDEFB',
                    5, '#90CAF9',
                    10, '#64B5F6',
                    20, '#42A5F5',
                    30, '#2196F3',
                    40, '#1E88E5',
                    50, '#1976D2',
                    60, '#1565C0',
                    70, '#0D47A1'
                ],
                'fill-opacity': 0.75
            },
            filter: ['==', '$type', 'Polygon']
        });
    }

    removeFillPoly() {
        const map = this.map;
        map.removeLayer(this.fillPolyId);
    }

    /*******************************************************************
     * Line poly-related
     *******************************************************************/

    addLinePoly(dataSource) {
        // Add the line outline
        const map = this.map;
        this._associateGeoJSONWithSource(dataSource);

        map.addLayer({
            id: this.linePolyId,
            minzoom: 2,
            type: 'line',
            source: this.fillPolyId+dataSource.getSourceName()+'source',
            paint: {
                // 'line-color': '#088',
                'line-opacity': 1,
                'line-width': 1,
            },
            filter: ['==', '$type', 'Polygon']
        });

        this._addLinePolyPopupEvent();
    }

    _addLinePolyPopupEvent() {
        const map = this.map;

        map.on('click', this.fillPolyId, function (e) {
            ReactGA.event({
                category: 'ConfirmMap',
                action: "StateClick",
                label: e.features[0].properties.city
            });
            var cases = e.features[0].properties.cases;
            var date = e.features[0].properties.date;
            console.log(e.features);

            if (e.features[0].source === 'id_poly_act' && cases === 5) {
                cases='< 5'
            }

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    e.features[0].properties.city +
                    '<br/>Cases: ' + cases +
                    '<br/>By: ' + date
                )
                .addTo(map);
        });

        // Change the cursor to a pointer when
        // the mouse is over the states layer.
        map.on('mouseenter', 'id_poly', function () {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'id_poly', function () {
            map.getCanvas().style.cursor = '';
        });
    }

    removeLinePoly() {
        const map = this.map;
        map.removeLayer(this.linePolyId);
    }

    /*******************************************************************
     * Heat map-related
     *******************************************************************/

    addHeatMap(dataSource) {
        const map = this.map;
        this._associateGeoJSONWithSource(dataSource);

        map.addLayer(
            {
                'id': this.fillPolyId+'heat',
                'type': 'heatmap',
                'source': this.fillPolyId+dataSource.getSourceName()+'pointsource',
                'maxzoom': 9,
                'paint': {
                    // Increase the heatmap weight based on frequency and property magnitude
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'cases'],
                        0, 0,
                        6, 1
                    ],
                    // Increase the heatmap color weight weight by zoom level
                    // heatmap-intensity is a multiplier on top of heatmap-weight
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 1,
                        9, 3
                    ],
                    // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                    // Begin color ramp at 0-stop with a 0-transparancy color
                    // to create a blur-like effect.
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(0,0,0,0)',
                        0.2, 'rgba(178,24,43,0.21)',
                        0.4, 'rgba(178,24,43,0.4)',
                        0.6, 'rgba(178,24,43,0.61)',
                        0.8, 'rgba(178,24,43,0.81)',
                        1.0, 'rgb(178,24,43)'
                    ],
                    // Adjust the heatmap radius by zoom level and value
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, ['*', 0.1, ['get', 'cases']],
                        2, ['*', 0.2, ['get', 'cases']],
                        4, ['*', 0.4, ['get', 'cases']],
                        16, ['*', 0.8, ['get', 'cases']]
                    ]/*,
                    // Transition from heatmap to circle layer by zoom level
                    'heatmap-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        7, 1,
                        9, 0
                    ]*/
                }
            },
            'waterway-label'
        );

        map.addLayer(
            {
                'id': this.fillPolyId+'heatpoint',
                'type': 'circle',
                'source': this.fillPolyId+dataSource.getSourceName()+'pointsource',
                'minzoom': 7,
                'paint': {
                    // Size circle radius by value
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['get', 'cases'],
                        1, 3,
                        5, 5,
                        10, 7,
                        50, 20,
                        100, 30,
                        300, 40
                    ],
                    // Color circle by value
                    'circle-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'cases'],
                        1, 'rgba(0,0,0,0)',
                        5, 'rgba(178,24,43,0.21)',
                        10, 'rgba(178,24,43,0.4)',
                        50, 'rgba(178,24,43,0.61)',
                        100, 'rgba(178,24,43,0.81)',
                        300, 'rgba(178,24,43,1.0)'
                    ],
                    // Transition from heatmap to circle layer by zoom level
                    'circle-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        7, 0,
                        8, 1
                    ]
                }
            },
            'waterway-label'
        );
    }

    removeHeatMap() {
        const map = this.map;
        map.removeLayer(this.fillPolyId+'heat');
        map.removeLayer(this.fillPolyId+'heatpoint');
    }

    /*******************************************************************
     * Data processing
     *******************************************************************/

    _associateGeoJSONWithSource(dataSource) {
        let sn = dataSource.getSourceName();
        if (sn in this.addedSources) {
            return;
        }
        this.addedSources[sn] = null;

        this._assignCaseInfoToGeoJSON(this.geoJSONData, dataSource); // RESOURCE VIOLATION WARNING!!! ===========================================
        this.map.addSource(this.fillPolyId+sn+'source', {
            type: 'geojson',
            data: this.geoJSONData
        });
        this._assignCaseInfoToGeoJSON(this.pointGeoJSONData, dataSource);
        this.map.addSource(this.fillPolyId+sn+'pointsource', {
            type: 'geojson',
            data: this.pointGeoJSONData
        });
    }

    _getModifiedGeoJSONWithPolyCentralAreaPoints(geoJSONData) {
        // Uses https://github.com/mapbox/polylabel
        // to get the central point of the polygon
        let r = {
            "type": "FeatureCollection",
            "features": [/*...*/]
        };
        r["features"] = geoJSONData['features'].filter(
            (feature) => !!feature['geometry']
        ).map((feature) => {
            console.log(feature);
            return {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": polylabel(
                        feature["geometry"]["coordinates"],
                        0.1
                    )
                },
                "properties": feature["properties"]
            }
        });
        return r
    }

    _assignCaseInfoToGeoJSON(geoJSONData, dataSource) {
        var caseInfo;
        const state = this.stateName;

        for (var i=0; i<geoJSONData.features.length; i++) {
            var data = geoJSONData.features[i];
            caseInfo = dataSource.getCaseInfoForCity(
                state, this.getCityNameFromProperty(data)
            );
            data.properties['city'] =
                this.getCityNameFromProperty(data);
            data.properties['cases'] = caseInfo['numCases'];
            data.properties['date'] = caseInfo['updatedDate'];
        }
    }
}

class ACTSA3Boundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'ACT',
            'id_poly_act',
            'id_line_ploy_act',
            actSaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties['name'];
    }
}


class QLDHHSGeoBoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'QLD',
            'id_poly_qld',
            'id_line_ploy_qld',
            qldHhsData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.HHS;
    }
}

class WALGABoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'WA',
            'id_poly_wa',
            'id_line_ploy_wa',
            waLgaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.wa_lga_s_3;
    }
}

class NSWLGABoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'NSW',
            'id_poly_nsw',
            'id_line_ploy_nsw',
            nswLgaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.nsw_lga__3;
    }
}

class VicLGABoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'VIC',
            'id_poly_vic',
            'id_line_ploy_vic',
            vicLgaData
        );
    }
    getCityNameFromProperty(data) {
        let city_name = data.properties.vic_lga__2;
        var city = city_name.toLowerCase().split(" ");
        var city_type = city.slice(-1)[0];
        city.pop();
        city_name = city.join(' ');
        return city_name
    }
}

class ConfirmedMarker {
    constructor(map, item) {
        this.map = map;
        this.item = item;

        if (item['state'] === 'VIC' && item['area'].length > 0) {
            item['description'] =
                "This case number is just the suburb confirmed " +
                "number, not the case number at this geo point.";
            item['date'] = '26/3/20'
        }

        // create a HTML element for each feature
        var el = this.el = document.createElement('div');

        this._setStyles(el);
        this._addMarker(el);
        this.hide();
    }

    show() {
        if (this._marker)
            return;
        this.el.style.display = 'block';
        this._addMarker(this.el);
    }
    hide() {
        this.el.style.display = 'none';
        if (!this._marker)
            return;
        this._marker.remove();
        delete this._marker;
    }

    _setStyles() {
        const el = this.el;
        el.className = 'marker';
        el.style.height = '20px';
        el.style.width = '20px';
        el.style.backgroundSize = 'cover';
        if (this._isOld(this.item['date'])) {
            el.style.backgroundImage = `url(${confirmedOldImg})`;
        } else {
            el.style.backgroundImage = `url(${confirmedImg})`;
        }
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
    }
    _isOld(date) {
        // Check if a date was more than two weeks ago
        // Working with raw data, so try-catch just in case

        try {
            // 'DD/MM/YY' format
            // Assume entries with incorrect formats are old
            const eventDay = date.split("/");
            if (eventDay.length !== 3 || eventDay === 'N/A') { return true; }

            // Default constructor has current time
            const today = new Date();

            // Day of the event. Transform to YYYY/MM/DD format
            const day = eventDay[0], month = parseInt(eventDay[1]) - 1;
            const year = '20' + eventDay[2];
            let caseDate = new Date(year, month, day);

            // Add two weeks for comparison
            caseDate.setDate(caseDate.getDate() + oldCaseDays);

            // True iff the original date was more than two weeks old
            if (today > caseDate) {
                return true;
            } else {
                return false;
            }
        } catch {
            return true;
        }
    }
    _addMarker() {
        const map = this.map;
        let coor = [
            this.item['coor'][1],
            this.item['coor'][0]
        ];

        // make a marker for each feature and add to the map
        this._marker = new mapboxgl
            .Marker(this.el)
            .setLngLat(coor)
            .setPopup(
                new mapboxgl
                    .Popup({ offset: 25 }) // add popups
                    .setHTML(
                        '<h3 style="margin:0;">' + this.item['name'] + '</h3>' +
                        '<p style="margin:0;">' + this.item['date'] + '</p>' +
                        '<p style="margin:0;">' + this.item['description'] + '</p>'
                    )
            )
            .addTo(map);
    }
}

class HospitalMarker {
    constructor(map, item) {
        this.map = map;
        this.item = item;

        // create a HTML element for each feature
        var el = this.el = document.createElement('div');

        this._setStyles(el);
        this._addMarker(el);
        this.hide();
    }

    show() {
        if (this._marker)
            return;
        this.el.style.display = 'block';
        this._addMarker(this.el);
    }
    hide() {
        this.el.style.display = 'none';
        if (!this._marker)
            return;
        this._marker.remove();
        delete this._marker;
    }

    _setStyles() {
        const el = this.el;
        el.className = 'marker';
        el.style.height = '20px';
        el.style.width = '20px';
        el.style.backgroundSize = 'cover';
        el.style.backgroundImage = `url(${hospitalImg})`;
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
    }
    _addMarker(el) {
        let coor = [
            this.item['coor'][1],
            this.item['coor'][0]
        ];

        // make a marker for each feature and add to the map
        new mapboxgl
            .Marker(el)
            .setLngLat(coor)
            .setPopup(
                new mapboxgl
                    .Popup({offset: 25}) // add popups
                    .setHTML(
                        '<h3 style="margin:0;">' + this.item['name'] + '</h3>' +
                        '<p style="margin:0;">Phone: ' + this.item['hospitalPhone'] + '</p>' +
                        '<p style="margin:0;">Addr: ' + this.item['address'] + '</p>'
                    )
            )
            .addTo(this.map);
    }
}

export default MbMap
