/**
This file is licensed under the MIT license

Copyright (c) 2020 David Morrissey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import React from "react"

import 'mapbox-gl/dist/mapbox-gl.css'
import './ConfirmedMap.css'
import CovidMapControl from "./ConfirmedMap/CovidMapControl"
import UpdatedDatesDisplay from "./ConfirmedMap/MapControls/UpdatedDatesDisplay";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChartLine} from "@fortawesome/free-solid-svg-icons";


class WorldMap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.stateName = props.stateName || 'AU';

        this.stateUpdatedDates = []; // FIXME!!!
        this.accuracyWarning = React.createRef();
    }

    /*******************************************************************
     * HTML Template
     *******************************************************************/

    componentDidUpdate(prevProps, prevState, snapshot) {
    }

    render() {
        return (
            <div>
                <div style={{position: 'relative'}}>
                    <CovidMapControl ref={el => this.covidMapControl = el}
                                     onGeoDataChanged={this.__onGeoDataChanged.bind(this)}
                                     dataType={this.props.dataType}
                                     timePeriod={this.props.timePeriod}
                                     height={"75vh"}>
                    </CovidMapControl>
                </div>

                <div ref={el => this.explanations = el} style={{
                    width: "100%",
                    pointerEvents: "none",
                    marginTop: '-20px',
                    zIndex: 5000,
                    background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%,rgba(255,255,255,0.9) 15%)"
                }}>
                    <span className="due">
                        <ul ref={this.accuracyWarning} style={{margin: '0px', padding: '5px 20px'}}>
                            <li style={{color: '#555', marginBottom: '2px', paddingBottom: '0px'}}>
                                <span style={{fontWeight: 'bold'}}>🔍&nbsp;Zoom in</span> for regional numbers.
                                <b>🖱️&nbsp;Click</b> or <b>👆&nbsp;tap</b> regions for history over time.
                            </li>

                            <li style={{color: "#555", marginBottom: "2px", paddingBottom: "0px"}}>
                                The <input type="range" style={{width: "35px", height: "1em", pointerEvents: "none"}} /> <b>time slider</b>&nbsp;
                                selects the <i>current day</i>. The 7/21 days controls show the current day's
                                value minus the value 7 or 21 days before the current day. Negative numbers in this mode mean the
                                value is that amount less than it was that many days ago.<br/>

                                The <FontAwesomeIcon icon={faChartLine} />&nbsp;<b>Growth Change</b> icon
                                graphs the <a href="https://en.wikipedia.org/wiki/Exponential_growth">exponential change in growth</a> for
                                each region over 50 days.&nbsp;

                                A downwards trajectory means infections are slowing down.&nbsp;

                                The graph is normalized for each region over the whole 50 days, and is meant only to give an
                                indication whether the <a href="https://en.wikipedia.org/wiki/Rate_(mathematics)#Of_change">rate of change</a> is
                                getting higher or lower, not to compare between regions and does not show case numbers.&nbsp;

                                The green or red color key shows change in the number of cases over the last 14 days, allowing
                                basic regional comparisons.
                            </li>

                            <li style={{color: '#555'}}>
                                <div style={{color: '#777', fontSize: '0.9em'}}>
                                    World data updated: <span ref={
                                        (el) => this.__updatedSpan = el
                                    }><UpdatedDatesDisplay ref={el => {this.__updatedDatesDisplay = el}}/></span>
                                </div>
                            </li>
                        </ul>
                    </span>
                </div>
            </div>
        );
    }

    /**
     *
     * @param geoDataInsts
     * @param caseDataInsts
     * @private
     */
    __onGeoDataChanged(geoDataInsts, caseDataInsts) {

        this.__geoDataInsts = geoDataInsts;
        this.__caseDataInsts = caseDataInsts;

        if (this.__updatedDatesDisplay) {
            this.__updatedDatesDisplay.setValue(geoDataInsts, caseDataInsts);
        }
    }

    /*******************************************************************
     * Intialization after load
     *******************************************************************/

    componentDidMount() {
        //this.explanations.parentNode.removeChild(this.explanations);
        //this.covidMapControl.addToMapContainer(this.explanations);
        this.__restrictToISO_3166_2(this.stateName);
    }

    componentWillUnmount() {
    }

    /*******************************************************************
     * Events
     *******************************************************************/

    /**
     *
     * @param iso_3166_2
     * @private
     */
    __restrictToISO_3166_2(iso_3166_2) {
        this.setState({
            iso_3166_2_tabs: iso_3166_2
        });
        iso_3166_2 = iso_3166_2 === 'all' ? null : iso_3166_2;
        this.covidMapControl.setBoundsToRegion(iso_3166_2);
    }
}

export default WorldMap;
