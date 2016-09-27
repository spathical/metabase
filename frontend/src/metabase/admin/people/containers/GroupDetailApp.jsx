import React, { Component } from "react";
import { connect } from "react-redux";

import { getGroup, getGroups, getUsers } from "../selectors";
import { loadGroups, loadGroupDetails, fetchUsers } from "../people";

import GroupDetail from "../components/GroupDetail.jsx";

function mapStateToProps(state, props) {
    return {
        group: getGroup(state, props),
        groups: getGroups(state, props),
        users: getUsers(state, props)
    };
}

const mapDispatchToProps = {
    loadGroups,
    loadGroupDetails,
    fetchUsers
};

@connect(mapStateToProps, mapDispatchToProps)
export default class GroupDetailApp extends Component {
    async componentWillMount() {
        await this.props.loadGroups();
        await this.props.fetchUsers();
    }

    async componentWillReceiveProps(nextProps) {
        const groupID = this.props.routeParams.groupID;
        const nextGroupID = nextProps.routeParams.groupID;

        if (this.props.group && groupID === nextGroupID) return;

        await this.props.loadGroupDetails(nextGroupID);
    }

    render() {
        return <GroupDetail {...this.props} />;
    }
}
