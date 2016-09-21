(ns metabase.api.permissions
  "/api/permissions endpoints."
  (:require [clojure.data :as data]
            [clojure.string :as str]
            [compojure.core :refer [GET POST PUT DELETE]]
            [medley.core :as m]
            [schema.core :as s]
            [metabase.api.common :refer :all]
            [metabase.db :as db]
            (metabase.models [database :as database]
                             [hydrate :refer [hydrate]]
                             [permissions :refer [Permissions], :as permissions]
                             [permissions-group :refer [PermissionsGroup], :as group]
                             [permissions-group-membership :refer [PermissionsGroupMembership]]
                             [table :refer [Table]])
            [metabase.util :as u]
            [metabase.util.honeysql-extensions :as hx]))


;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                                      UTIL FNS                                                                        |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+


(defn- object-path
  (^String [database-id]                      (str "/db/" database-id "/"))
  (^String [database-id schema-name]          (str (object-path database-id) "schema/" schema-name "/"))
  (^String [database-id schema-name table-id] (str (object-path database-id schema-name) "table/" table-id "/" )))

(defn- native-path      ^String [database-id] (str (object-path database-id) "native/"))
(defn- all-schemas-path ^String [database-id] (str (object-path database-id) "schema/"))


;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                                     GRAPH SCHEMA                                                                     |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+

(def ^:private TablePermissionsGraph
  (s/enum :none :all))

(def ^:private SchemaPermissionsGraph
  (s/cond-pre (s/enum :none :all)
              {s/Int TablePermissionsGraph}))

(def ^:private NativePermissionsGraph
  (s/enum :none :all))

(def ^:private DBPermissionsGraph
  {(s/optional-key :native)  NativePermissionsGraph
   (s/optional-key :schemas) (s/cond-pre (s/enum :none :all)
                                         {(s/maybe s/Str) SchemaPermissionsGraph})})

(def ^:private GroupPermissionsGraph
  {s/Int DBPermissionsGraph})

(def ^:private PermissionsGraph
  {s/Int GroupPermissionsGraph})


;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                                     GRAPH FETCH                                                                      |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+

(defn- is-permissions-for-object?
  "Does PERMISSIONS-PATH grant *full* access for PATH?"
  [path permissions-path]
  (str/starts-with? path permissions-path))

(defn- is-partial-permissions-for-object?
  "Does PERMISSIONS-PATH grant access for a descendant of PATH?"
  [path permissions-path]
  (str/starts-with? permissions-path path))

(defn- permissions-for-path [permissions-set path]
  (u/prog1 (cond
             (some (partial is-permissions-for-object? path) permissions-set)         :all
             (some (partial is-partial-permissions-for-object? path) permissions-set) :some
             :else                                                                    :none)))

(defn- table->db-object-path     [table] (object-path (:db_id table)))
(defn- table->native-path        [table] (native-path (:db_id table)))
(defn- table->all-schemas-path   [table] (all-schemas-path (:db_id table)))
(defn- table->schema-object-path [table] (object-path (:db_id table) (:schema table)))
(defn- table->table-object-path  [table] (object-path (:db_id table) (:schema table) (:id table)))

(defn- fetch-tables [] (db/select ['Table :schema :id :db_id]))

(s/defn ^:private schema-permissions-graph :- SchemaPermissionsGraph [permissions-set tables]
  (case (permissions-for-path permissions-set (table->schema-object-path (first tables)))
    :all  :all
    :none :none
    :some (into {} (for [table tables]
                     {(:id table) (permissions-for-path permissions-set (table->table-object-path table))}))))

(s/defn ^:private db-permissions-graph :- DBPermissionsGraph [permissions-set tables]
  {:native  (permissions-for-path permissions-set (table->native-path (first tables)))
   :schemas (case (permissions-for-path permissions-set (table->all-schemas-path (first tables)))
              :all  :all
              :none :none
              (m/map-vals (partial schema-permissions-graph permissions-set)
                          (group-by :schema tables)))})

(s/defn ^:private group-permissions-graph :- GroupPermissionsGraph [permissions-set tables]
  (m/map-vals (partial db-permissions-graph permissions-set)
              tables))

;; TODO - if a DB has no tables, then it won't show up in the permissions graph!
(s/defn ^:private ^:always-validate permissions-graph :- PermissionsGraph []
  (let [permissions (db/select [Permissions :group_id :object])
        tables      (group-by :db_id (fetch-tables))]
    (into {} (for [group-id (db/select-ids PermissionsGroup)]
               (let [group-permissions-set (set (for [perms permissions
                                                      :when (= (:group_id perms) group-id)]
                                                  (:object perms)))]
                 {group-id (group-permissions-graph group-permissions-set tables)})))))

(defendpoint GET "/graph"
  "Fetch a graph of all Permissions."
  []
  (check-superuser)
  (permissions-graph))


;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                                     GRAPH UPDATE                                                                     |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+

(defn- delete-related-permissions!
  "Delete are permissions that for ancestors or descendant objects."
  {:style/indent 2}
  [group-id path & other-conditions]
  (db/cascade-delete! Permissions
    {:where (apply list
                   :and
                   [:= :group_id group-id]
                   [:or
                    [:like path (hx/concat :object (hx/literal "%"))]
                    [:like :object (str path "%")]]
                   other-conditions)}))

(defn- revoke-native-permissions! [group-id database-id]
  (delete-related-permissions! group-id (native-path database-id)))

(defn- grant-native-permissions!
  [group-id database-id]
  (db/insert! Permissions
    :group_id group-id
    :object   (native-path database-id)))

(defn- revoke-db-permissions!
  "Remove all permissions entires for a DB and any child objects.
   This does *not* revoke native permissions; use `revoke-native-permssions!` to do that."
  [group-id database-id]
  (delete-related-permissions! group-id (object-path database-id)
    [:not= :object (native-path database-id)]))

(defn- grant-full-db-permissions!
  "Grant full permissions for all schemas belonging to this database.
   This does *not* grant native permissions; use `grant-native-permissions!` to do that."
  [group-id database-id]
  (db/insert! Permissions
    :group_id group-id
    :object   (all-schemas-path database-id)))

(defn- grant-permissions! [group-id & path-components]
  (db/insert! Permissions
    :group_id group-id
    :object   (apply object-path path-components)))

(defn- revoke-permissions! [group-id & path-components]
  (delete-related-permissions! group-id (apply object-path path-components)))


(s/defn ^:private ^:always-validate update-table-perms! [group-id :- s/Int, db-id :- s/Int, schema :- s/Str, table-id :- s/Int, new-table-perms :- SchemaPermissionsGraph]
  (case new-table-perms
    :all  (grant-permissions! group-id db-id schema table-id)
    :none (revoke-permissions! group-id db-id schema table-id)))

(s/defn ^:private ^:always-validate update-schema-perms! [group-id :- s/Int, db-id :- s/Int, schema :- s/Str, new-schema-perms :- SchemaPermissionsGraph]
  (cond
    (= new-schema-perms :all)  (grant-permissions! group-id db-id schema)
    (= new-schema-perms :none) (revoke-permissions! group-id db-id schema)
    (map? new-schema-perms)    (doseq [[table-id table-perms] new-schema-perms]
                                 (update-table-perms! group-id db-id schema table-id table-perms))))

(s/defn ^:private ^:always-validate update-native-permissions! [group-id :- s/Int, db-id :- s/Int, new-native-perms :- NativePermissionsGraph]
  {:pre [(integer? group-id) (integer? db-id) (contains? #{:all :none} new-native-perms)]}
  (case new-native-perms
    :all  (grant-native-permissions! group-id db-id)
    :none (revoke-native-permissions! group-id db-id)))


(s/defn ^:private ^:always-validate update-db-permissions! [group-id :- s/Int, db-id :- s/Int, new-db-perms :- DBPermissionsGraph]
  {:pre [(integer? group-id) (integer? db-id) (map? new-db-perms)]}
  (when-let [new-native-perms (:native new-db-perms)]
    (update-native-permissions! group-id db-id new-native-perms))
  (when-let [schemas (:schemas new-db-perms)]
    (cond
      (= schemas :all)  (grant-full-db-permissions! group-id db-id)
      (= schemas :none) (revoke-db-permissions! group-id db-id)
      (map? schemas)    (doseq [schema (keys schemas)]
                          (update-schema-perms! group-id db-id schema (get-in new-db-perms [:schemas schema]))))))

(defn- update-group-permissions! [group-id new-group-perms]
  {:pre [(integer? group-id) (map? new-group-perms)]}
  (doseq [db-id (keys new-group-perms)]
    (update-db-permissions! group-id db-id (get new-group-perms db-id))))

(s/defn ^:private ^:always-validate update-permissions-graph! [new-graph :- PermissionsGraph]
  (let [old-graph (permissions-graph)
        [old new] (data/diff old-graph new-graph)]
    ;; TODO - Need to save this graph diff somewhere for logging / audit purposes
    (doseq [group-id (keys new)]
      (update-group-permissions! group-id (get new group-id)))))


(defn- ->int [id] (Integer/parseInt (name id)))

(defn- de-JSONify-graph
  "Fix the types in the graph when it comes in from the API, e.g. converting things like `\"none\"` to `:none` and parsing object keys as integers."
  [graph]
  (into {} (for [[group-id dbs] graph]
             {(->int group-id) (into {} (for [[db-id {:keys [native schemas]}] dbs]
                                          {(->int db-id) {:native (keyword native)
                                                          :schemas (if (string? schemas)
                                                                     (keyword schemas)
                                                                     (into {} (for [[schema tables] schemas]
                                                                                {(name schema) (if (string? tables)
                                                                                                 (keyword tables)
                                                                                                 (into {} (for [[table-id perms] tables]
                                                                                                            {(->int table-id) (keyword perms)})))})))}}))})))


(defendpoint PUT "/graph"
  "Do a batch update of Permissions by passing in a modified graph."
  [:as {body :body}]
  {body [Required Dict]}
  (check-superuser)
  (update-permissions-graph! (de-JSONify-graph body))
  ;; return the updated graph
  (permissions-graph))


;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                             PERMISSIONS GROUP ENDPOINTS                                                              |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+

(defendpoint GET "/group"
  "Fetch all `PermissionsGroups`."
  []
  (check-superuser)
  (db/query {:select    [:pg.id :pg.name [:%count.pgm.id :members]]
             :from      [[:permissions_group :pg]]
             :left-join [[:permissions_group_membership :pgm]
                         [:= :pg.id :pgm.group_id]]
             :group-by  [:pg.id :pg.name]
             :order-by  [:%lower.pg.name]}))

(defendpoint POST "/group"
  "Create a new `PermissionsGroup`."
  [:as {{:keys [name]} :body}]
  {name [Required NonEmptyString]}
  (check-superuser)
  (db/insert! PermissionsGroup
    :name name))

(defendpoint PUT "/group/:group-id"
  "Update the name of a `PermissionsGroup`."
  [group-id :as {{:keys [name]} :body}]
  {name [Required NonEmptyString]}
  (check-superuser)
  (check-404 (db/exists? PermissionsGroup :id group-id))
  (db/update! PermissionsGroup group-id
    :name name)
  ;; return the updated group
  (PermissionsGroup group-id))

(defendpoint DELETE "/group/:group-id"
  "Delete a specific `PermissionsGroup`."
  [group-id]
  (check-superuser)
  (db/cascade-delete! PermissionsGroup :id group-id))


;;; ---------------------------------------- Group Membership Endpoints ----------------------------------------

(defendpoint POST "/membership"
  "Add a `User` to a `PermissionsGroup`. Returns updated list of members belonging to the group."
  [:as {{:keys [group_id user_id]} :body}]
  {group_id [Required Integer]
   user_id  [Required Integer]}
  (check-superuser)
  (db/insert! PermissionsGroupMembership
    :group_id group_id
    :user_id  user_id)
  ;; TODO - it's a bit silly to return the entire list of members for the group, just return the newly created one and let the frontend add it ass appropriate
  (group/members {:id group_id}))

(defendpoint DELETE "/membership/:id"
  "Remove a User from a PermissionsGroup (delete their membership)."
  [id]
  (check-superuser)
  (check-404 (db/exists? PermissionsGroupMembership :id id))
  (db/cascade-delete! PermissionsGroupMembership
    :id id))




;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+
;;; |                                                              DEPRECATED ENDPOINTS BELOW                                                              |
;;; +------------------------------------------------------------------------------------------------------------------------------------------------------+

(defn- ^:deprecated group-access-type-for-db [group-id database-id]
  (let [db      (object-path database-id)
        schemas (str db "schema/")]
    (cond
      (permissions/group-has-full-access?    group-id db)      :unrestricted
      (permissions/group-has-full-access?    group-id schemas) :all_schemas
      (permissions/group-has-partial-access? group-id schemas) :some_schemas
      :else                                                    :no_access)))

(defn- ^:deprecated group-access-type-for-schema [group-id database-id schema-name]
  (let [object (object-path database-id schema-name)]
    (cond
      (permissions/group-has-full-access?    group-id object) :all_tables
      (permissions/group-has-partial-access? group-id object) :some_tables)))


(defn- ^:deprecated group-permissions-for-db [group-id database-id]
  {:group_id    group-id
   :database_id database-id
   :name        (db/select-one-field :name 'Database :id database-id)
   :access_type (group-access-type-for-db group-id database-id)
   :schemas     (for [schema-name (database/schema-names {:id database-id})]
                  {:name        schema-name
                   :access_type (group-access-type-for-schema group-id database-id schema-name)})})

(defn- ^:deprecated group-permissions-for-schema [group-id database-id schema-name]
  {:group_id    group-id
   :database_id database-id
   :schema      schema-name
   :access_type (case (permissions/group-has-partial-access? group-id (object-path database-id schema-name))
                  :full    :unrestricted
                  :partial :some_tables
                  :no_access)
   :tables      (for [table (db/select ['Table :name [:id :table_id]]
                              :db_id database-id
                              :schema schema-name
                              {:order-by [:%lower.name]})]
                  (assoc table
                    :access_type (case (permissions/group-has-partial-access? group-id (object-path database-id schema-name (:table_id table)))
                                   :full    :unrestricted
                                   :partial :some_fields
                                   :no_access)))})

(defn- ^:deprecated group-permissions-for-all-dbs [group-id]
  (for [db-id (map :id (db/select ['Database :id] {:order-by [:%lower.name]}))]
    (group-permissions-for-db group-id db-id)))

(defendpoint GET "/group/:group-id"
  "Fetch details for a specific `PermissionsGroup`."
  [group-id]
  (check-superuser)
  (assoc (PermissionsGroup group-id)
    :members   (group/members {:id group-id})
    :databases (group-permissions-for-all-dbs group-id)))

;;; ---------------------------------------- Database (/api/permissions/database) endpoints ----------------------------------------

(defendpoint GET "/database/:database-id"
  "Fetch details about Permissions for a specific `Database`."
  [database-id]
  (check-superuser)
  (let [schema-names (database/schema-names {:id database-id})
        groups       (db/select PermissionsGroup
                       {:order-by [:%lower.name]})]
    {:id      database-id
     :schemas (for [schema-name schema-names]
                {:name   schema-name
                 :groups (for [group groups
                               :let  [access-type (group-access-type-for-schema (:id group) database-id schema-name)]
                               :when access-type]
                           (assoc group
                             :access (when (= access-type :all_tables)
                                       "All tables")))})}))


;;; ---------------------------------------- DatabasePermissions (/api/permissions/group/:id/database/:id) endpoints ----------------------------------------

(defendpoint GET "/group/:group-id/database/:database-id"
  "Get details about the permissions for a specific Group for a specific Database."
  [database-id group-id]
  (check-superuser)
  (group-permissions-for-db group-id database-id))

(defendpoint POST "/group/:group-id/database/:database-id"
  "Change permissions settings for a specific Group and specific Database."
  [database-id group-id :as {{:keys [access_type]} :body}]
  {access_type [Required NonEmptyString]}
  (check (contains? #{"unrestricted" "all_schemas" "some_schemas" "no_access"} access_type)
    400 "Invalid access type.")
  ;; remove any existing permissions
  (db/cascade-delete! Permissions :group_id group-id, :object [:like (str (object-path database-id) "%")])
  ;; now insert a new entry if appropriate
  (case access_type
    "unrestricted" (db/insert! Permissions :group_id group-id, :object (object-path database-id))
    "all_schemas"  (db/insert! Permissions :group_id group-id, :object (str (object-path database-id) "schema/"))
    ;; just insert an entry for the first schema for this DB
    "some_schemas" (let [first-schema-name (first (database/schema-names {:id 1}))]
                     (db/insert! Permissions :group_id group-id, :object (object-path database-id first-schema-name)))
    ;; nothing to create for no_access
    "no_access"    nil)
  (group-permissions-for-db group-id database-id))


;;; ---------------------------------------- SchemaPermissions (/api/permissions/group/:id/database/:id/schema/:schema) endpoints ----------------------------------------

(defendpoint GET "/group/:group-id/database/:database-id/schema/:schema-name"
  "Fetch schema permissions for a permissions group."
  [group-id database-id schema-name]
  {schema-name NonEmptyString}
  (check-superuser)
  (group-permissions-for-schema group-id database-id schema-name))


(defendpoint POST "/group/:group-id/database/:database-id/schema"
  "Create schema permissions for a Group."
  [database-id group-id :as {{:keys [schema]} :body}]
  {schema [Required NonEmptyString]}
  (check-superuser)
  (grant-permissions! group-id database-id schema))


(defendpoint DELETE "/group/:group-id/database/:database-id/schema/:schema-name"
  "Remove schema permissions for a group."
  [group-id database-id schema-name]
  {schema-name NonEmptyString}
  (revoke-permissions! group-id database-id schema-name))


(defendpoint PUT "/group/:group-id/database/:database-id/schema/:schema-name"
  "Change the permissions settings for a schema."
  [group-id database-id schema-name :as {{:keys [unrestricted_table_access]} :body}]
  {unrestricted_table_access [Required Boolean]}
  (check-superuser)
  ;; always remove all schema permissions
  (revoke-permissions! group-id database-id schema-name)
  ;; create a new unrestricted entry for the schema if appropriate
  (when unrestricted_table_access
    (grant-permissions! group-id database-id schema-name))
  (group-permissions-for-schema group-id database-id schema-name))

;;; ---------------------------------------- TablePermissions (/api/permissions/group/:id/table/:id) endpoints ----------------------------------------

(defendpoint POST "/group/:group-id/table/:table-id"
  "Create permissions for a Table."
  [group-id table-id]
  (check-superuser)
  (let-404 [{:keys [database-id schema]} (db/select-one [Table [:db_id :database-id] :schema], :id table-id)]
    (let [object (object-path database-id schema table-id)]
      ;; delete any existing entries for the table
      (db/cascade-delete! Permissions :group_id group-id, :object [:like (str object "%")])
      ;; now create a new entry with full access
      (db/insert! Permissions :group_id group-id, :object object))))

(defendpoint DELETE "/group/:group-id/table/:table-id"
  "Revoke `TablePermissions` for a Table."
  [group-id table-id]
  (check-superuser)
  (let-404 [{:keys [database-id schema]} (db/select-one [Table [:db_id :database-id] :schema], :id table-id)]
    (db/cascade-delete! Permissions :group_id group-id, :object [:like (str (object-path database-id schema table-id) "%")])))


(define-routes)
