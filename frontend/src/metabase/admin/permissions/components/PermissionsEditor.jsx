import React, { Component, PropTypes } from "react";

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper.jsx";
import Confirm from "metabase/components/Confirm.jsx";
import PermissionsGrid from "../components/PermissionsGrid.jsx";
import PermissionsConfirm from "../components/PermissionsConfirm.jsx";

import cx from "classnames";

const PermissionsEditor = ({ grid, onUpdatePermission, onSave, onCancel, isDirty, saveError, diff }) =>
    <LoadingAndErrorWrapper loading={!grid} className="flex-full flex flex-column">
    { () =>
        <div className="flex-full flex flex-column">
            <PermissionsGrid
                className="flex-full"
                grid={grid}
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

export default PermissionsEditor;
