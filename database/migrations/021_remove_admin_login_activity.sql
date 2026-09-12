-- admin_login przestał być logowany (patrz AdminService.php) - usuwamy też
-- już zapisane wpisy tego typu, żeby dziennik aktywności nie zaśmiecał się
-- historycznymi zdarzeniami, których kod już nie tworzy.

DELETE FROM activity_log WHERE event_type = 'admin_login';
