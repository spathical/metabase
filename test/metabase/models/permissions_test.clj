(ns metabase.models.permissions-test
  (:require [expectations :refer :all]
            [metabase.models.permissions :as perms]))


;;; ------------------------------------------------------------ TODO - valid-object-path? ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - object-path ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - native-readwrite-path ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - native-read-path ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - all-schemas-path ------------------------------------------------------------

;;; ------------------------------------------------------------ is-permissions-for-object? ------------------------------------------------------------

(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/"))
(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/"))
(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/"))
(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/"))
(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/PUBLIC/"))
(expect (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/PUBLIC/table/1/"))

(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/2/"))
(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/2/native/"))
(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/2/native/read/"))
(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/public/")) ; different case
(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/private/"))
(expect false (perms/is-permissions-for-object? "/db/1/schema/PUBLIC/table/1/" "/db/1/schema/PUBLIC/table/2/"))


;;; ------------------------------------------------------------ TODO - is-partial-permissions-for-object? ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - is-permissions-set ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - set-has-full-permissions? ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - set-has-partial-permissions? ------------------------------------------------------------

;;; ------------------------------------------------------------ TODO - set-has-full-permissions-for-set? ------------------------------------------------------------


;;; ------------------------------------------------------------ TODO - permissions-graph stuff ------------------------------------------------------------
