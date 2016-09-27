(ns metabase.models.card
  (:require [medley.core :as m]
            [metabase.api.common :refer [*current-user-id* *current-user-permissions-set*]]
            [metabase.db :as db]
            (metabase.models [card-label :refer [CardLabel]]
                             [dependency :as dependency]
                             [interface :as i]
                             [label :refer [Label]]
                             [permissions :as perms]
                             [revision :as revision]
                             [user :as user])
            [metabase.query :as q]
            [metabase.query-processor.expand :as expand]
            [metabase.query-processor.permissions :as qp-perms]
            [metabase.query-processor.resolve :as resolve]
            [metabase.util :as u]))


(i/defentity Card :report_card)


;;; ------------------------------------------------------------ Hydration ------------------------------------------------------------

(defn dashboard-count
  "Return the number of Dashboards this Card is in."
  {:hydrate :dashboard_count}
  [{:keys [id]}]
  (db/select-one-count 'DashboardCard, :card_id id))

(defn labels
  "Return `Labels` for CARD."
  {:hydrate :labels}
  [{:keys [id]}]
  (if-let [label-ids (seq (db/select-field :label_id CardLabel, :card_id id))]
    (db/select Label, :id [:in label-ids], {:order-by [:%lower.name]})
    []))

;;; ------------------------------------------------------------ Permissions Checking ------------------------------------------------------------

(defn- permissions-path-set:mbql [{database-id :database, :as query}]
  (let [{{:keys [source-table join-tables]} :query} (resolve/resolve (expand/expand query))]
    (set (for [table (cons source-table join-tables)]
           (perms/object-path database-id (:schema table) (:id table))))))

(defn- permissions-path-set:native [read-or-write {database-id :database}]
  #{((case read-or-write
       :read  perms/native-read-path
       :write perms/native-readwrite-path) database-id)})

(defn- permissions-paths-set
  "Return a set of required permissions object paths for CARD.
   Optionally specify whether you want `:read` or `:write` permissions; default is `:read`.
   (`:write` permissions only affects native queries)."
  ([card]
   (permissions-paths-set :read card))
  ([read-or-write {{query-type :type, :as query} :dataset_query}]
   (cond
     (= query {})                     #{}
     (= (keyword query-type) :native) (permissions-path-set:native read-or-write query)
     (= (keyword query-type) :query)  (permissions-path-set:mbql query)
     :else                            (throw (Exception. (str "Invalid query type: " query-type))))))


(defn has-permissions?
  "Does PERMISSIONS-SET grant access to all the objects referenced by CARD?
   Optionally specify whether you want `:read` or `:write` permissions; default is `:read`."
  ^Boolean
  ([permissions-set card]
   (has-permissions? :read permissions-set card))
  ([read-or-write permissions-set card]
   ;; we know that someone with root permissions can always access everything so skip the more complicated checking logic in that case
   ;; TODO - it seems like we could also optimize a bit and check if full permissions for the Card's DB were present so we didn't have to expand/resolve in that case
   (or (contains? permissions-set "/")
       (perms/set-has-full-permissions-for-set? permissions-set (permissions-paths-set read-or-write card)))))

(defn current-user-has-permissions?
  "Does the current user have READ-OR-WRITE permissions for CARD?"
  (^Boolean [read-or-write _ card-id]
   ;; as above optimize away the check if we have root permissions
   (or (contains? @*current-user-permissions-set* "/")
       (current-user-has-permissions? read-or-write (Card card-id))))
  (^Boolean [read-or-write card]
   (has-permissions? read-or-write @*current-user-permissions-set* card)))


;;; ------------------------------------------------------------ Dependencies ------------------------------------------------------------

(defn card-dependencies
  "Calculate any dependent objects for a given `Card`."
  [this id {:keys [dataset_query]}]
  (when (and dataset_query
             (= :query (keyword (:type dataset_query))))
    {:Metric  (q/extract-metric-ids (:query dataset_query))
     :Segment (q/extract-segment-ids (:query dataset_query))}))


;;; ------------------------------------------------------------ Revisions ------------------------------------------------------------

(defn serialize-instance
  "Serialize a `Card` for use in a `Revision`."
  [_ _ instance]
  (->> (dissoc instance :created_at :updated_at)
       (into {})                                 ; if it's a record type like CardInstance we need to convert it to a regular map or filter-vals won't work
       (m/filter-vals (complement delay?))))



;;; ------------------------------------------------------------ Lifecycle ------------------------------------------------------------


(defn- populate-query-fields [card]
  (let [{query :query, database-id :database, query-type :type} (:dataset_query card)
        table-id (or (:source_table query) ; legacy (MBQL '95)
                     (:source-table query))
        defaults {:database_id database-id
                  :table_id    table-id
                  :query_type  (keyword query-type)}]
    (if query-type
      (merge defaults card)
      card)))


(defn- pre-insert [{:keys [dataset_query], :as card}]
  (u/prog1 card
    ;; for native queries we need to make sure the user saving the card has native query permissions for the DB
    ;; because users can always see native Cards and we don't want someone getting around their lack of permissions that way
    (when (and *current-user-id*
               (= (keyword (:type dataset_query)) :native))
      (let [database (db/select-one ['Database :id :name], :id (:database dataset_query))]
        (qp-perms/throw-exception-if-user-cannot-run-native-query-referencing-db *current-user-id* database)))))

(defn- pre-cascade-delete [{:keys [id]}]
  (db/cascade-delete! 'PulseCard :card_id id)
  (db/cascade-delete! 'Revision :model "Card", :model_id id)
  (db/cascade-delete! 'DashboardCardSeries :card_id id)
  (db/cascade-delete! 'DashboardCard :card_id id)
  (db/cascade-delete! 'CardFavorite :card_id id)
  (db/cascade-delete! 'CardLabel :card_id id))


(u/strict-extend (class Card)
  i/IEntity
  (merge i/IEntityDefaults
         {:hydration-keys     (constantly [:card])
          :types              (constantly {:display :keyword, :query_type :keyword, :dataset_query :json, :visualization_settings :json, :description :clob})
          :timestamped?       (constantly true)
          :can-read?          (partial current-user-has-permissions? :read)
          :can-write?         (partial current-user-has-permissions? :write)
          :pre-update         populate-query-fields
          :pre-insert         (comp populate-query-fields pre-insert)
          :pre-cascade-delete pre-cascade-delete})

  revision/IRevisioned
  (assoc revision/IRevisionedDefaults
    :serialize-instance serialize-instance)

  dependency/IDependent
  {:dependencies card-dependencies})
