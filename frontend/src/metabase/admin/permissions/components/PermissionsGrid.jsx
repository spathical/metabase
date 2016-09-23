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

const PERMISSION_TYPES = {
    "native": {
        header: "Raw Queries",
        options: {
            "write": {
                title: "Write raw queries",
                icon: "sql",
                iconColor: "#9CC177",
                bgColor: "#F6F9F2"
            },
            "read": { // FIXME: read
                title: "View raw queries",
                icon: "ellipsis",
                iconColor: "#F9D45C",
                bgColor: "#FEFAEE"
            }
        }
    },
    "schemas": {
        header: "Data Access",
        options: {
            "all": {
                title: "Unrestricted Access",
                icon: "check",
                iconColor: "#9CC177",
                bgColor: "#F6F9F2"
            },
            "controlled": {
                title: "Limited Access",
                icon: "ellipsis",
                iconColor: "#F9D45C",
                bgColor: "#FEFAEE"
            },
            "none": {
                title: "No access",
                icon: "close",
                iconColor: "#EEA5A5",
                bgColor: "#FDF3F3"
            }
        }
    },
    "tables": {
        header: "Data Access",
        options: {
            "all": {
                title: "Unrestricted Access",
                icon: "check",
                iconColor: "#9CC177",
                bgColor: "#F6F9F2"
            },
            "controlled": {
                title: "Limited Access",
                icon: "ellipsis",
                iconColor: "#F9D45C",
                bgColor: "#FEFAEE"
            },
            "none": {
                title: "No access",
                icon: "close",
                iconColor: "#EEA5A5",
                bgColor: "#FDF3F3"
            }
        }
    },
    "fields": {
        header: "Data Access",
        options: {
            "all": {
                title: "Unrestricted Access",
                icon: "check",
                iconColor: "#9CC177",
                bgColor: "#F6F9F2"
            },
            "none": {
                title: "No access",
                icon: "close",
                iconColor: "#EEA5A5",
                bgColor: "#FDF3F3"
            }
        }
    }
}
for (const id in PERMISSION_TYPES) {
    PERMISSION_TYPES[id].id = id;
    for (const value in PERMISSION_TYPES[id].options) {
        PERMISSION_TYPES[id].options[value].value = value;
    }
}

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

const GroupPermissionRow = ({ group, permissions, entity, data, onUpdatePermission, isLastRow, isLastColumn, isFirstColumn }) =>
    <div className="flex" style={getBorderStyles({ isLastRow, isLastColumn, isFirstColumn, isFirstRow: false })}>
        { permissions.map(permission =>
            <GroupPermissionCell
                key={permission.id}
                permission={permission}
                value={data[permission.id]}
                onUpdatePermission={(value) =>
                    onUpdatePermission({
                        groupId: group.id,
                        entityId: entity.id,
                        value: value,
                        updater: permission.updater,
                    })}
                isEditable={group.editable}
            />
        )}
    </div>

const GroupPermissionCell = ({ permission, value, onUpdatePermission, isEditable }) => {
    const option = permission.options[value];
    if (!option) {
        console.warn("Unknown value for permission", value, permission);
        return null;
    }

    return (
        <div className="flex-full flex layout-centered border-column-divider" style={{
            borderColor: LIGHT_BORDER,
            height: CELL_HEIGHT - 1,
            backgroundColor: permission.options[value].bgColor
        }}>
            <PopoverWithTrigger
                disabled={!isEditable}
                className="flex-full"
                triggerElement={
                    <Tooltip tooltip={option.title}>
                        <div
                            className={cx(S.cellButton, { [S.cellButton__editable]: isEditable })}
                            style={{ backgroundColor: permission.options[value].bgColor }}
                        >
                            <Icon
                                name={permission.options[value].icon}
                                width={28}
                                height={28}
                                style={{ color: permission.options[value].iconColor }}
                            />
                        </div>
                    </Tooltip>
               }
            >
                <AccessOptionList permission={permission} onUpdatePermission={onUpdatePermission} />
            </PopoverWithTrigger>
        </div>
    );
}

const AccessOption = ({ option, onUpdatePermission }) =>
    <div className="flex py2 px2 align-center" onClick={() => onUpdatePermission(option.value)}>
        <Icon name={option.icon} className={cx('mr1', option.iconColor )} />
        {option.title}
    </div>

const AccessOptionList = ({ permission, onUpdatePermission }) =>
    <ul className="py2">
        { Object.values(permission.options).map(option =>
            <li key={option.value}>
                <AccessOption option={option} onUpdatePermission={onUpdatePermission} />
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
    const permissions = Object.keys(grid.permissions).map(permission =>
        ({ ...PERMISSION_TYPES[permission], updater: grid.permissions[permission] })
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
                    data={grid.data[rowIndex] && grid.data[rowIndex][columnIndex]}
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
