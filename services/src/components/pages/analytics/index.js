import React from "react";
import {UsageAnalysis} from "../../analysis/usageAnalysis";

/**
 * function to display usage analysis
 * @returns {Element}
 * @constructor
 */
const Analytics = () => {
    return (
        <div style={{height: "100vh"}}>
            <UsageAnalysis/>
        </div>
    );
}

export default Analytics;