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
    </Route>

export default getRoutes;
