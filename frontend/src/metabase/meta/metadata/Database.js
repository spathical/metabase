/* @flow */

import Base from "./Base";
import Table from "./Table";

import _ from "underscore";

export default class Database extends Base {
    static type = "databases";
    static schema = {
        tables: [Table]
    };

    table(id: number) {
        return this._entity(Table, id);
    }

    tables() {
        return this._entities(Table, this._object.tables);
    }

    tablesInSchema(schemaName: ?string) {
        return this._entities(Table, this._object.tables).filter(table => table.schema === schemaName);
    }

    schemaNames() {
        return _.uniq(this.tables().map(table => table.schema).filter(schemaName => schemaName != null));
    }
}
