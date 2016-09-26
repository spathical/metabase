import React, { Component, PropTypes } from "react";
import { Route, IndexRedirect } from 'react-router';

import DatabasesPermissionsApp from "./containers/DatabasesPermissionsApp.jsx";
import SchemasPermissionsApp from "./containers/SchemasPermissionsApp.jsx";
import TablesPermissionsApp from "./containers/TablesPermissionsApp.jsx";

import { initialize } from "./permissions";

const getRoutes = (store) =>
    <Route path="permissions" onEnter={() => store.dispatch(initialize())}>
        <IndexRedirect to="databases" />
        <Route path="databases" component={DatabasesPermissionsApp} />
        <Route path="databases/:databaseId/schemas" component={SchemasPermissionsApp} />
        <Route path="databases/:databaseId/schemas/:schemaName/tables" component={TablesPermissionsApp} />

        {/* NOTE: this route is to support null schemas, inject the empty string as the schemaName */}
        <Route path="databases/:databaseId/tables" component={(props) => // eslint-disable-line react/display-name
            <TablesPermissionsApp {...props} params={{ ...props.params, schemaName: "" }} />
        }/>
    </Route>

export default getRoutes;
