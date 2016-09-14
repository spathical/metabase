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
import Tooltip from "metabase/components/Tooltip.jsx";

const PermissionsAPI = new AngularResourceProxy("Permissions", ["groupDetails", "databaseDetails", "databasePermissions", "schemaPermissions", "updateSchemaPermissions", "createTablePermissions", "deleteTablePermissions", "updateDatabasePermissions"]);

const MetadataAPI = new AngularResourceProxy("Metabase", ["db_metadata"]);

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
            sourceType: 'database'
        };
        this.getSchemasForDB = this.getSchemasForDB.bind(this)
        this.back = this.back.bind(this)
    }

    getSchemasForDB (dbID) {
        PermissionsAPI.databaseDetails({ id: dbID }).then(
            (details) =>
                MetadataAPI.db_metadata({ dbId: dbID}).then((data) => {
                    console.log('db data', data)
                    this.setState({
                        sources: data.tables,
                        sourceType: 'tables'
                    })
                })
        )
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

    back () {
        this.setState({ sources: null, sourceType: 'database' })
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
                  <div className="py2">
                      <h1>Permissions</h1>
                  </div>
                  <div className="flex">
                    
                      <SourceList
                        sources={sources}
                        detailsFn={this.getSchemasForDB}
                        sourceType={this.state.sourceType}
                        back={this.back} 
                      />
                      {
                          groups && groups.map((group, index) =>
                              <GroupDetail
                                  group={group}
                                  sources={sources}
                                  key={index}
                                  fetchDetails={
                                      this.state.sourceType === 'database' ?
                                      PermissionsAPI.groupDetails
                                      :
                                      PermissionsAPI.schemaPermissions
                                  }
                                  resolveFunction={
                                      this.state.sourceType === 'database' ?
                                      (details) => details.databases
                                      :
                                      (details) => console.log('details', details)
                                  }
                                  showSQL={this.state.sourceType === 'database'}
                              />
                         )
                      }
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
    'some_schemas': 'ellipsis'
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

const accessOptions = [
    'unrestricted',
    'all_schemas',
    'no_access'
]

const accessOptionNames = {
    'unrestricted': 'Unrestricted access',
    'all_schemas': 'No SQL access',
    'some_schemas': 'Some schemas',
    'no_access': 'No access'
}

const AccessOption = ({ id, icon, access, accessName, setAccess }) =>
    <div className="flex py2 px2 align-center" onClick={ () => setAccess(access, id) }>
        <Icon name={icon} className={cx('mr1', iconColorsForPermission[access] )} />
        { accessName }
    </div>

const AccessOptionList = ({ id, setAccess }) =>
    <ul className="py2">
        { accessOptions.map((option, index) =>
            <li key={index}>
                <AccessOption
                    icon={iconForPermission[option]}
                    accessName={accessOptionNames[option]}
                    access={option}
                    setAccess={setAccess}
                    id={id}
                />
            </li>
        )}
    </ul>

const GroupPermissionCell = ({ id, icon, permission, setAccess }) =>
    <PopoverWithTrigger
        className="flex-full"
       triggerElement={
           <Tooltip tooltip={accessOptionNames[permission.access_type]}>
                <div
                    className="flex flex-full align-center justify-center"
                    style={Object.assign({}, CELL_STYLES, { backgroundColor: bgColorForPermission[permission.access_type]})}
               >
                    <Icon
                        name={icon ? icon : iconForPermission[permission.access_type]}
                        width='28'
                        height='28'
                        className={iconColorsForPermission[permission.access_type]}
                    />
                </div>
            </Tooltip>
       }
    >
        <AccessOptionList setAccess={setAccess} id={id} />
    </PopoverWithTrigger>


GroupPermissionCell.defaultProps = {
    permission: {
        access_type: ''
    }
}

const SourceList = ({ sources, sourceType, detailsFn, back }) =>
  <div>
      <div className="flex">
          { sourceType === 'tables' && <a onClick={() => back() }>Back</a> }
          <Icon name={sourceType} />
          <h3>{sourceType}</h3>
      </div>
      { sources && sources.map(source =>
          <div
              style={Object.assign({}, CELL_STYLES, { paddingLeft: 0 })}
          >
              <h3>{source.name}</h3>
              <a
                className="link block"
                onClick={() => detailsFn(source.id)}>View schemas</a>
          </div>
      )}
  </div>


const GroupPermissionRow = ({ id, access, showSQL, setAccess }) =>
    <div className="flex border-bottom">
        { showSQL &&<GroupPermissionCell permission={access} icon='sql' setAccess={setAccess} id={id} /> }
        <GroupPermissionCell permission={access} setAccess={setAccess} id={id} />
    </div>

const GroupPermissionHeader = ({header}) => <h3>{header}</h3>

class GroupDetail extends Component {
    constructor (props) {
        super(props)
        this.state = {}
        this.setAccess = this.setAccess.bind(this)
    }

    componentDidMount () {
        const { fetchDetails, group, resolveFunction } = this.props

        fetchDetails({ id: group.id }).then(
            (details) =>
                this.setState({
                    sources: resolveFunction(details)
                })
        )

    }
    
    componentDidUpdate () {
        const { fetchDetails, group, resolveFunction } = this.props

        fetchDetails({ id: group.id }).then(
            (details) =>
                this.setState({
                    sources: resolveFunction(details)
                })
        )

    }
    
    setAccess (accessType, sourceID) {
        PermissionsAPI.updateDatabasePermissions({
            groupID: this.props.group.id,
            databaseID: sourceID,
            access_type: accessType
        })
        .then((response) =>
            this.forceUpdate()
        )
    }

    render () {
       const { sources, group, showSQL } = this.props
       return (
            <div className="border-right" style={{ minWidth: 330 }}>
                <h3 className="text-centered full my1">{ group.name }</h3>
                <div className="flex border-bottom border-top">
                    { showSQL && (
                        <div className="flex-full text-centered py1">
                            <GroupPermissionHeader header='SQL Access' />
                        </div>
                    )}
                    <div className="flex-full text-centered border-left py1">
                        <GroupPermissionHeader header='Schema Access' />
                    </div>
                </div>
                { sources.map((source, index) =>
                    <GroupPermissionRow
                        access={_.findWhere(this.state.sources, { database_id: source.id })}
                        key={index}
                        showSQL={showSQL}
                        setAccess={this.setAccess}
                        id={source.id}
                    />
                )}
            </div>
       )
    }
}
