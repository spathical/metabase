import React, { Component } from "react";
import { Link } from "react-router";

import _ from "underscore";
import cx from "classnames";

import { AngularResourceProxy } from "metabase/lib/redux";

import CheckBox from "metabase/components/CheckBox.jsx";

import AdminContentTable from "./AdminContentTable.jsx";
import DatabasesLeftNavPane from "./DatabasesLeftNavPane.jsx";
import DatabaseGroupSelector from "./DatabaseGroupSelector.jsx";
import Permissions from "./Permissions.jsx";
import Icon from "metabase/components/Icon.jsx";
import PopoverWithTrigger from "metabase/components/PopoverWithTrigger.jsx";

const PermissionsAPI = new AngularResourceProxy("Permissions", ["groupDetails", "databaseDetails", "databasePermissions", "schemaPermissions", "updateSchemaPermissions", "createTablePermissions", "deleteTablePermissions"]);

// ------------------------------------------------------------ Breadcrumbs ------------------------------------------------------------

function Breadcrumb({ database, groupID, schema }) {
    return (
        <div className="py4 h3 text-bold">
            <Link to={"/admin/permissions/databases/" + database.id + "/groups/" + groupID} className="link no-decoration">
                {database.name}
                <span className="mx2">
                    &gt;
                </span>
            </Link>
            {schema}
        </div>
    );
}


// ------------------------------------------------------------ Access Type Selector ------------------------------------------------------------

function AccessTypeSelector({ accessType, onChangeAccessType }) {
    const unrestricted = accessType === "unrestricted";
    return (
        <div className="my4">
            <div className="h5 text-grey-3">
                TABLE PERMISSIONS FOR THIS SCHEMA
            </div>
            <p className={cx({"text-brand": unrestricted, "cursor-pointer": !unrestricted})}
                 onClick={!unrestricted ? onChangeAccessType.bind(null, "unrestricted") : null}
            >
                All tables, including ones added later
            </p>
            <p className={cx({"text-brand": !unrestricted, "cursor-pointer": unrestricted})}
                 onClick={unrestricted ? onChangeAccessType.bind(null, "some_tables") : null}
            >
                Only the tables I select
            </p>
        </div>
    );
}


// ------------------------------------------------------------ Tables Table ------------------------------------------------------------

function TablesTableRow({ table, editable, onTableToggled }) {
    return (
        <tr>
            <td>
                {editable ? (
                     <CheckBox className="inline-block mr2" checked={table.access_type !== "no_access"} onChange={onTableToggled.bind(null, table)} />
                 ) : null}
                {table.name}
            </td>
        </tr>
    );
}

function TablesTable({ tables, editable, onTableToggled }) {
    return (
        <AdminContentTable columnTitles={["Accessible tables"]}>
            {tables && tables.map((table, index) =>
                <TablesTableRow key={index} table={table} editable={editable} onTableToggled={onTableToggled} />
             )}
        </AdminContentTable>
    );
}


// ------------------------------------------------------------ Logic ------------------------------------------------------------

export default class GridPermssions extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            schemaPermissions: null,
        };
    }

    onChangeAccessType(newAccessType) {
        const groupID = Number.parseInt(this.props.params.groupID);
        const databaseID = Number.parseInt(this.props.params.databaseID);
        const schema = this.props.params.schema;

        PermissionsAPI.updateSchemaPermissions({databaseID: databaseID,
                                                groupID: groupID,
                                                schema: schema,
                                                unrestricted_table_access: newAccessType === "unrestricted"}, (function (newSchemaPermissions) {
            this.setState({
                schemaPermissions: newSchemaPermissions
            });

        }).bind(this), function(error) {
            console.error("Error updating schema permissions:", error);
            if (error.data && typeof error.data === "string") alert(error.data);
        });
    }


    createTablePermissions(tablePermissions) {
        const groupID = Number.parseInt(this.props.params.groupID);

        PermissionsAPI.createTablePermissions({tableID: tablePermissions.table_id,
                                               groupID: groupID}).then((function (newPermissions) {
            tablePermissions.id = newPermissions.id;
            tablePermissions.access_type = "all_fields";
            this.forceUpdate();
        }).bind(this), function(error) {
            console.error("Error creating TablePermissions:", error);
            if (error.data && typeof error.data === "string") alert(error.data);
        });
    }

    deleteTablePermissions(tablePermissions) {
        const groupID = Number.parseInt(this.props.params.groupID);

        PermissionsAPI.deleteTablePermissions({tableID: tablePermissions.table_id,
                                               groupID: groupID
        }).then((function () {
            tablePermissions.id = null;
            tablePermissions.access_type = "no_access";
            this.forceUpdate();
        }).bind(this), function(error) {
            console.error("Error deleting TablePermissions:", error);
            if (error.data && typeof error.data === "string") alert(error.data);
        });
    }

    onTableToggled(tablePermissions) {
        if (!tablePermissions.id) {
            this.createTablePermissions(tablePermissions);
        } else {
            this.deleteTablePermissions(tablePermissions);
        }
    }

    permissionsForGroup(groupId) {
    }

    render() {
        let { location: { pathname }, params: { databaseID, groupID, schema }, databases, groups, schemaPermissions } = this.props;

        schemaPermissions = this.state.schemaPermissions || schemaPermissions || {};

        if (databaseID) databaseID = Number.parseInt(databaseID);
        if (groupID)    groupID    = Number.parseInt(groupID);

        const database = _.findWhere(databases, {id: databaseID}) || {};

        const sources = this.state.sources || databases

        return (
          <div className="flex full-height flex-column">
              <div className="wrapper flex-full"> 
                  <div className="py1">
                      <h1>Permissions</h1>
                  </div>
                  <div className="flex">
                      <div>
                          <div className="flex">
                              <Icon name='database' />
                              <h3>Databases</h3>
                          </div>
                          { sources && sources.map(source =>
                              <div
                                  style={{ height: CELL_STYLES.height }}
                              >
                                  <h3>{source.name}</h3>
                                  <a className="link block" onClick={() => console.log('swtich source')}>View schemas</a>
                              </div>
                          )}
                      </div>
                      { groups && groups.map((group, index) => <GroupDetail group={group} sources={sources} key={index} fetchDetails={this.props.fetchGroupDetails} />) }
                  </div>
              </div>
              <div className="border-top py3">
                  <div className="wrapper">
                      <button className="Button Button--primary">Save changes</button>
                  </div>
              </div>
          </div>
        );
    }
}

const CELL_HEIGHT = 60;

/* unrestricted, all_schemas, some_schemas, no_access */

const bgColorForPermission = {
    'unrestricted': '#F6F9F2',
    'all_schemas': '#F6F9F2',
    'no_access': '#FDF3F3',
    'some_schemas': '#FEFAEE'
}

const iconForPermission = {
    'unrestricted': 'check',
    'all_schemas': 'check',
    'no_access': 'close',
    'some_schemas': 'bg-yellow'
}

const iconColorsForPermission = {
    'unrestricted': 'text-green',
    'all_schemas': 'text-green',
    'no_access': 'text-danger',
    'some_schemas': 'text-gold'
}

const CELL_STYLES = {
    height: CELL_HEIGHT,
    padding: 70
}

const GroupPermissionCell = ({ permission, changePermission }) =>
    <div
        className="flex align-center justify-center"
        style={Object.assign({}, CELL_STYLES, { backgroundColor: bgColorForPermission[permission.access_type]})}
   >
        <Icon
            name={iconForPermission[permission.access_type]}
            width='28'
            height='28'
            className={iconColorsForPermission[permission.access_type]}
        />
    </div>


GroupPermissionCell.defaultProps = {
    permission: {
        access_type: ''
    }
}


const GroupPermissionRow = ({ access }) =>
    <div className="flex border-bottom">
        <GroupPermissionCell permission={access} />
        <GroupPermissionCell permission={access} />
    </div>

const GroupPermissionHeader = ({header}) => <h3>{header}</h3>

class GroupDetail extends Component {
    constructor () {
        super()
        this.state = {}
    }

    componentDidMount () {
        PermissionsAPI.groupDetails({ id: this.props.group.id }).then(
            (details) => this.setState({ databases: details.databases })
        )
    }

    render () {
       const { sources, group } = this.props
       const { databases } = this.state
       return (
            <div className="border-right">
                <h3 className="text-centered full my1">{ group.name }</h3>
                <div className="flex border-bottom border-top">
                    <div className="flex-full text-centered py1">
                        <GroupPermissionHeader header='SQL Access' />
                    </div>
                    <div className="flex-full text-centered border-left py1">
                        <GroupPermissionHeader header='Schema Access' />
                    </div>
                </div>
                { sources.map((source, index) =>
                    <GroupPermissionRow
                        access={_.findWhere(databases, {database_id: source.id })}
                        key={index}
                        test='text'
                    />
                )}
            </div>
       )
    }
}
