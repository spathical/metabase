(ns metabase.models.permissions-revision
  (:require [metabase.models.interface :as i]
            [metabase.util :as u]))

(i/defentity PermissionsRevision :permissions_revision)

(u/strict-extend (class PermissionsRevision)
  i/IEntity
  (merge i/IEntityDefaults
         {:types      (constantly {:before :json
                                   :after  :json
                                   :remark :clob})
          :pre-update (fn [& _] (throw (Exception. "You cannot update a PermissionsRevision!")))}))
