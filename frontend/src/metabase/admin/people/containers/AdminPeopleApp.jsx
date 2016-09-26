/* eslint "react/prop-types": "warn" */
import React, { Component, PropTypes } from "react";

import { LeftNavPane, LeftNavPaneItem } from "metabase/components/LeftNavPane.jsx";

export default class AdminPeopleApp extends Component {
    render() {
        const title = "People"
        const { location: { pathname }, children } = this.props;
        return (
            <div className="flex">
                { title }
                <LeftNavPane>
                    <LeftNavPaneItem name="People" path="/admin/people" selected={pathname.startsWith('admin/people')} />
                    <LeftNavPaneItem name="Groups" path="/admin/people/groups" selected={pathname.startsWith('admin/people/groups')} />
                </LeftNavPane>
                <div className="flex-full">
                    {children}
                </div>
            </div>
        );
    }
}
