import React, { Component, PropTypes } from "react";
import { connect } from "react-redux";

import cx from "classnames";

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper.jsx";
import Confirm from "metabase/components/Confirm.jsx";
import PermissionsGrid from "../components/PermissionsGrid.jsx";
import PermissionsConfirm from "../components/PermissionsConfirm.jsx";

import { getPermissionsGrid, getDirty, getSaveError, getDiff } from "../selectors";
import { updatePermission, savePermissions, loadPermissions } from "../permissions"

const mapStateToProps = (state, props) => {
    return {
        grid: getPermissionsGrid(state, props),
        isDirty: getDirty(state, props),
        saveError: getSaveError(state, props),
        diff: getDiff(state, props)
    }
}

const mapDispatchToProps = {
    onUpdatePermission: updatePermission,
    onSave: savePermissions,
    onCancel: loadPermissions,
};

@connect(mapStateToProps, mapDispatchToProps)
export default class PermissionsGridApp extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
        };
    }

    static propTypes = {};
    static defaultProps = {};

    render() {
        const { grid, onUpdatePermission, onSave, onCancel, isDirty, saveError, diff } = this.props;
        return (
            <LoadingAndErrorWrapper loading={!grid} className="flex-full flex flex-column">
            { () =>
                <div className="flex-full flex flex-column">
                    <PermissionsGrid
                        className="flex-full"
                        grid={this.props.grid}
                        onUpdatePermission={onUpdatePermission}
                    />
                    <div className="flex-no-shrink p4 flex border-top flex align-center">
                        <Confirm title="Save permissions?" action={onSave} content={
                            <PermissionsConfirm diff={diff} />
                        }>
                            <button className={cx("Button", { disabled: !isDirty })}>Save Changes</button>
                        </Confirm>
                        <button className="Button Button--borderless" onClick={onCancel}>Cancel</button>
                        { saveError && <div className="mx2 text-error">{saveError}</div> }
                    </div>
                </div>
            }
            </LoadingAndErrorWrapper>
        );
    }
}
