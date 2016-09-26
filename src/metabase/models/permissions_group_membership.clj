(ns metabase.models.permissions-group-membership
  (:require [metabase.db :as db]
            (metabase.models [interface :as i]
                             [permissions-group :as group])
            [metabase.util :as u]))

(i/defentity PermissionsGroupMembership :permissions_group_membership)

(defn- check-not-default-or-metabot-group
  "Throw an Exception if we're trying to add or remove a user to the MetaBot or Default groups."
  [group-id]
  (doseq [magic-group [(group/metabot)
                       (group/default)]]
    (when (= group-id (:id magic-group))
      (throw (ex-info (format "You cannot add or remove users to/from the '%s' group." (:name magic-group))
               {:status-code 400})))))

(defn- check-not-last-admin []
  (when (<= (db/select-one-count PermissionsGroupMembership
              :group_id (:id (group/admin)))
            1)
    (throw (ex-info "You cannot remove the last member of the 'Admin' group!"
             {:status-code 400}))))

(defn- pre-cascade-delete [{:keys [group_id user_id]}]
  (check-not-default-or-metabot-group group_id)
  ;; Otherwise if this is the Admin group...
  (when (= group_id (:id (group/admin)))
    ;; ...and this is the last membership throw an exception
    (check-not-last-admin)
    ;; ...otherwise we're ok. Unset the `:is_superuser` flag for the user whose membership was revoked
    (db/update! 'User user_id
      :is_superuser false)))

(defn- pre-insert [{:keys [group_id], :as membership}]
  (u/prog1 membership
    (check-not-default-or-metabot-group group_id)))

(defn- post-insert [{:keys [group_id user_id], :as membership}]
  (u/prog1 membership
    ;; If we're adding a user to the admin group, set athe `:is_superuser` flag for the user to whom membership was granted
    (when (= group_id (:id (group/admin)))
      (db/update! 'User user_id
        :is_superuser true))))

(u/strict-extend (class PermissionsGroupMembership)
  i/IEntity
  (merge i/IEntityDefaults
         {:pre-cascade-delete pre-cascade-delete
          :pre-insert         pre-insert
          :post-insert        post-insert}))
