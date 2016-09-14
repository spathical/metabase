import React, { Component } from "react";
import { connect } from "react-redux";

import { getDatabases, getGroups, getSchemaPermissions } from "../selectors";
import { fetchDatabases, fetchGroups, fetchGroupDetails, fetchSchemaPermissions } from "../permissions";

import GridPermissions from "../components/GridPermissions.jsx";


function mapStateToProps(state, props) {
    return {
        databases: getDatabases(state, props),
        groups: getGroups(state, props),
        schemaPermissions: getSchemaPermissions(state, props)
    };
}

const mapDispatchToProps = {
    fetchDatabases,
    fetchGroups,
    fetchSchemaPermissions,
    fetchGroupDetails
};

@connect(mapStateToProps, mapDispatchToProps)
export default class GridPermissionsApp extends Component {
    async componentWillMount() {
        await this.props.fetchDatabases();
        await this.props.fetchGroups();
        await this.props.fetchSchemaPermissions(this.props.routeParams);
    }

    render() {
        return (
            <GridPermissions {...this.props} />
        );
    }
}
