/* eslint-disable react/display-name */

import React, { Component, PropTypes } from "react";

import { Link } from "react-router";

import PopoverWithTrigger from "metabase/components/PopoverWithTrigger.jsx";
import Tooltip from "metabase/components/Tooltip.jsx";
import Icon from "metabase/components/Icon.jsx";

import FixedHeaderGrid from "./FixedHeaderGrid.jsx";

import { capitalize, pluralize } from "metabase/lib/formatting";
import cx from "classnames";

import S from "./PermissionsGrid.css";

const LIGHT_BORDER = "rgb(225, 226, 227)";
const DARK_BORDER = "rgb(114, 116, 121)";
const BORDER_RADIUS = 4;

const getBorderStyles = ({ isFirstColumn, isLastColumn, isFirstRow, isLastRow }) => ({
    overflow: "hidden",
    border: "1px solid " + LIGHT_BORDER,
    borderTopWidth: isFirstRow ? 1 : 0,
    borderRightWidth: isLastColumn ? 1 : 0,
    borderLeftColor: isFirstColumn ? LIGHT_BORDER : DARK_BORDER,
    borderTopRightRadius: isLastColumn && isFirstRow ? BORDER_RADIUS : 0,
    borderTopLeftRadius: isFirstColumn && isFirstRow ? BORDER_RADIUS : 0,
    borderBottomRightRadius: isLastColumn && isLastRow ? BORDER_RADIUS : 0,
    borderBottomLeftRadius: isFirstColumn && isLastRow ? BORDER_RADIUS : 0,
})

const CELL_HEIGHT = 176;
const CELL_WIDTH = 246;
const HEADER_HEIGHT = 100;
const HEADER_WIDTH = 170;

const PERMISSIONS_UI = {
    "native": {
        header: "Raw Queries"
    },
    "schemas": {
        header: "Data Access"
    },
    "tables": {
        header: "Data Access"
    },
    "fields": {
        header: "Data Access",
    }
};

const OPTIONS_UI = {
    "write": {
        title: "Write raw queries",
        icon: "sql",
        iconColor: "#9CC177",
        bgColor: "#F6F9F2"
    },
    "read": {
        title: "View raw queries",
        icon: "eye",
        iconColor: "#F9D45C",
        bgColor: "#FEFAEE"
    },
    "all": {
        title: "Unrestricted access",
        icon: "check",
        iconColor: "#9CC177",
        bgColor: "#F6F9F2"
    },
    "controlled": {
        title: "Limited access",
        icon: "tilde",
        iconColor: "#F9D45C",
        bgColor: "#FEFAEE"
    },
    "none": {
        title: "No access",
        icon: "close",
        iconColor: "#EEA5A5",
        bgColor: "#FDF3F3"
    },
    "unknown": {
        icon: "unknown",
        iconColor: "#9BA5B1",
        bgColor: "#DFE8EA"
    }
}

const getOptionUi = (option) =>
    OPTIONS_UI[option] || { ...OPTIONS_UI.unknown, title: option };

const GroupPermissionHeader = ({ group, permissions, isLastColumn, isFirstColumn }) =>
    <div className="absolute bottom left right">
        <h4 className="text-centered full my1">{ group.name }</h4>
        <div className="flex" style={getBorderStyles({ isLastColumn, isFirstColumn, isFirstRow: true, isLastRow: false })}>
            { permissions.map((permission, index) =>
                <div key={permission.id} className="flex-full py1 border-column-divider" style={{
                    borderColor: LIGHT_BORDER,
                }}>
                    <h5 className="text-centered text-grey-3 text-uppercase text-light">{permission.header}</h5>
                </div>
            )}
        </div>
    </div>

const GroupPermissionRow = ({ group, permissions, entity, onUpdatePermission, isLastRow, isLastColumn, isFirstColumn }) =>
    <div className="flex" style={getBorderStyles({ isLastRow, isLastColumn, isFirstColumn, isFirstRow: false })}>
        { permissions.map(permission =>
            <GroupPermissionCell
                key={permission.id}
                permission={permission}
                group={group}
                entity={entity}
                onUpdatePermission={(value) =>
                    onUpdatePermission({
                        groupId: group.id,
                        entityId: entity.id,
                        value: value,
                        updater: permission.updater,
                        postAction: permission.postAction
                    })}
                isEditable={group.editable}
            />
        )}
    </div>

class GroupPermissionCell extends Component {
    render() {
        const { permission, group, entity, onUpdatePermission } = this.props;

        const value = permission.getter(group.id, entity.id);
        const options = permission.options(group.id, entity.id);

        let isEditable = this.props.isEditable && options.filter(option => option !== value).length > 0;

        return (
            <div className="flex-full flex layout-centered border-column-divider" style={{
                borderColor: LIGHT_BORDER,
                height: CELL_HEIGHT - 1,
                backgroundColor: getOptionUi(value).bgColor
            }}>
                <PopoverWithTrigger
                    ref="popover"
                    disabled={!isEditable}
                    className="flex-full"
                    triggerElement={
                        <Tooltip tooltip={getOptionUi(value).title}>
                            <div
                                className={cx(S.cellButton, { [S.cellButton__editable]: isEditable })}
                                style={{ backgroundColor: getOptionUi(value).bgColor }}
                            >
                                <Icon
                                    name={getOptionUi(value).icon}
                                    width={28}
                                    height={28}
                                    style={{ color: getOptionUi(value).iconColor }}
                                />
                            </div>
                        </Tooltip>
                   }
                >
                    <AccessOptionList
                        value={value}
                        options={options}
                        permission={permission}
                        onUpdatePermission={(...args) => {
                            onUpdatePermission(...args);
                            this.refs.popover.close();
                        }}
                    />
                </PopoverWithTrigger>
            </div>
        );
    }
}

const AccessOption = ({ value, option, onUpdatePermission }) =>
    <div
        className={cx("flex py2 px2 align-center bg-brand-hover text-white-hover", {
            "bg-brand text-white": value === option
        })}
        onClick={() => onUpdatePermission(option)}
    >
        <Icon name={getOptionUi(option).icon} className="mr1" style={{ color: getOptionUi(option).iconColor }} size={18} />
        {getOptionUi(option).title}
    </div>

const AccessOptionList = ({ value, options, onUpdatePermission }) =>
    <ul className="py1">
        { options.map(option =>
            <li key={option}>
                <AccessOption value={value} option={option} onUpdatePermission={onUpdatePermission} />
            </li>
        )}
    </ul>

const EntityPermissionHeader = ({ entity }) =>
    <div
        className="flex flex-column layout-centered px1"
        style={{
            height: CELL_HEIGHT
        }}
    >
        <h4 className="text-centered">{entity.name}</h4>
        { entity.link &&
            <Link className="mt1 link" to={entity.link.url}>{entity.link.name}</Link>
        }
    </div>

const CornerHeader = ({ grid }) =>
    <div className="absolute bottom left right flex flex-column align-center pb1">
        { grid.type !== "database" &&
            <a className="link mb1" href="#" onClick={() => window.history.back()}>Back</a>
        }
        <div className="flex align-center">
            <Icon name={grid.type} size={16} />
            <h3 className="ml1">{capitalize(pluralize(grid.type))}</h3>
        </div>
    </div>

const PermissionsGrid = ({ className, grid, onUpdatePermission }) => {
    const permissions = Object.entries(grid.permissions).map(([id, permission]) =>
        ({ id: id, ...PERMISSIONS_UI[id], ...permission })
    );
    return (
        <FixedHeaderGrid
            className={className}

            rowsCount={grid.entities.length}
            columnsCount={grid.groups.length}

            columnWidth={CELL_WIDTH}
            rowHeight={CELL_HEIGHT}
            columnHeaderHeight={HEADER_HEIGHT}
            rowHeaderWidth={HEADER_WIDTH}

            renderCell={({ columnIndex, rowIndex }) =>
                <GroupPermissionRow
                    group={grid.groups[columnIndex]}
                    permissions={permissions}
                    entity={grid.entities[rowIndex]}
                    onUpdatePermission={onUpdatePermission}
                    isFirstRow={rowIndex === 0}
                    isLastRow={rowIndex === grid.entities.length - 1}
                    isFirstColumn={columnIndex === 0}
                    isLastColumn={columnIndex === grid.groups.length - 1}
                />
            }
            renderColumnHeader={({ columnIndex }) =>
                <GroupPermissionHeader
                    group={grid.groups[columnIndex]}
                    permissions={permissions}
                    isFirstColumn={columnIndex === 0}
                    isLastColumn={columnIndex === grid.groups.length - 1}
                />
            }
            renderRowHeader={({ rowIndex }) =>
                <EntityPermissionHeader
                    entity={grid.entities[rowIndex]}
                    isFirstRow={rowIndex === 0}
                    isLastRow={rowIndex === grid.entities.length - 1}
                />
            }
            renderCorner={() =>
                <CornerHeader
                    grid={grid}
                />
            }
        />
    );
}

export default PermissionsGrid;
