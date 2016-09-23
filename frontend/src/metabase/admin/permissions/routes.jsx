import React, { Component, PropTypes } from "react";
import { Route, IndexRedirect } from 'react-router';

import PermissionsGridApp from "./containers/PermissionsGridApp.jsx";

import { initialize } from "./permissions";

const getRoutes = (store) =>
    <Route path="permissions" onEnter={() => store.dispatch(initialize())}>
        <IndexRedirect to="databases" />
        <Route path="databases" component={PermissionsGridApp} />
        <Route path="databases/:databaseId/schemas" component={PermissionsGridApp} />
        <Route path="databases/:databaseId/schemas/:schemaName/tables" component={PermissionsGridApp} />

        {/* NOTE: this route is to support null schemas, inject the empty string as the schemaName */}
        <Route path="databases/:databaseId/tables" component={(props) => // eslint-disable-line react/display-name
            <PermissionsGridApp {...props} params={{ ...props.params, schemaName: "" }} />
        }/>
    </Route>

export default getRoutes;
