import React from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
//import Tooltip from '@material-ui/core/Tooltip'
//import ReactCountryFlag from "react-country-flag"

import regionsData from "../data/regionsTimeSeries.json";
import "mapbox-gl/dist/mapbox-gl.css";
import "./ConfirmedMap.css";
import Acknowledgement from "../Acknowledgment";
import absStatsData from "../data/absStats";
import confirmedData from "../data/mapdataCon";

import ConfirmedMapFns from "./ConfirmedMap/Fns";
import TimeSeriesDataSource from "./ConfirmedMap/data_sources/DataCases";
import TimeSeriesDataSourceForPeriod from "./ConfirmedMap/data_sources/DataCasesPeriod";
import BigTableOValuesDataSource from "./ConfirmedMap/data_sources/DataABS";
import GeoBoundaries from "./ConfirmedMap/GeoBoundaries"; // FIXME!
import DaysSinceMap from "./DaysSinceMap";
import ConfirmedMarker from "./ConfirmedMap/markers/MarkerConfirmed";

// import ImportCDNJS from "import-cdn-js";
import dvAna from "../dvAna";

const absStats = absStatsData["data"];
const regionsTimeSeries = regionsData["time_series_data"],
    regionsDateIDs = regionsData["date_ids"];

//Fetch Token from env
let token = process.env.REACT_APP_MAP_API;
mapboxgl.accessToken = token;

class MbMap extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lng: 133.751567,
            lat: -26.344589,
            zoom: 2,
            showMarker: true,
            _timeperiod: "alltime",
            _markers: "status_active",
            _underlay: null,
            maxDate: ConfirmedMapFns.getToday()
        };
        this._firstTime = true;
        this.stateUpdatedDates = [];
        this.geoBoundaries = new GeoBoundaries();

        this.markersBGGroup = React.createRef();
        this.underlayBGCont = React.createRef();
        this.markersButtonGroup = React.createRef();
        this.mapContControls = React.createRef();
        this.markersSelect = React.createRef();
        this.otherStatsSelect = React.createRef();

        this.accuracyWarning = React.createRef();

        this.statesAndTerritories = [
            // note if act is last, it will be drawn first!!!
            "act",
            "nsw",
            "vic",
            "tas",
            "wa",
            "nt",
            "qld",
            "sa",
        ];
    }

    getState() {
        return this.state;
    }

    /*******************************************************************
     * HTML Template
     *******************************************************************/

    _getSelectHTML() {
        function outputSelects(heading) {
            return absStats[heading]["sub_headers"]
                .map((key) => {
                    return '<option value="' + key + '">' + key + "</option>";
                })
                .join("\n");
        }
        return (
            '<optgroup label="Quick Selections">' +
            '<option value="">(None)</option>' +
            '<option value="Population density (persons/km2)">Population density (persons/km2)</option>' +
            '<option value="Index of Relative Socio-economic Advantage and Disadvantage (%)">Socioeconomic Advantage and Disadvantage (%)</option>' +
            '<option value="Persons - 65 years and over (%)">65 years and over (%)</option>' +
            "</optgroup>" +
            ConfirmedMapFns.sortedKeys(absStats)
                .map((heading) => {
                    return (
                        "<optgroup label=" +
                        heading +
                        ">" +
                        outputSelects(heading) +
                        "</optgroup>"
                    );
                })
                .join("\n")
        );
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this._resetMode(prevState);
        this._updateMode();
    }

    render() {
        const padding = "6px",
            fbPadding = "2px 3px";

        const activeStyles = {
            color: "black",
            borderColor: "#8ccfff",
            paddingLeft: padding,
            paddingRight: padding,
            //padding: "0px 5px",
            zIndex: 10,
            outline: "none",
            textTransform: "none",
            flexGrow: 1,
        };
        const inactiveStyles = {
            color: "grey",
            borderColor: "#e3f3ff",
            paddingLeft: padding,
            paddingRight: padding,
            //padding: "0px 5px",
            outline: "none",
            textTransform: "none",
            flexGrow: 1,
        };

        return (
            <div
                className="card"
                style={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <h2 style={{ display: "flex" }} aria-label="Case Map">
                    Case Map
                    <div
                        style={{
                            alignSelf: "flex-end",
                            marginLeft: "auto",
                            fontSize: "60%",
                        }}
                    >
                        <Acknowledgement></Acknowledgement>
                    </div>
                </h2>

                <div style={{ position: "relative" }}>
                    <div class="map-cont-controls" ref={this.mapContControls}>
                        <div ref={this.markersBGGroup} style={{ marginBottom: "8px" }}>
                            <div
                                style={{
                                    fontWeight: "bold",
                                    fontSize: "0.8em",
                                    marginLeft: "3px",
                                }}
                            >
                                Select Indicator <span style={{color: "gray"}}>⇊</span>
                            </div>
                            <select ref={this.markersSelect} style={{ width: "100%" }}>
                                <optgroup label="Basic Numbers">
                                    <option value="total">
                                        Total Cases
                                    </option>
                                    <option value="days_since">Days Since Last Case</option>
                                    <option value="status_active" selected>Active Cases</option>
                                    <option value="status_recovered">Recovered Cases</option>
                                    <option value="status_deaths">Deaths</option>
                                    <option value="status_icu">ICU</option>
                                    {/*<option value="status_icu_ventilators">ICU Ventilators</option>*/}
                                    <option value="status_hospitalized">Hospitalized</option>
                                </optgroup>
                                <optgroup label="Test Numbers">
                                    <option value="tests_total">Total People Tested</option>
                                </optgroup>
                                <optgroup label="Source of Infection">
                                    <option value="source_overseas">Contracted Overseas</option>
                                    <option value="source_community">
                                        Unknown Community Transmission
                                    </option>
                                    <option value="source_confirmed">
                                        Contracted from Confirmed Case
                                    </option>
                                    <option value="source_interstate">
                                        Contracted Interstate
                                    </option>
                                    <option value="source_under_investigation">
                                        Under Investigation
                                    </option>
                                </optgroup>
                            </select>
                        </div>

                        <div>
              <span
                  className="key"
                  style={{
                      alignSelf: "flex-end",
                      marginBottom: "5px",
                      display: "block"
                  }}
              >
                <ButtonGroup
                    ref={this.markersButtonGroup}
                    size="small"
                    aria-label="small outlined button group"
                    style={{ display: "flex" }}
                >
                  <Button
                      style={
                          this.state._timeperiod === "alltime"
                              ? activeStyles
                              : inactiveStyles
                      }
                      onClick={() => this.setTimePeriod("alltime")}
                  >
                    All
                  </Button>
                  <Button
                      style={
                          this.state._timeperiod === "7days"
                              ? activeStyles
                              : inactiveStyles
                      }
                      onClick={() => this.setTimePeriod("7days")}
                  >
                    7 Days
                  </Button>
                  <Button
                      style={
                          this.state._timeperiod === "14days"
                              ? activeStyles
                              : inactiveStyles
                      }
                      onClick={() => this.setTimePeriod("14days")}
                  >
                    14 Days
                  </Button>
                  <Button
                      style={
                          this.state._timeperiod === "21days"
                              ? activeStyles
                              : inactiveStyles
                      }
                      onClick={() => this.setTimePeriod("21days")}
                  >
                    21 Days
                  </Button>
                </ButtonGroup>
              </span>
                        </div>

                        <div
                            ref={this.underlayBGCont}
                            style={{ marginBottom: "8px" }}
                        >

                            {/* Hide the underlay controls by default with an "advanced" link */}
                            <div ref={el => {this.underlayShowDiv = el}}
                                  style={{ textAlign: "right", marginBottom: "-3px", marginTop: "-3px" }}>
                                <span
                                    onClick={() => {
                                        this.underlayShowDiv.style.display = 'none';
                                        this.underlayBGContCont.style.display = 'block';
                                    }}
                                    style={{
                                        color: "blue",
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                        fontSize: "0.9em",
                                        opacity: 0.6,
                                    }}>advanced ▾</span>
                            </div>

                            <div ref={el => {this.underlayBGContCont = el}}
                                 style={{ display: "none" }}>

                                <div
                                    style={{
                                        fontWeight: "bold",
                                        fontSize: "0.8em",
                                        marginLeft: "3px",
                                    }}
                                >
                                    Underlay
                                </div>
                                <select
                                    ref={this.otherStatsSelect}
                                    style={{ width: "100%" }}
                                ></select>
                            </div>
                        </div>
                    </div>

                    <div ref={(el) => (this.mapContainer = el)}></div>
                    <div
                        ref={(el) => (this.dsMapContainer = el)}
                        style={{ display: "none" }}
                    ></div>
                </div>

                <form className="map-slider-container"
                      ref={el => this.mapSliderCont = el}>
                    <label className="map-slider-item"
                           style={{width: "6em", textAlign: "center"}}>Time&nbsp;slider:</label>
                    <input className="map-slider-item"
                           ref={el => {this.mapSlider = el}}
                           style={{flexGrow: "1"}}
                           onChange={() => this._onMapTimeSlider()}
                           type="range" min="0" max="30" step="1" defaultValue="30" />
                    <label className="map-slider-item"
                           ref={el => {this.mapSliderLabel = el}}
                           style={{width: "3em", textAlign: "center"}}>{
                               new Date(this.state.maxDate||ConfirmedMapFns.getToday()).getDate()+'/'+
                               (new Date(this.state.maxDate||ConfirmedMapFns.getToday()).getMonth()+1)
                           }</label>
                </form>

                <span className="due">
          <ul
              ref={this.accuracyWarning}
              style={{ margin: "0px", padding: "0px" }}
          >
            <li
                style={{
                    color: "#555",
                    marginBottom: "2px",
                    paddingBottom: "0px",
                }}
            >
              Regional Case Map may not be up-to-date. Refer to state totals in
              Cases by State table for current statistics.
            </li>
            <li
                style={{
                    color: "#555",
                    marginBottom: "2px",
                    paddingBottom: "0px",
                }}
            >
              Displayed cases identify regions only, not specific addresses.
            </li>
            <li
                style={{
                    color: "#555",
                    marginBottom: "2px",
                    paddingBottom: "0px",
                }}
            >
              Zoom in for regional numbers. Click regions for history over time.
            </li>
            <li
                style={{
                    color: "#555",
                    marginBottom: "2px",
                    paddingBottom: "0px",
                }}
            >
              The time slider selects the current day. The "7/14/21 days" controls show the current day's value minus the value that many days ago.
            </li>
            <li style={{ color: "#555" }}>
              <div style={{ color: "#777", fontSize: "0.9em" }}>
                Regional data updated:{" "}
                  {this.stateUpdatedDates.length
                      ? this.stateUpdatedDates.map((item, index) => {
                          return (
                              <span style={{ margin: 0, padding: 0 }}>
                          {item[0]}&nbsp;({item[1]}):&nbsp;{item[2]}
                                  {index === this.stateUpdatedDates.length - 1
                                      ? ""
                                      : ";"}{" "}
                        </span>
                          );
                      })
                      : "loading, please wait..."}
              </div>
            </li>
          </ul>
        </span>
            </div>
        );
    }

    _onMapTimeSlider() {
        if (!this.mapSlider) {
            return;
        }
        let daysAgo = parseInt(this.mapSlider.max)-parseInt(this.mapSlider.value);
        let daysInMilliseconds = (24*60*60*1000);
        let maxDate = ConfirmedMapFns.getToday() - (daysInMilliseconds * daysAgo);

        if (!this.state.maxDate || this.state.maxDate !== maxDate) {
            this.setState({
                maxDate: maxDate
            });
        }
    }

    /*******************************************************************
     * Intialization after load
     *******************************************************************/

    componentDidMount() {
        const lng = this.state["lng"],
            lat = this.state["lat"],
            zoom = this.state["zoom"];
        this._firstTime = true;

        var bounds = [
            [101.6015625, -49.83798245308484], // Southwest coordinates
            [166.2890625, 0.8788717828324276], // Northeast coordinates
        ];

        // window.mapboxgl = mapboxgl;

        // ImportCDNJS("//cdn.maptiks.com/maptiks-mapbox-gl.min.js", "maptiks")
        //   .then(
        //     (maptiks) =>
        //       (maptiks.trackcode = "3e1711d4-2508-4a05-8f18-4eef755ab26f")
        //   )
        //   .then(() => {
        const map = (this.map = new mapboxgl.Map({
            container: this.mapContainer,
            // https://docs.mapbox.com/api/maps/#styles
            //style: 'mapbox://styles/mapbox/bright-v8',
            //style: 'mapbox://styles/mapbox/satellite-streets-v11',
            style: "mapbox://styles/mapbox/streets-v11",
            //style: 'mapbox://styles/mapbox/light-v10',
            //style: 'mapbox://styles/mapbox/dark-v10',
            //style: 'mapbox://styles/mapbox/outdoors-v11',
            center: [lng, lat],
            zoom: zoom,
            maptiks_id: "case",
            maxZoom: 9.5,
            maxBounds: bounds, // Sets bounds as max
            transition: {
                duration: 0,
                delay: 0,
            },
            fadeDuration: 0,
        }));
        // Disable map rotation
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        //dvAna functions
        var my = this;
        map.on("dragend", async (e) => {
            try {
                dvAna({
                    type: "Pan",
                    marker: my.state._markers.toString(),
                    period: my.state._timeperiod.toString(),
                    underlay:
                        my.state._underlay === null
                            ? "no underlay"
                            : my.state._underlay.toString(),
                    zoomLevel: map.getZoom(),
                    endLngLat: map.getCenter().toString(),
                });
            } catch (e) {
                return null;
            }
        });

        map.on("zoomend", async (e) => {
            try {
                dvAna({
                    type: "Zoom",
                    marker: my.state._markers.toString(),
                    period: my.state._timeperiod.toString(),
                    underlay:
                        my.state._underlay === null
                            ? "no underlay"
                            : my.state._underlay.toString(),
                    zoomLevel: map.getZoom(),
                    endLngLat: map.getCenter().toString(),
                });
            } catch (e) {
                return null;
            }
        });

        map.on("click", function (e) {
            try {
                map.dvAnaClickContext = my.state;
            } catch (e) {
                return null;
            }
        });

        // Add geolocate control to the map.
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true,
                },
                trackUserLocation: true,
            })
        );

        //Add zoom+fullscreen controls
        map.addControl(new mapboxgl.NavigationControl());
        map.addControl(new mapboxgl.FullscreenControl());

        map.on("load", () => {
            if (!this.otherStatsSelect) {
                // Control probably destroyed before loaded!
                return;
            }

            // Create map data instances
            var geoBoundaryInsts = (this.geoBoundaryInsts = {});
            for (var key of this.geoBoundaries.getAvailableGeoBoundaries()) {
                geoBoundaryInsts[key] = this.geoBoundaries.getGeoBoundary(
                    map,
                    key.split(":")[1],
                    key.split(":")[0]
                );
            }

            this.otherStatsSelect.current.onchange = () => {
                this.setUnderlay();
            };
            this.markersSelect.current.onchange = () => {
                this.setMarkers();
            };

            // Add markers: confirmed cases/hospitals
            // only for tas/nt at this point
            this.confirmedMarkers = [];
            confirmedData.forEach((item) => {
                this.confirmedMarkers.push(new ConfirmedMarker(map, item));
            });

            let callLater = () => {
                if (this.map.loaded()) {
                    this.mapLoaded = true;
                    this._updateMode();
                    this.forceUpdate();
                } else {
                    setTimeout(callLater, 50);
                }
            };
            callLater();
        });
        // });

        // Set the HTML *once only*!
        this.otherStatsSelect.current.innerHTML = this._getSelectHTML();

        // Create case data instances
        var stateUpdatedDates = (this.stateUpdatedDates = []);
        var addedStateUpdated = {};
        var caseDataInsts = (this.caseDataInsts = {});

        for (let key in regionsTimeSeries) {
            // key => "statename:schema"
            var d = (caseDataInsts[key] = {});
            var subheaders = regionsTimeSeries[key]["sub_headers"]; // CHECK ME!

            for (let subKey of subheaders) {
                // console.log(`${key}|${subKey}|alltime`)
                var inst = (caseDataInsts[
                    `${key}|${subKey}|alltime`
                    ] = new TimeSeriesDataSource(
                    `${key}|${subKey}|alltime`,
                    subKey,
                    regionsTimeSeries[key],
                    regionsDateIDs,
                    key.split(":")[1],
                    key.split(":")[0]
                ));

                if (
                    (!stateUpdatedDates.length || !(key in addedStateUpdated)) &&
                    key.split(":")[1] !== "statewide"
                ) {
                    addedStateUpdated[key] = null;
                    stateUpdatedDates.push([
                        key.split(":")[0],
                        key.split(":")[1],
                        inst.getUpdatedDate(),
                    ]);
                }

                caseDataInsts[
                    `${key}|${subKey}|7days`
                    ] = new TimeSeriesDataSourceForPeriod(
                    `${key}|${subKey}|7days`,
                    subKey,
                    regionsTimeSeries[key],
                    regionsDateIDs,
                    key.split(":")[1],
                    key.split(":")[0],
                    7
                );
                caseDataInsts[
                    `${key}|${subKey}|14days`
                    ] = new TimeSeriesDataSourceForPeriod(
                    `${key}|${subKey}|14days`,
                    subKey,
                    regionsTimeSeries[key],
                    regionsDateIDs,
                    key.split(":")[1],
                    key.split(":")[0],
                    14
                );
                caseDataInsts[
                    `${key}|${subKey}|21days`
                    ] = new TimeSeriesDataSourceForPeriod(
                    `${key}|${subKey}|21days`,
                    subKey,
                    regionsTimeSeries[key],
                    regionsDateIDs,
                    key.split(":")[1],
                    key.split(":")[0],
                    21
                );
            }
        }
        this.stateUpdatedDates.sort();

        // Create ABS stat instances
        var absStatsInsts = (this.absStatsInsts = {});
        for (var heading in absStats) {
            var absStatHeading = absStats[heading];
            for (var i = 0; i < absStatHeading["sub_headers"].length; i++) {
                var subHeader = absStatHeading["sub_headers"][i];
                absStatsInsts[subHeader] = new BigTableOValuesDataSource(
                    subHeader,
                    heading,
                    subHeader,
                    absStatHeading
                );
            }
        }

        this.mapLoaded = false;
    }

    componentWillUnmount() {
        this.map.remove();
        this.geoBoundaries.clearGeoBoundaryCache();
        this.geoBoundaryInsts = null;
    }

    /*******************************************************************
     * Mode update
     *******************************************************************/

    getCaseDataInst(stateName, state) {
        // stateName -> Australian state name
        // state -> React JS state, to allow for providing
        // the previous state when changing pages
        state = state || this.state;

        var schemas = [
            // In order of preference
            //'postcode',
            "lga",
            "hhs",
            "ths",
            "lhd",
            "sa3",
            "statewide",
        ];

        for (var schema of schemas) {
            var key = `${stateName}:${schema}|${state._markers}|${state._timeperiod}`;
            // console.log("TRYING: "+key+" "+(key in this.caseDataInsts));

            if (key in this.caseDataInsts) {
                return this.caseDataInsts[key];
            }
        }
        return null;
    }

    getGeoBoundariesInst(stateName, schema) {
        // TODO: allow for loading geojson/pbf on-demand!!
        return this.geoBoundaryInsts[`${stateName}:${schema}`];
    }

    setUnderlay() {
        this.setState({
            _underlay: this.otherStatsSelect.current.value,
        });
    }

    setMarkers() {
        var val = this.markersSelect.current.value;

        if (
            val === "status_active" ||
            val === "status_icu" ||
            val === "status_hospitalized"
        ) {
            this.setState({
                _timeperiod: "alltime",
                _markers: val,
            });
        } else {
            this.setState({
                _markers: val,
            });
        }
    }

    setTimePeriod(timeperiod) {
        this.setState({
            _timeperiod: timeperiod,
        });
    }

    _updateMode() {
        if (!this.geoBoundaryInsts || !this.confirmedMarkers) {
            return;
        }

        if (new Set(['total', 'status_active']).has(this.state._markers)) {
            // Show/hide markers depending on whether they are within 3 weeks
            // if in "total" or "active" mode, otherwise leave all hidden
            for (let marker of this.confirmedMarkers) {
                if (marker.getIsActive(
                    this.state.maxDate ? new Date(this.state.maxDate) : null
                )) {
                    marker.show();
                } else {
                    marker.hide();
                }
            }
        }

        for (let k in this.geoBoundaryInsts) {
            let inst = this.geoBoundaryInsts[k];
            inst.setMaxDate(new Date(this.state.maxDate));
        }

        if (this.state._markers === "days_since") {
            if (!this.dsMap) {
                ReactDOM.render(
                    <DaysSinceMap ref={(el) => (this.dsMap = el)} />,
                    this.dsMapContainer
                );
            }
            var runUntilLoaded = () => {
                if (!this.dsMap) {
                    setTimeout(runUntilLoaded, 50);
                    return;
                }
                this.mapContainer.style.display = "none";
                this.dsMapContainer.style.display = "block";
                this.markersButtonGroup.current.parentNode.style.display = "none";
                this.underlayBGCont.current.style.display = "none";
                this.mapSliderCont.style.display = 'none';
                this.dsMap.map.setZoom(this.map.getZoom());
                this.dsMap.map.setCenter(this.map.getCenter());
                this.dsMap.map.resize();
            };
            runUntilLoaded();
            return;
        }

        // Get the absolute max/min values among all the datasources
        // so that we can scale heatmap values for the entire of the
        // country
        var otherMaxMin = null,
            stateWideMaxMin = null,
            numStateWide = 0;

        this.statesAndTerritories.forEach((stateName) => {
            var caseDataInst = this.getCaseDataInst(stateName);
            if (!caseDataInst) {
                return;
            }
            var iMaxMinValues = caseDataInst.getMaxMinValues();

            if (caseDataInst.schema === "statewide") {
                if (!stateWideMaxMin) {
                    stateWideMaxMin = iMaxMinValues;
                }
                if (iMaxMinValues["max"] > stateWideMaxMin["max"]) {
                    stateWideMaxMin["max"] = iMaxMinValues["max"];
                }
                if (iMaxMinValues["min"] < stateWideMaxMin["min"]) {
                    stateWideMaxMin["min"] = iMaxMinValues["min"];
                }
                numStateWide += 1;
            } else {
                if (!otherMaxMin) {
                    otherMaxMin = iMaxMinValues;
                }
                if (iMaxMinValues["max"] > otherMaxMin["max"]) {
                    otherMaxMin["max"] = iMaxMinValues["max"];
                }
                if (iMaxMinValues["min"] < otherMaxMin["min"]) {
                    otherMaxMin["min"] = iMaxMinValues["min"];
                }
            }
        });

        if (numStateWide === 1) {
            // HACK: Because there's only one state level value,
            // there's likely no common point of comparison,
            // so at least tone it down!
            stateWideMaxMin["max"] *= 4;
        }

        this.statesAndTerritories.forEach((stateName) => {
            let absDataSource = this.absStatsInsts[this.state._underlay],
                casesDataSource = this.getCaseDataInst(stateName);

            if (!casesDataSource) {
                return;
            }

            let absGeoBoundariesInst = absDataSource ? this.getGeoBoundariesInst(stateName, "lga") : null,
                caseGeoBoundariesInst = this.getGeoBoundariesInst(stateName, casesDataSource.schema);

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.addCasesFillPoly(casesDataSource);
            if (absGeoBoundariesInst) absGeoBoundariesInst.addABSStatsFillPoly(absDataSource, otherMaxMin);

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.addLinePoly(casesDataSource, "rgba(0, 0, 0, 1.0)");
            if (absGeoBoundariesInst) absGeoBoundariesInst.addLinePoly(absDataSource, "rgba(0, 0, 0, 0.1)");

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.addHeatMap(casesDataSource);
        });

        // Make sure the map is fully loaded
        // before allowing a new change in tabs
        //this._disableControls();
        var enableControlsWhenMapReady = () => {
            if (this.map.loaded()) {
                this._enableControlsJob = null;
                this._enableControls();
            } else {
                this._enableControlsJob = setTimeout(enableControlsWhenMapReady, 50);
            }
        };
        if (this._enableControlsJob != null) {
            clearTimeout(this._enableControlsJob);
        }
        //this._enableControlsJob = setTimeout(enableControlsWhenMapReady, 50);
    }

    _resetMode(prevState) {
        if (!this.confirmedMarkers) {
            return;
        }
        for (let marker of this.confirmedMarkers) {
            marker.hide();
        }

        if (!this.geoBoundaryInsts) {
            return;
        } else if (prevState._markers === "days_since") {
            this.mapContainer.style.display = "block";
            this.dsMapContainer.style.display = "none";
            this.markersButtonGroup.current.parentNode.style.display = "block";
            this.underlayBGCont.current.style.display = "block";
            this.mapSliderCont.style.display = 'flex';
            this.map.setZoom(this.dsMap.map.getZoom());
            this.map.setCenter(this.dsMap.map.getCenter());
            this.map.resize();
            return;
        }

        this.statesAndTerritories.forEach((stateName) => {
            var absDataSource = this.absStatsInsts[prevState._underlay],
                casesDataSource = this.getCaseDataInst(stateName, prevState);

            if (!casesDataSource) {
                return;
            }
            var absGeoBoundariesInst = absDataSource ? this.getGeoBoundariesInst(stateName, "lga") : null,
                caseGeoBoundariesInst = this.getGeoBoundariesInst(stateName, casesDataSource.schema);

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.removeCasesFillPoly();
            if (absGeoBoundariesInst) absGeoBoundariesInst.removeABSStatsFillPoly();

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.removeLinePoly();
            if (absGeoBoundariesInst) absGeoBoundariesInst.removeLinePoly();

            if (caseGeoBoundariesInst) caseGeoBoundariesInst.removeHeatMap();
        });
    }
}

export default MbMap;
